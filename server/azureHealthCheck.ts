import { azureBlobService, CONTAINERS } from "./azureBlobStorage";

/**
 * Test Azure Blob Storage connectivity and container setup
 */
export async function testAzureBlobStorage(): Promise<void> {
  console.log("🧪 Testing Azure Blob Storage...");
  
  try {
    // Test container listing
    const containers = Object.values(CONTAINERS);
    console.log(`📦 Testing ${containers.length} containers:`, containers.join(', '));
    
    for (const containerName of containers) {
      try {
        const files = await azureBlobService.listFiles(containerName);
        console.log(`✅ Container '${containerName}': accessible (${files.length} files)`);
      } catch (error) {
        console.error(`❌ Container '${containerName}' error:`, (error as Error).message);
      }
    }
    
    // Test upload/download functionality with a small test file
    const testContainer = CONTAINERS.TEMP;
    const testBlobName = `test-${Date.now()}.txt`;
    const testContent = Buffer.from("Azure Blob Storage test file");
    
    console.log("🔄 Testing upload/download functionality...");
    
    // Upload test file
    await azureBlobService.uploadFile(testContainer, testBlobName, testContent, "text/plain");
    console.log("✅ Test file uploaded successfully");
    
    // Set metadata
    await azureBlobService.setBlobMetadata(testContainer, testBlobName, {
      testUpload: "true",
      timestamp: new Date().toISOString()
    });
    console.log("✅ Metadata set successfully");
    
    // Get metadata
    const metadata = await azureBlobService.getBlobMetadata(testContainer, testBlobName);
    console.log("✅ Metadata retrieved:", metadata);
    
    // Clean up test file
    await azureBlobService.deleteFile(testContainer, testBlobName);
    console.log("✅ Test file cleaned up successfully");
    
    console.log("🎉 Azure Blob Storage test completed successfully!");
    
  } catch (error) {
    console.error("❌ Azure Blob Storage test failed:", error);
    throw error;
  }
}

/**
 * Get Azure service status for health endpoint
 */
export async function getAzureServiceStatus() {
  const status = {
    timestamp: new Date().toISOString(),
    services: {
      blobStorage: { status: 'unknown', error: null },
      documentIntelligence: { status: 'not_implemented', error: null },
      searchService: { status: 'not_implemented', error: null },
      openAI: { status: 'not_implemented', error: null },
      cosmosDB: { status: 'not_implemented', error: null }
    }
  };

  // Test Blob Storage
  try {
    await azureBlobService.listFiles(CONTAINERS.DOCUMENTS);
    status.services.blobStorage.status = 'healthy';
  } catch (error: any) {
    status.services.blobStorage.status = 'error';
    status.services.blobStorage.error = error.message;
  }

  return status;
}