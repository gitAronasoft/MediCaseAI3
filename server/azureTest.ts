// Azure Services Test Script
import { documentIntelligenceService } from "./azureDocumentIntelligence";
import { azureSearchService } from "./azureSearchService";
import { azureOpenAIEmbeddingsService } from "./azureOpenAIEmbeddings";
import OpenAI from "openai";

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY;
const AZURE_OPENAI_DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION;

export async function testAzureServices() {
  console.log("🧪 Testing All Azure AI Services...\n");

  // Test 1: Document Intelligence
  console.log("1️⃣ Testing Document Intelligence:");
  console.log(`   Available: ${documentIntelligenceService.isAvailable()}`);
  
  // Test 2: Azure Search
  console.log("2️⃣ Testing Azure Search:");
  console.log(`   Available: ${azureSearchService.isAvailable()}`);
  
  // Test 3: Azure OpenAI Embeddings
  console.log("3️⃣ Testing Azure OpenAI Embeddings:");
  console.log(`   Available: ${azureOpenAIEmbeddingsService.isAvailable()}`);
  
  if (azureOpenAIEmbeddingsService.isAvailable()) {
    try {
      console.log("   🔢 Testing embedding generation...");
      const testResult = await azureOpenAIEmbeddingsService.generateEmbedding("test text");
      console.log(`   ✅ Embeddings working: ${testResult.dimensions} dimensions`);
    } catch (error) {
      console.log(`   ❌ Embeddings failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Test 4: Azure OpenAI Chat
  console.log("4️⃣ Testing Azure OpenAI Chat:");
  console.log(`   Endpoint: ${AZURE_OPENAI_ENDPOINT}`);
  console.log(`   Deployment: ${AZURE_OPENAI_DEPLOYMENT_NAME}`);
  console.log(`   API Version: ${AZURE_OPENAI_API_VERSION}`);
  
  if (AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_KEY && AZURE_OPENAI_DEPLOYMENT_NAME) {
    try {
      console.log("   🤖 Testing Azure OpenAI chat...");
      
      const client = new OpenAI({
        apiKey: AZURE_OPENAI_KEY,
        baseURL: `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT_NAME}`,
        defaultQuery: { 'api-version': AZURE_OPENAI_API_VERSION },
        defaultHeaders: {
          'api-key': AZURE_OPENAI_KEY,
        }
      });
      
      const response = await client.chat.completions.create({
        model: AZURE_OPENAI_DEPLOYMENT_NAME,
        messages: [{ role: "user", content: "Say 'Azure OpenAI is working!'" }],
        max_tokens: 50,
      });
      
      console.log(`   ✅ Azure OpenAI Chat working: "${response.choices[0].message.content}"`);
    } catch (error) {
      console.log(`   ❌ Azure OpenAI Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    console.log("   ⚠️ Missing Azure OpenAI configuration");
  }

  console.log("\n🏁 Azure Services Test Complete!");
}

// Test individual services
export async function testDocumentIntelligence() {
  console.log("🧪 Testing Document Intelligence with a sample blob...");
  // This would test with an actual uploaded document
}

export async function testEmbeddingsDeployment() {
  console.log("🔢 Testing different embedding models...");
  
  const commonEmbeddingModels = [
    "text-embedding-ada-002",
    "text-embedding-3-small", 
    "text-embedding-3-large"
  ];
  
  for (const model of commonEmbeddingModels) {
    try {
      console.log(`   Testing model: ${model}`);
      
      const client = new OpenAI({
        apiKey: AZURE_OPENAI_KEY,
        baseURL: `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${model}`,
        defaultQuery: { 'api-version': AZURE_OPENAI_API_VERSION },
        defaultHeaders: {
          'api-key': AZURE_OPENAI_KEY || '',
        }
      });
      
      const response = await client.embeddings.create({
        model: model,
        input: "test text for embeddings",
      });
      
      console.log(`   ✅ ${model} works: ${response.data[0].embedding.length} dimensions`);
      return model; // Return first working model
    } catch (error) {
      console.log(`   ❌ ${model} failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }
  
  return null;
}