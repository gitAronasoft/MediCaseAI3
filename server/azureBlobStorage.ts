import { BlobServiceClient, ContainerClient, BlobClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } from "@azure/storage-blob";
import { Response } from "express";

// Azure Blob Storage configuration
const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const AZURE_STORAGE_ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

// Container names for different document types
export const CONTAINERS = {
  DOCUMENTS: 'documents',
  MEDICAL_BILLS: 'medical-bills', 
  PROCESSED: 'processed-documents',
  TEMP: 'temp-uploads'
} as const;

// Initialize Azure Blob Service Client
export function createBlobServiceClient(): BlobServiceClient {
  if (AZURE_STORAGE_CONNECTION_STRING) {
    return BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  }
  
  if (AZURE_STORAGE_ACCOUNT_NAME && AZURE_STORAGE_ACCOUNT_KEY) {
    const sharedKeyCredential = new StorageSharedKeyCredential(
      AZURE_STORAGE_ACCOUNT_NAME,
      AZURE_STORAGE_ACCOUNT_KEY
    );
    return new BlobServiceClient(
      `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
      sharedKeyCredential
    );
  }
  
  throw new Error(
    "Azure Storage configuration missing. Set either AZURE_STORAGE_CONNECTION_STRING " +
    "or both AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY environment variables."
  );
}

export const blobServiceClient = createBlobServiceClient();

export class AzureBlobStorageService {
  constructor() {}

  // Initialize all required containers
  async initializeContainers(): Promise<void> {
    const containerNames = Object.values(CONTAINERS);
    
    for (const containerName of containerNames) {
      const containerClient = blobServiceClient.getContainerClient(containerName);
      
      try {
        // Create container if it doesn't exist (private by default)
        await containerClient.createIfNotExists();
        
        console.log(`Container '${containerName}' is ready`);
      } catch (error) {
        console.error(`Error creating container '${containerName}':`, error);
        throw error;
      }
    }
  }

  // Get container client for a specific container
  getContainerClient(containerName: string): ContainerClient {
    return blobServiceClient.getContainerClient(containerName);
  }

  // Get blob client for a specific file
  getBlobClient(containerName: string, blobName: string): BlobClient {
    const containerClient = this.getContainerClient(containerName);
    return containerClient.getBlobClient(blobName);
  }

  // Generate a secure blob name with timestamp and UUID
  generateBlobName(originalFileName: string, userId: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2);
    const fileExtension = originalFileName.split('.').pop() || '';
    const sanitizedName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    return `${userId}/${timestamp}_${randomSuffix}_${sanitizedName}`;
  }

  // Get upload URL for direct client uploads 
  async getUploadUrl(containerName: string, blobName: string): Promise<string> {
    const containerClient = this.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);
    
    // Note: For production, you'd want to generate proper SAS tokens
    // For now, we'll return the blob URL and handle uploads server-side
    return blobClient.url;
  }

  // Generate SAS URL with read permissions for Document Intelligence
  generateBlobSasUrl(containerName: string, blobName: string, expiryHours: number = 2): string {
    try {
      console.log(`🔐 Generating SAS URL for blob: ${containerName}/${blobName}`);
      const blobClient = this.getBlobClient(containerName, blobName);
      
      // Check if we have the necessary credentials for SAS generation
      if (!AZURE_STORAGE_ACCOUNT_NAME || !AZURE_STORAGE_ACCOUNT_KEY) {
        console.warn("❌ Cannot generate SAS token: Missing storage account credentials");
        console.warn(`Account Name: ${AZURE_STORAGE_ACCOUNT_NAME ? 'SET' : 'NOT SET'}`);
        console.warn(`Account Key: ${AZURE_STORAGE_ACCOUNT_KEY ? 'SET' : 'NOT SET'}`);
        return blobClient.url; // Return basic URL as fallback
      }

      console.log(`✅ Storage credentials available - Account: ${AZURE_STORAGE_ACCOUNT_NAME}`);

      // Set permissions for Document Intelligence (read-only)
      const permissions = new BlobSASPermissions();
      permissions.read = true;

      // Set expiry time
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + expiryHours);
      
      console.log(`⏰ SAS token expires at: ${expiryTime.toISOString()}`);

      // Generate SAS token
      const sasOptions = {
        containerName,
        blobName,
        permissions: permissions,
        expiresOn: expiryTime,
      };

      const sharedKeyCredential = new StorageSharedKeyCredential(
        AZURE_STORAGE_ACCOUNT_NAME,
        AZURE_STORAGE_ACCOUNT_KEY
      );

      const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
      
      // Return blob URL with SAS token
      const sasUrl = `${blobClient.url}?${sasToken}`;
      console.log(`✅ Generated SAS URL for Document Intelligence access (expires in ${expiryHours}h)`);
      console.log(`🔗 SAS URL: ${sasUrl.substring(0, 100)}...?${sasToken.substring(0, 50)}...`);
      return sasUrl;

    } catch (error) {
      console.error("❌ Error generating SAS URL:", error);
      console.error("Error details:", error instanceof Error ? error.message : 'Unknown error');
      // Return basic URL as fallback
      const fallbackUrl = this.getBlobClient(containerName, blobName).url;
      console.warn(`🚨 Falling back to basic URL (will likely fail): ${fallbackUrl}`);
      return fallbackUrl;
    }
  }

  // Upload a file directly to Azure Blob Storage
  async uploadFile(
    containerName: string,
    blobName: string,
    fileBuffer: Buffer,
    contentType?: string
  ): Promise<void> {
    const blobClient = this.getBlobClient(containerName, blobName);
    
    const options = {
      blobHTTPHeaders: {
        blobContentType: contentType || 'application/octet-stream'
      },
      metadata: {
        uploadedAt: new Date().toISOString()
      }
    };

    const blockBlobClient = blobClient.getBlockBlobClient();
    await blockBlobClient.uploadData(fileBuffer, options);
  }

  // Download a file from Azure Blob Storage
  async downloadFile(containerName: string, blobName: string, res: Response): Promise<void> {
    try {
      const blobClient = this.getBlobClient(containerName, blobName);
      
      // Check if blob exists
      const exists = await blobClient.exists();
      if (!exists) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      // Get blob properties
      const properties = await blobClient.getProperties();
      
      // Set response headers
      res.set({
        'Content-Type': properties.contentType || 'application/octet-stream',
        'Content-Length': properties.contentLength?.toString() || '0',
        'Cache-Control': 'private, max-age=3600'
      });

      // Stream the blob to response
      const downloadResponse = await blobClient.download();
      if (downloadResponse.readableStreamBody) {
        downloadResponse.readableStreamBody.pipe(res);
      } else {
        res.status(500).json({ error: 'Failed to download file' });
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  }

  // Delete a file from Azure Blob Storage
  async deleteFile(containerName: string, blobName: string): Promise<boolean> {
    try {
      const blobClient = this.getBlobClient(containerName, blobName);
      await blobClient.deleteIfExists();
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  // List files in a container with optional prefix filter
  async listFiles(containerName: string, prefix?: string): Promise<Array<{
    name: string;
    size: number;
    lastModified: Date;
    contentType?: string;
  }>> {
    try {
      const containerClient = this.getContainerClient(containerName);
      const files: Array<{
        name: string;
        size: number;
        lastModified: Date;
        contentType?: string;
      }> = [];

      const listOptions = prefix ? { prefix } : {};
      
      for await (const blob of containerClient.listBlobsFlat(listOptions)) {
        files.push({
          name: blob.name,
          size: blob.properties.contentLength || 0,
          lastModified: blob.properties.lastModified || new Date(),
          contentType: blob.properties.contentType
        });
      }

      return files;
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  // Get blob metadata
  async getBlobMetadata(containerName: string, blobName: string): Promise<Record<string, string> | null> {
    try {
      const blobClient = this.getBlobClient(containerName, blobName);
      const properties = await blobClient.getProperties();
      return properties.metadata || null;
    } catch (error) {
      console.error('Error getting blob metadata:', error);
      return null;
    }
  }

  // Set blob metadata (Azure has strict requirements for metadata keys)
  async setBlobMetadata(
    containerName: string,
    blobName: string,
    metadata: Record<string, string>
  ): Promise<boolean> {
    try {
      // Azure metadata keys must be valid HTTP header names
      // Convert to Azure-compatible format
      const azureMetadata: Record<string, string> = {};
      
      for (const [key, value] of Object.entries(metadata)) {
        // Replace invalid characters and make lowercase
        const azureKey = key.toLowerCase()
          .replace(/[^a-z0-9]/g, '') // Only alphanumeric
          .substring(0, 64); // Max 64 chars
        
        // Ensure value is a string and not empty
        const azureValue = String(value).replace(/[^\x20-\x7E]/g, ''); // ASCII printable only
        
        if (azureKey && azureValue) {
          azureMetadata[azureKey] = azureValue;
        }
      }
      
      if (Object.keys(azureMetadata).length === 0) {
        console.log('No valid metadata to set');
        return true;
      }
      
      const blobClient = this.getBlobClient(containerName, blobName);
      await blobClient.setMetadata(azureMetadata);
      return true;
    } catch (error) {
      console.error('Error setting blob metadata:', error);
      return false;
    }
  }

  // Move or copy a blob to a different container or name
  async copyBlob(
    sourceContainer: string,
    sourceBlobName: string,
    targetContainer: string,
    targetBlobName: string,
    deleteSource: boolean = false
  ): Promise<boolean> {
    try {
      const sourceBlobClient = this.getBlobClient(sourceContainer, sourceBlobName);
      const targetBlobClient = this.getBlobClient(targetContainer, targetBlobName);

      // Copy the blob
      const copyOperation = await targetBlobClient.syncCopyFromURL(sourceBlobClient.url);
      
      if (copyOperation.copyStatus === 'success' && deleteSource) {
        await sourceBlobClient.deleteIfExists();
      }

      return copyOperation.copyStatus === 'success';
    } catch (error) {
      console.error('Error copying blob:', error);
      return false;
    }
  }
}

export const azureBlobService = new AzureBlobStorageService();