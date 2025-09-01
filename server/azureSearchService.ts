import { SearchClient, SearchIndexClient, AzureKeyCredential } from "@azure/search-documents";

// Azure Search configuration
const AZURE_SEARCH_ENDPOINT = process.env.AZURE_SEARCH_ENDPOINT;
const AZURE_SEARCH_KEY = process.env.AZURE_SEARCH_KEY;
const SEARCH_INDEX_NAME = "documents-index";

export interface SearchDocument {
  id: string;
  fileName: string;
  content: string;
  documentType: string;
  caseId?: string;
  uploadDate: string;
  extractedData?: any;
  summary?: string;
  tags?: string[];
  contentVector?: number[];
  summaryVector?: number[];
}

export class AzureSearchService {
  private searchClient: SearchClient<SearchDocument> | null = null;
  private indexClient: SearchIndexClient | null = null;

  constructor() {
    try {
      if (!AZURE_SEARCH_ENDPOINT || !AZURE_SEARCH_KEY) {
        throw new Error(
          "Azure Search configuration missing. Set both AZURE_SEARCH_ENDPOINT " +
          "and AZURE_SEARCH_KEY environment variables."
        );
      }

      const credential = new AzureKeyCredential(AZURE_SEARCH_KEY);
      this.searchClient = new SearchClient<SearchDocument>(
        AZURE_SEARCH_ENDPOINT,
        SEARCH_INDEX_NAME,
        credential
      );
      this.indexClient = new SearchIndexClient(AZURE_SEARCH_ENDPOINT, credential);
    } catch (error: any) {
      console.warn("Azure Search not configured:", error.message);
      this.searchClient = null;
      this.indexClient = null;
    }
  }

  // Check if Search service is available
  isAvailable(): boolean {
    return this.searchClient !== null && this.indexClient !== null;
  }

  // Initialize search index
  async initializeIndex(): Promise<void> {
    if (!this.indexClient) {
      throw new Error("Search service is not available");
    }

    try {
      console.log("🔍 Initializing Azure Search index...");
      
      // Check if index exists
      try {
        await this.indexClient.getIndex(SEARCH_INDEX_NAME);
        console.log("✅ Search index already exists");
        return;
      } catch (error) {
        // Index doesn't exist, create it
        console.log("📝 Creating search index...");
      }

      // Define the search index schema
      const indexDefinition = {
        name: SEARCH_INDEX_NAME,
        fields: [
          {
            name: "id",
            type: "Edm.String" as const,
            key: true,
            searchable: false,
            filterable: true,
            sortable: false
          },
          {
            name: "fileName",
            type: "Edm.String" as const,
            searchable: true,
            filterable: true,
            sortable: true
          },
          {
            name: "content",
            type: "Edm.String" as const,
            searchable: true,
            filterable: false,
            sortable: false,
            analyzerName: "standard.lucene"
          },
          {
            name: "documentType",
            type: "Edm.String" as const,
            searchable: false,
            filterable: true,
            sortable: true
          },
          {
            name: "caseId",
            type: "Edm.String" as const,
            searchable: false,
            filterable: true,
            sortable: false
          },
          {
            name: "uploadDate",
            type: "Edm.DateTimeOffset" as const,
            searchable: false,
            filterable: true,
            sortable: true
          },
          {
            name: "summary",
            type: "Edm.String" as const,
            searchable: true,
            filterable: false,
            sortable: false
          },
          {
            name: "tags",
            type: "Collection(Edm.String)" as const,
            searchable: true,
            filterable: true,
            sortable: false
          },
          {
            name: "contentVector",
            type: "Collection(Edm.Single)" as const,
            searchable: true,
            filterable: false,
            sortable: false,
            dimensions: 1536,
            vectorSearchProfile: "content-vector-profile"
          },
          {
            name: "summaryVector", 
            type: "Collection(Edm.Single)" as const,
            searchable: true,
            filterable: false,
            sortable: false,
            dimensions: 1536,
            vectorSearchProfile: "summary-vector-profile"
          }
        ],
        vectorSearch: {
          algorithms: [
            {
              name: "hnsw-algorithm",
              kind: "hnsw",
              hnswParameters: {
                metric: "cosine",
                m: 4,
                efConstruction: 400,
                efSearch: 500
              }
            }
          ],
          profiles: [
            {
              name: "content-vector-profile",
              algorithmConfigurationName: "hnsw-algorithm"
            },
            {
              name: "summary-vector-profile", 
              algorithmConfigurationName: "hnsw-algorithm"
            }
          ]
        },
        scoringProfiles: [
          {
            name: "boost-filename",
            text: {
              weights: {
                fileName: 2,
                summary: 1.5,
                content: 1,
                tags: 1.2
              }
            }
          }
        ],
        defaultScoringProfile: "boost-filename"
      };

      await this.indexClient.createIndex(indexDefinition);
      console.log("✅ Search index created successfully");
    } catch (error) {
      console.error("Failed to initialize search index:", error);
      throw error;
    }
  }

