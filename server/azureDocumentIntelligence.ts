import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";
import { azureBlobService, CONTAINERS } from "./azureBlobStorage";

// Azure Document Intelligence configuration
const AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
const AZURE_DOCUMENT_INTELLIGENCE_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

export function createDocumentAnalysisClient(): DocumentAnalysisClient {
  if (!AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || !AZURE_DOCUMENT_INTELLIGENCE_KEY) {
    throw new Error(
      "Azure Document Intelligence configuration missing. Set both AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT " +
      "and AZURE_DOCUMENT_INTELLIGENCE_KEY environment variables."
    );
  }
  
  return new DocumentAnalysisClient(
    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
    new AzureKeyCredential(AZURE_DOCUMENT_INTELLIGENCE_KEY)
  );
}

export class DocumentIntelligenceService {
  private client: DocumentAnalysisClient | null = null;

  constructor() {
    try {
      this.client = createDocumentAnalysisClient();
    } catch (error: any) {
      console.warn("Document Intelligence not configured:", error.message);
      this.client = null;
    }
  }

  // Check if Document Intelligence is available
  isAvailable(): boolean {
    return this.client !== null;
  }

  // Generate SAS token for blob access by Document Intelligence
  private async generateBlobSasUrl(containerName: string, blobName: string): Promise<string> {
    try {
      // Use the Azure Blob Service to generate a proper SAS URL
      const sasUrl = azureBlobService.generateBlobSasUrl(containerName, blobName, 2);
      console.log(`🔗 Generated SAS URL for Document Intelligence: ${blobName}`);
      return sasUrl;
    } catch (error) {
      console.error("Error generating SAS URL:", error);
      throw error;
    }
  }

  // Extract text and analyze document using Document Intelligence
  async analyzeDocument(containerName: string, blobName: string): Promise<{
    text: string;
    documentType: string;
    confidence: number;
    pages: number;
    tables: any[];
    keyValuePairs: any[];
    fullResult: any; // Store complete Document Intelligence JSON
  }> {
    if (!this.client) {
      throw new Error("Document Intelligence service is not available");
    }

    try {
      console.log(`🤖 Analyzing document with Azure Document Intelligence: ${blobName}`);
      
      // Since blob is now publicly accessible, use direct blob URL
      const blobClient = azureBlobService.getBlobClient(containerName, blobName);
      const blobUrl = blobClient.url;
      console.log(`🔗 Using public blob URL: ${blobUrl}`);
      
      // Use the general document analysis model
      console.log('⏳ Starting Document Intelligence analysis...');
      const poller = await this.client.beginAnalyzeDocumentFromUrl(
        "prebuilt-document", // General document analysis model
        blobUrl
      );
      
      console.log('🔄 Polling Document Intelligence for results...');
      const result = await poller.pollUntilDone();
      
      if (!result.content) {
        throw new Error("No content extracted from document");
      }

      // Extract tables
      const tables = result.tables?.map(table => ({
        rowCount: table.rowCount,
        columnCount: table.columnCount,
        cells: table.cells.map(cell => ({
          text: cell.content,
          rowIndex: cell.rowIndex,
          columnIndex: cell.columnIndex
        }))
      })) || [];

      // Extract key-value pairs
      const keyValuePairs = result.keyValuePairs?.map(kvp => ({
        key: kvp.key?.content || '',
        value: kvp.value?.content || '',
        confidence: kvp.confidence || 0
      })) || [];

      console.log(`✅ Document Intelligence extracted ${result.content.length} characters`);
      console.log(`📊 Found ${tables.length} tables, ${keyValuePairs.length} key-value pairs`);
      console.log(`📄 Document has ${result.pages?.length || 1} pages`);
      
      return {
        text: result.content,
        documentType: 'document',
        confidence: result.documents?.[0]?.confidence || 0.8,
        pages: result.pages?.length || 1,
        tables,
        keyValuePairs,
        fullResult: result // Store complete Document Intelligence JSON response
      };
    } catch (error) {
      console.error("Document Intelligence analysis failed:", error);
      throw new Error(`Document analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Analyze document for medical content specifically
  async analyzeMedicalDocument(containerName: string, blobName: string): Promise<{
    text: string;
    medicalEntities: any[];
    diagnoses: string[];
    medications: string[];
    procedures: string[];
    dates: string[];
  }> {
    try {
      const basicAnalysis = await this.analyzeDocument(containerName, blobName);
      
      // Extract medical-specific information from the text
      const medicalInfo = this.extractMedicalInformation(basicAnalysis.text);
      
      return {
        text: basicAnalysis.text,
        ...medicalInfo
      };
    } catch (error) {
      console.error("Medical document analysis failed:", error);
      throw error;
    }
  }

  // Extract medical information from text using pattern matching
  private extractMedicalInformation(text: string): {
    medicalEntities: any[];
    diagnoses: string[];
    medications: string[];
    procedures: string[];
    dates: string[];
  } {
    // Basic pattern matching for medical entities
    // In production, you'd use more sophisticated NLP or AI models
    
    const datePattern = /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/g;
    const dates = text.match(datePattern) || [];
    
    // Common medical terms (simplified)
    const diagnosisKeywords = ['diagnosis', 'diagnosed', 'condition', 'disease', 'syndrome', 'injury'];
    const medicationKeywords = ['medication', 'drug', 'prescription', 'tablet', 'capsule', 'mg', 'ml'];
    const procedureKeywords = ['surgery', 'procedure', 'operation', 'treatment', 'therapy', 'examination'];
    
    // Extract sentences containing medical keywords
    const sentences = text.split(/[.!?]+/);
    
    const diagnoses = sentences.filter(sentence => 
      diagnosisKeywords.some(keyword => 
        sentence.toLowerCase().includes(keyword)
      )
    ).slice(0, 5); // Limit to 5 most relevant
    
    const medications = sentences.filter(sentence => 
      medicationKeywords.some(keyword => 
        sentence.toLowerCase().includes(keyword)
      )
    ).slice(0, 5);
    
    const procedures = sentences.filter(sentence => 
      procedureKeywords.some(keyword => 
        sentence.toLowerCase().includes(keyword)
      )
    ).slice(0, 5);
    
    return {
      medicalEntities: [], // Would be populated by proper NLP
      diagnoses: diagnoses.map(d => d.trim()).filter(d => d.length > 0),
      medications: medications.map(m => m.trim()).filter(m => m.length > 0),
      procedures: procedures.map(p => p.trim()).filter(p => p.length > 0),
      dates
    };
  }
}

export const documentIntelligenceService = new DocumentIntelligenceService();