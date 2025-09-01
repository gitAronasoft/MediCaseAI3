import { CosmosClient, Database, Container } from "@azure/cosmos";

// Cosmos DB configuration
const COSMOS_ENDPOINT = process.env.AZURE_COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.AZURE_COSMOS_KEY;
const DATABASE_NAME = "legalmed";

export interface DocumentMetadata {
  id: string;
  fileName: string;
  caseId: string;
  uploadedBy: string;
  uploadDate: string;
  fileSize: number;
  mimeType: string;
  blobPath: string;
  processingStatus: 'uploaded' | 'analyzing' | 'processed' | 'error';
  documentIntelligence?: {
    extractedText: string;
    confidence: number;
    pages: number;
    tablesCount: number;
    keyValuePairsCount: number;
  };
  aiAnalysis?: {
    summary: string;
    extractedData: any;
    keyFindings: string[];
    processingDate: string;
  };
  vectorEmbedding?: {
    model: string;
    embeddingId: string;
    dimensions: number;
    createdDate: string;
  };
  searchIndex?: {
    indexed: boolean;
    indexDate: string;
    searchScore?: number;
  };
}

export class CosmosDbService {
  private client: CosmosClient | null = null;
  private database: Database | null = null;
  private documentsContainer: Container | null = null;

  constructor() {
    try {
      if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
        throw new Error(
          "Cosmos DB configuration missing. Set both AZURE_COSMOS_ENDPOINT " +
          "and AZURE_COSMOS_KEY environment variables."
        );
      }

      this.client = new CosmosClient({
        endpoint: COSMOS_ENDPOINT,
        key: COSMOS_KEY,
      });
    } catch (error: any) {
      console.warn("Cosmos DB not configured:", error.message);
      this.client = null;
    }
  }

  // Check if Cosmos DB service is available
  isAvailable(): boolean {
    return this.client !== null;
  }

  // Initialize database and containers
  async initialize(): Promise<void> {
    if (!this.client) {
      throw new Error("Cosmos DB service is not available");
    }

    try {
      console.log("🚀 Initializing Cosmos DB...");
      
      // Create database
      const { database } = await this.client.databases.createIfNotExists({
        id: DATABASE_NAME
      });
      this.database = database;
      console.log(`✅ Database '${DATABASE_NAME}' ready`);

      // Create containers
      const { container: documentsContainer } = await database.containers.createIfNotExists({
        id: "documents",
        partitionKey: { paths: ["/caseId"] },
        indexingPolicy: {
          automatic: true,
          indexingMode: "consistent",
          includedPaths: [
            { path: "/*" }
          ],
          excludedPaths: [
            { path: "/vectorEmbedding/*" } // Exclude vector embeddings from indexing
          ]
        }
      });
      this.documentsContainer = documentsContainer;
      console.log("✅ Container 'documents' ready");

    } catch (error) {
      console.error("Failed to initialize Cosmos DB:", error);
      throw error;
    }
  }

  // Store document metadata
  async storeDocumentMetadata(metadata: DocumentMetadata): Promise<DocumentMetadata> {
    if (!this.documentsContainer) {
      throw new Error("Documents container not initialized");
    }

    try {
      console.log(`📝 Storing metadata for document: ${metadata.fileName}`);
      
      const { resource } = await this.documentsContainer.items.create(metadata);
      console.log(`✅ Metadata stored with ID: ${resource?.id}`);
      
      return resource as DocumentMetadata;
    } catch (error) {
      console.error("Failed to store document metadata:", error);
      throw error;
    }
  }

  // Update document metadata
  async updateDocumentMetadata(
    id: string, 
    caseId: string, 
    updates: Partial<DocumentMetadata>
  ): Promise<DocumentMetadata> {
    if (!this.documentsContainer) {
      throw new Error("Documents container not initialized");
    }

    try {
      console.log(`🔄 Updating metadata for document: ${id}`);
      
      // Get existing document
      const { resource: existing } = await this.documentsContainer.item(id, caseId).read();
      if (!existing) {
        throw new Error("Document not found");
      }

      // Merge updates
      const updated = {
        ...existing,
        ...updates,
        id: existing.id, // Ensure ID doesn't change
        lastModified: new Date().toISOString()
      };

      // Update document
      const { resource } = await this.documentsContainer.item(id, caseId).replace(updated);
      console.log(`✅ Metadata updated for document: ${id}`);
      
      return resource as DocumentMetadata;
    } catch (error) {
      console.error("Failed to update document metadata:", error);
      throw error;
    }
  }

  // Get document metadata
  async getDocumentMetadata(id: string, caseId: string): Promise<DocumentMetadata | null> {
    if (!this.documentsContainer) {
      throw new Error("Documents container not initialized");
    }

    try {
      const { resource } = await this.documentsContainer.item(id, caseId).read();
      return resource as DocumentMetadata || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      console.error("Failed to get document metadata:", error);
      throw error;
    }
  }

  // Query documents by case
  async getDocumentsByCase(caseId: string): Promise<DocumentMetadata[]> {
    if (!this.documentsContainer) {
      throw new Error("Documents container not initialized");
    }

    try {
      const querySpec = {
        query: "SELECT * FROM c WHERE c.caseId = @caseId ORDER BY c.uploadDate DESC",
        parameters: [
          {
            name: "@caseId",
            value: caseId
          }
        ]
      };

      const { resources } = await this.documentsContainer.items.query<DocumentMetadata>(querySpec).fetchAll();
      return resources;
    } catch (error) {
      console.error("Failed to query documents by case:", error);
      throw error;
    }
  }

  // Query processed documents
  async getProcessedDocuments(
    limit: number = 50,
    continuationToken?: string
  ): Promise<{ documents: DocumentMetadata[], continuationToken?: string }> {
    if (!this.documentsContainer) {
      throw new Error("Documents container not initialized");
    }

    try {
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.processingStatus = 'processed' 
          ORDER BY c.uploadDate DESC
          OFFSET 0 LIMIT @limit
        `,
        parameters: [
          {
            name: "@limit",
            value: limit
          }
        ]
      };

      const response = await this.documentsContainer.items
        .query<DocumentMetadata>(querySpec, { 
          maxItemCount: limit,
          continuationToken 
        })
        .fetchNext();

      return {
        documents: response.resources,
        continuationToken: response.continuationToken
      };
    } catch (error) {
      console.error("Failed to query processed documents:", error);
      throw error;
    }
  }

  // Delete document metadata
  async deleteDocumentMetadata(id: string, caseId: string): Promise<void> {
    if (!this.documentsContainer) {
      throw new Error("Documents container not initialized");
    }

    try {
      console.log(`🗑️ Deleting metadata for document: ${id}`);
      await this.documentsContainer.item(id, caseId).delete();
      console.log(`✅ Metadata deleted for document: ${id}`);
    } catch (error) {
      console.error("Failed to delete document metadata:", error);
      throw error;
    }
  }

  // Search documents with filters
  async searchDocuments(
    searchQuery: string,
    filters: {
      caseId?: string;
      processingStatus?: string;
      uploadedBy?: string;
      dateRange?: { start: string; end: string };
    } = {},
    limit: number = 50
  ): Promise<DocumentMetadata[]> {
    if (!this.documentsContainer) {
      throw new Error("Documents container not initialized");
    }

    try {
      let whereClause = "WHERE 1=1";
      const parameters: any[] = [];

      if (searchQuery) {
        whereClause += " AND (CONTAINS(c.fileName, @searchQuery) OR CONTAINS(c.aiAnalysis.summary, @searchQuery))";
        parameters.push({ name: "@searchQuery", value: searchQuery });
      }

      if (filters.caseId) {
        whereClause += " AND c.caseId = @caseId";
        parameters.push({ name: "@caseId", value: filters.caseId });
      }

      if (filters.processingStatus) {
        whereClause += " AND c.processingStatus = @processingStatus";
        parameters.push({ name: "@processingStatus", value: filters.processingStatus });
      }

      if (filters.uploadedBy) {
        whereClause += " AND c.uploadedBy = @uploadedBy";
        parameters.push({ name: "@uploadedBy", value: filters.uploadedBy });
      }

      if (filters.dateRange) {
        whereClause += " AND c.uploadDate >= @startDate AND c.uploadDate <= @endDate";
        parameters.push({ name: "@startDate", value: filters.dateRange.start });
        parameters.push({ name: "@endDate", value: filters.dateRange.end });
      }

      const querySpec = {
        query: `SELECT * FROM c ${whereClause} ORDER BY c.uploadDate DESC OFFSET 0 LIMIT @limit`,
        parameters: [
          ...parameters,
          { name: "@limit", value: limit }
        ]
      };

      const { resources } = await this.documentsContainer.items.query<DocumentMetadata>(querySpec).fetchAll();
      return resources;
    } catch (error) {
      console.error("Failed to search documents:", error);
      throw error;
    }
  }

  // Get analytics/stats
  async getDocumentAnalytics(caseId?: string): Promise<{
    totalDocuments: number;
    processedDocuments: number;
    pendingDocuments: number;
    errorDocuments: number;
    averageProcessingTime?: number;
  }> {
    if (!this.documentsContainer) {
      throw new Error("Documents container not initialized");
    }

    try {
      let whereClause = "";
      const parameters: any[] = [];

      if (caseId) {
        whereClause = "WHERE c.caseId = @caseId";
        parameters.push({ name: "@caseId", value: caseId });
      }

      const querySpec = {
        query: `
          SELECT 
            COUNT(1) as totalDocuments,
            SUM(CASE WHEN c.processingStatus = 'processed' THEN 1 ELSE 0 END) as processedDocuments,
            SUM(CASE WHEN c.processingStatus IN ('uploaded', 'analyzing') THEN 1 ELSE 0 END) as pendingDocuments,
            SUM(CASE WHEN c.processingStatus = 'error' THEN 1 ELSE 0 END) as errorDocuments
          FROM c ${whereClause}
        `,
        parameters
      };

      const { resources } = await this.documentsContainer.items.query(querySpec).fetchAll();
      return resources[0] || {
        totalDocuments: 0,
        processedDocuments: 0,
        pendingDocuments: 0,
        errorDocuments: 0
      };
    } catch (error) {
      console.error("Failed to get document analytics:", error);
      throw error;
    }
  }
}

export const cosmosDbService = new CosmosDbService();