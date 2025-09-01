import { azureBlobService } from "./azureBlobStorage";
import { testAzureBlobStorage } from "./azureHealthCheck";
import { documentIntelligenceService } from "./azureDocumentIntelligence";
import { azureSearchService } from "./azureSearchService";
import { OpenAIService } from "./aiService";
import { cosmosDbService } from "./cosmosDbService";
import { azureOpenAIEmbeddingsService } from "./azureOpenAIEmbeddings";

/**
 * Initialize Azure services for the application
 * This should be called when the server starts
 */
export async function initializeAzureServices(): Promise<void> {
  console.log("🚀 Initializing Azure services...");
  
  try {
    // Check required environment variables
    const missingVars = getRequiredAzureEnvVars();
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    // Initialize blob storage containers
    await azureBlobService.initializeContainers();
    console.log("✅ Azure Blob Storage containers initialized successfully");
    
    // Test blob storage functionality
    await testAzureBlobStorage();
    
    // Initialize Document Intelligence (if configured)
    if (documentIntelligenceService.isAvailable()) {
      console.log("✅ Azure Document Intelligence service ready");
    } else {
      console.log("⚠️  Azure Document Intelligence not configured (optional)");
    }
    
    // Initialize Search Service (if configured)
    if (azureSearchService.isAvailable()) {
      await azureSearchService.initializeIndex();
      console.log("✅ Azure Search service ready");
    } else {
      console.log("⚠️  Azure Search not configured (optional)");
    }
    
    // Initialize Cosmos DB (if configured)
    if (cosmosDbService.isAvailable()) {
      await cosmosDbService.initialize();
      console.log("✅ Cosmos DB service ready");
    } else {
      console.log("⚠️  Cosmos DB not configured (optional)");
    }

    // Initialize Azure OpenAI Embeddings (if configured)
    if (azureOpenAIEmbeddingsService.isAvailable()) {
      console.log("✅ Azure OpenAI Embeddings service ready");
    } else {
      console.log("⚠️  Azure OpenAI Embeddings not configured (optional)");
    }
    
    // Initialize OpenAI service (if configured)
    if (process.env.OPENAI_API_KEY) {
      const openAIService = new OpenAIService(process.env.OPENAI_API_KEY);
      console.log("✅ OpenAI service ready");
    } else {
      console.log("⚠️  OpenAI not configured (optional)");
    }
    
    console.log("🎉 Azure services initialization completed successfully");
  } catch (error) {
    console.error("❌ Failed to initialize Azure services:", error);
    throw error;
  }
}

/**
 * Check Azure service health and connectivity
 */
export async function checkAzureServicesHealth(): Promise<{
  blobStorage: boolean;
  documentIntelligence: boolean;
  searchService: boolean;
  openAI: boolean;
  cosmosDb: boolean;
  embeddings: boolean;
}> {
  const health = {
    blobStorage: false,
    documentIntelligence: false,
    searchService: false,
    openAI: false,
    cosmosDb: false,
    embeddings: false,
  };

  // Check Blob Storage
  try {
    await azureBlobService.listFiles('documents');
    health.blobStorage = true;
  } catch (error) {
    console.error("Blob Storage health check failed:", error);
  }

  // Check Document Intelligence
  health.documentIntelligence = documentIntelligenceService.isAvailable();

  // Check Search Service
  health.searchService = azureSearchService.isAvailable();

  // Check OpenAI
  health.openAI = !!process.env.OPENAI_API_KEY;

  // Check Cosmos DB
  health.cosmosDb = cosmosDbService.isAvailable();

  // Check Embeddings service
  health.embeddings = azureOpenAIEmbeddingsService.isAvailable();

  return health;
}

/**
 * Get required environment variables for Azure services
 */
export function getRequiredAzureEnvVars(): string[] {
  const required = [
    'AZURE_STORAGE_ACCOUNT_NAME',
    'AZURE_STORAGE_ACCOUNT_KEY',
    // TODO: Add other required variables as we implement more services
  ];

  const missing = required.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.warn(`Missing Azure environment variables: ${missing.join(', ')}`);
  }

  return missing;
}