  // Index a document for search
  async indexDocument(document: SearchDocument): Promise<void> {
    if (!this.searchClient) {
      throw new Error("Search service is not available");
    }

    try {
      console.log(`🔍 Indexing document: ${document.fileName}`);
      
      const indexResult = await this.searchClient.uploadDocuments([document]);
      
      if (indexResult.results[0].succeeded) {
        console.log(`✅ Document indexed successfully: ${document.fileName}`);
      } else {
        throw new Error(`Failed to index document: ${indexResult.results[0].errorMessage}`);
      }
    } catch (error) {
      console.error("Failed to index document:", error);
      throw error;
    }
  }

  // Vector search documents
  async vectorSearchDocuments(
    queryVector: number[],
    options: {
      caseId?: string;
      documentType?: string;
      top?: number;
      vectorFields?: string[];
    } = {}
  ): Promise<{
    results: Array<SearchDocument & { score: number }>;
    count: number;
  }> {
    if (!this.searchClient) {
      throw new Error("Search service is not available");
    }

    try {
      console.log(`🔍 Performing vector search...`);
      
      let filter = "";
      const filters: string[] = [];
      
      if (options.caseId) {
        filters.push(`caseId eq '${options.caseId}'`);
      }
      
      if (options.documentType) {
        filters.push(`documentType eq '${options.documentType}'`);
      }
      
      if (filters.length > 0) {
        filter = filters.join(" and ");
      }

      const vectorFields = options.vectorFields || ["contentVector"];
      const vectorQueries = vectorFields.map(field => ({
        vector: queryVector,
        fields: [field],
        k: options.top || 50
      }));

      const searchOptions = {
        vectors: vectorQueries,
        filter: filter || undefined,
        top: options.top || 50,
        select: ["id", "fileName", "content", "summary", "documentType", "caseId", "uploadDate", "tags"] as (keyof SearchDocument)[]
      };

      const searchResults = await this.searchClient.search("*", searchOptions);
      
      const results: Array<SearchDocument & { score: number }> = [];
      
      for await (const result of searchResults.results) {
        results.push({
          ...result.document,
          score: result.score || 0
        });
      }

      console.log(`✅ Vector search found ${results.length} documents`);
      
      return {
        results,
        count: results.length
      };
    } catch (error) {
      console.error("Vector search failed:", error);
      throw error;
    }
  }

  // Hybrid search (combines text and vector search)
  async hybridSearchDocuments(
    query: string,
    queryVector?: number[],
    options: {
      caseId?: string;
      documentType?: string;
      top?: number;
      skip?: number;
    } = {}
  ): Promise<{
    results: Array<SearchDocument & { score: number }>;
    count: number;
  }> {
    if (!this.searchClient) {
      throw new Error("Search service is not available");
    }

    try {
      console.log(`🔍 Performing hybrid search for query: "${query}"`);
      
      let filter = "";
      const filters: string[] = [];
      
      if (options.caseId) {
        filters.push(`caseId eq '${options.caseId}'`);
      }
      
      if (options.documentType) {
        filters.push(`documentType eq '${options.documentType}'`);
      }
      
      if (filters.length > 0) {
        filter = filters.join(" and ");
      }

      const searchOptions: any = {
        top: options.top || 50,
        skip: options.skip || 0,
        filter: filter || undefined,
        highlightFields: "content,summary",
        searchFields: ["fileName", "content", "summary", "tags"] as (keyof SearchDocument)[],
        select: ["id", "fileName", "content", "summary", "documentType", "caseId", "uploadDate", "tags"] as (keyof SearchDocument)[]
      };

      // Add vector search if embedding provided
      if (queryVector && queryVector.length > 0) {
        searchOptions.vectors = [{
          vector: queryVector,
          fields: ["contentVector", "summaryVector"],
          k: options.top || 50
        }];
      }

      const searchResults = await this.searchClient.search(query, searchOptions);
      
      const results: Array<SearchDocument & { score: number }> = [];
      
      for await (const result of searchResults.results) {
        results.push({
          ...result.document,
          score: result.score || 0
        });
      }

      console.log(`✅ Hybrid search found ${results.length} documents`);
      
      return {
        results,
        count: searchResults.count || results.length
      };
    } catch (error) {
      console.error("Hybrid search failed:", error);
      throw error;
    }
  }

