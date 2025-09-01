import { OpenAI } from "openai";

// Azure OpenAI Embeddings configuration
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY;
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";
// For embeddings, we need a separate deployment or fall back to OpenAI
const EMBEDDINGS_MODEL = process.env.AZURE_OPENAI_EMBEDDINGS_MODEL || "text-embedding-ada-002";

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export class AzureOpenAIEmbeddingsService {
  private client: OpenAI | null = null;
  private embeddingsModel: string;

  constructor() {
    this.embeddingsModel = EMBEDDINGS_MODEL;
    
    try {
      // Check if we have Azure embeddings deployment configured
      if (AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_KEY && process.env.AZURE_OPENAI_EMBEDDINGS_MODEL) {
        this.client = new OpenAI({
          apiKey: AZURE_OPENAI_KEY,
          baseURL: `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${EMBEDDINGS_MODEL}`,
          defaultQuery: { 'api-version': AZURE_OPENAI_API_VERSION },
          defaultHeaders: {
            'api-key': AZURE_OPENAI_KEY,
          }
        });
        console.log("✅ Using Azure OpenAI for embeddings");
      } else if (process.env.OPENAI_API_KEY) {
        // Fallback to regular OpenAI for embeddings
        this.client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        this.embeddingsModel = "text-embedding-ada-002";
        console.log("✅ Using OpenAI for embeddings (Azure embeddings not configured)");
      } else {
        throw new Error("Neither Azure OpenAI embeddings nor OpenAI configured for embeddings");
      }
    } catch (error: any) {
      console.warn("Embeddings service not configured:", error.message);
      this.client = null;
    }
  }

  // Check if service is available
  isAvailable(): boolean {
    return this.client !== null;
  }

  // Generate embeddings for text
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.client) {
      throw new Error("Embeddings service is not available");
    }

    if (!text || text.trim().length === 0) {
      throw new Error("Text input is required for embeddings");
    }

    try {
      console.log(`🔢 Generating embeddings for text (${text.length} chars)...`);
      
      const response = await this.client.embeddings.create({
        model: this.embeddingsModel,
        input: text,
        encoding_format: "float"
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("No embeddings returned from API");
      }

      const embedding = response.data[0].embedding;
      
      console.log(`✅ Generated ${embedding.length}-dimensional embedding`);
      
      return {
        embedding,
        model: this.embeddingsModel,
        dimensions: embedding.length,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      console.error("Failed to generate embeddings:", error);
      throw new Error(`Embeddings generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate embeddings for multiple texts (batch processing)
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.client) {
      throw new Error("Embeddings service is not available");
    }

    if (!texts || texts.length === 0) {
      throw new Error("Text inputs are required for batch embeddings");
    }

    // Filter out empty texts
    const validTexts = texts.filter(text => text && text.trim().length > 0);
    if (validTexts.length === 0) {
      throw new Error("No valid text inputs provided");
    }

    try {
      console.log(`🔢 Generating embeddings for ${validTexts.length} texts...`);
      
      const response = await this.client.embeddings.create({
        model: this.embeddingsModel,
        input: validTexts,
        encoding_format: "float"
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("No embeddings returned from API");
      }

      const results: EmbeddingResult[] = response.data.map((item, index) => ({
        embedding: item.embedding,
        model: this.embeddingsModel,
        dimensions: item.embedding.length,
        usage: {
          promptTokens: Math.ceil((response.usage?.prompt_tokens || 0) / validTexts.length),
          totalTokens: Math.ceil((response.usage?.total_tokens || 0) / validTexts.length)
        }
      }));

      console.log(`✅ Generated embeddings for ${results.length} texts`);
      
      return results;
    } catch (error) {
      console.error("Failed to generate batch embeddings:", error);
      throw new Error(`Batch embeddings generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Calculate cosine similarity between two embeddings
  calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error("Embeddings must have the same dimensions");
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  // Find similar embeddings from a collection
  findSimilarEmbeddings(
    queryEmbedding: number[], 
    candidateEmbeddings: Array<{ id: string; embedding: number[]; metadata?: any }>,
    threshold: number = 0.7,
    limit: number = 10
  ): Array<{ id: string; similarity: number; metadata?: any }> {
    const similarities = candidateEmbeddings.map(candidate => ({
      id: candidate.id,
      similarity: this.calculateCosineSimilarity(queryEmbedding, candidate.embedding),
      metadata: candidate.metadata
    }));

    return similarities
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Chunk text for embedding (handles long texts)
  chunkTextForEmbedding(text: string, maxTokens: number = 8000): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Rough estimation: 1 token ≈ 4 characters for English text
    const approximateTokensPerChar = 0.25;
    const maxChars = Math.floor(maxTokens / approximateTokensPerChar);

    if (text.length <= maxChars) {
      return [text];
    }

    const chunks: string[] = [];
    let currentPosition = 0;

    while (currentPosition < text.length) {
      let endPosition = Math.min(currentPosition + maxChars, text.length);
      
      // Try to break at sentence boundaries if possible
      if (endPosition < text.length) {
        const sentenceBreak = text.lastIndexOf('.', endPosition);
        const paragraphBreak = text.lastIndexOf('\n\n', endPosition);
        
        if (sentenceBreak > currentPosition + (maxChars * 0.5)) {
          endPosition = sentenceBreak + 1;
        } else if (paragraphBreak > currentPosition + (maxChars * 0.5)) {
          endPosition = paragraphBreak + 2;
        }
      }

      const chunk = text.substring(currentPosition, endPosition).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      currentPosition = endPosition;
    }

    console.log(`📝 Split text into ${chunks.length} chunks for embedding`);
    return chunks;
  }
}

export const azureOpenAIEmbeddingsService = new AzureOpenAIEmbeddingsService();