  // Traditional text search (existing method)
  async searchDocuments(
    query: string,
    options: {
      caseId?: string;
      documentType?: string;
      top?: number;
      skip?: number;
    } = {}
  ): Promise<{
    results: Array<SearchDocument & { score: number }>;
    count: number;
  }> {
    if (!this.searchClient) {
      throw new Error("Search service is not available");
    }

    try {
      console.log(`🔍 Searching documents for query: "${query}"`);
      
      let filter = "";
      const filters: string[] = [];
      
      if (options.caseId) {
        filters.push(`caseId eq '${options.caseId}'`);
      }
      
      if (options.documentType) {
        filters.push(`documentType eq '${options.documentType}'`);
      }
      
      if (filters.length > 0) {
        filter = filters.join(" and ");
      }

      const searchOptions = {
        top: options.top || 50,
        skip: options.skip || 0,
        filter: filter || undefined,
        includeTotalCount: true,
        scoringProfile: "boost-filename",
        highlightFields: "content,summary",
        searchFields: ["fileName", "content", "summary", "tags"] as (keyof SearchDocument)[]
      };

      const searchResults = await this.searchClient.search(query, searchOptions);
      
      const results: Array<SearchDocument & { score: number }> = [];
      
      for await (const result of searchResults.results) {
        results.push({
          ...result.document,
          score: result.score || 0
        });
      }

      console.log(`✅ Found ${results.length} documents`);
      
      return {
        results,
        count: searchResults.count || results.length
      };
    } catch (error) {
      console.error("Search failed:", error);
      throw error;
    }
  }

  // Get suggestions for autocomplete
  async getSuggestions(query: string, top: number = 5): Promise<string[]> {
    if (!this.searchClient) {
      return [];
    }

    try {
      // Use search to get suggestions based on existing content
      const searchResults = await this.searchClient.search(query, {
        top,
        select: ["fileName", "summary"] as (keyof SearchDocument)[],
        searchFields: ["fileName", "content", "summary"] as (keyof SearchDocument)[]
      });

      const suggestions: string[] = [];
      for await (const result of searchResults.results) {
        if (result.document.fileName) {
          suggestions.push(result.document.fileName);
        }
      }

      return Array.from(new Set(suggestions)); // Remove duplicates
    } catch (error) {
      console.error("Failed to get suggestions:", error);
      return [];
    }
  }

  // Delete document from index
  async deleteDocument(documentId: string): Promise<void> {
    if (!this.searchClient) {
      throw new Error("Search service is not available");
    }

    try {
      console.log(`🗑️ Deleting document from index: ${documentId}`);
      
      const deleteResult = await this.searchClient.deleteDocuments([{ id: documentId } as SearchDocument]);
      
      if (deleteResult.results[0].succeeded) {
        console.log(`✅ Document deleted from index: ${documentId}`);
      } else {
        throw new Error(`Failed to delete document: ${deleteResult.results[0].errorMessage}`);
      }
    } catch (error) {
      console.error("Failed to delete document from index:", error);
      throw error;
    }
  }

  // Update document in index
  async updateDocument(document: Partial<SearchDocument> & { id: string }): Promise<void> {
    if (!this.searchClient) {
      throw new Error("Search service is not available");
    }

    try {
      console.log(`🔄 Updating document in index: ${document.id}`);
      
      const updateResult = await this.searchClient.mergeOrUploadDocuments([document as SearchDocument]);
      
      if (updateResult.results[0].succeeded) {
        console.log(`✅ Document updated in index: ${document.id}`);
      } else {
        throw new Error(`Failed to update document: ${updateResult.results[0].errorMessage}`);
      }
    } catch (error) {
      console.error("Failed to update document in index:", error);
      throw error;
    }
  }
}

export const azureSearchService = new AzureSearchService();