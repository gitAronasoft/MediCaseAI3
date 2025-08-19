import OpenAI from "openai";
import { User } from "@shared/schema";

export interface AIServiceInterface {
  analyzeDocument(content: string, fileName: string): Promise<{
    summary: string;
    extractedData: any;
    keyFindings: string[];
  }>;
  
  generateDemandLetter(caseData: any, documents: any[], medicalBills: any[]): Promise<string>;
  
  chatCompletion(messages: any[], systemPrompt?: string): Promise<string>;
}

export class OpenAIService implements AIServiceInterface {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async analyzeDocument(content: string, fileName: string) {
    const prompt = `Analyze this legal/medical document and extract key information:

Document: ${fileName}
Content: ${content}

Please provide:
1. A comprehensive summary
2. Key extracted data (dates, amounts, names, diagnoses, etc.)
3. Important findings for legal case preparation

Format as JSON with: summary, extractedData, keyFindings`;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Ensure the response has the expected structure
      return {
        summary: result.summary || "Document analyzed successfully.",
        extractedData: result.extractedData || {},
        keyFindings: result.keyFindings || []
      };
    } catch (error) {
      console.error("Error analyzing document with OpenAI:", error);
      throw new Error("Failed to analyze document");
    }
  }

  async generateDemandLetter(caseData: any, documents: any[], medicalBills: any[]) {
    const prompt = `Generate a professional demand letter for this legal case:

Case Details: ${JSON.stringify(caseData)}
Documents: ${JSON.stringify(documents)}
Medical Bills: ${JSON.stringify(medicalBills)}

Create a comprehensive demand letter that includes:
- Case summary
- Medical findings
- Financial damages
- Legal basis for claim
- Professional legal language`;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
      });

      return response.choices[0].message.content || "";
    } catch (error) {
      console.error("Error generating demand letter with OpenAI:", error);
      throw new Error("Failed to generate demand letter");
    }
  }

  async chatCompletion(messages: any[], systemPrompt?: string) {
    try {
      const chatMessages = systemPrompt 
        ? [{ role: "system", content: systemPrompt }, ...messages]
        : messages;

      const response = await this.client.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: chatMessages,
      });

      return response.choices[0].message.content || "";
    } catch (error) {
      console.error("Error with OpenAI chat completion:", error);
      throw new Error("Failed to complete chat request");
    }
  }
}

export class AzureOpenAIService implements AIServiceInterface {
  private client: OpenAI;
  private deploymentName: string;

  constructor(endpoint: string, apiKey: string, apiVersion: string, deploymentName: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: `${endpoint}/openai/deployments/${deploymentName}`,
      defaultQuery: { "api-version": apiVersion },
      defaultHeaders: {
        "api-key": apiKey,
      },
    });
    this.deploymentName = deploymentName;
  }

  async analyzeDocument(content: string, fileName: string) {
    const prompt = `Analyze this legal/medical document and extract comprehensive information:

Document: ${fileName}
Content: ${content}

Extract and return a JSON object with the following structure:
{
  "summary": "A detailed summary of the medical document",
  "extractedData": {
    "patientInfo": {
      "names": ["patient names found"],
      "ages": ["ages found"], 
      "addresses": ["addresses found"],
      "phoneNumbers": ["phone numbers found"],
      "insuranceInfo": ["insurance or medical info found"]
    },
    "medicalInfo": {
      "diagnoses": ["medical diagnoses or injuries found"],
      "procedures": ["medical procedures or treatments listed"],
      "medications": ["medications mentioned"],
      "providers": ["healthcare providers or facilities"]
    },
    "timeline": {
      "dates": ["important dates with descriptions"],
      "servicesPeriod": "overall treatment period"
    },
    "locations": {
      "facilities": ["medical facilities mentioned"],
      "addresses": ["relevant addresses for incident or treatment"]
    },
    "additionalDetails": {
      "keyFindings": ["important medical or legal findings"],
      "costs": ["all costs and billing information with amounts"],
      "complications": ["medical complications or ongoing issues"]
    }
  },
  "keyFindings": ["critical findings for legal case preparation"]
}

Make sure to extract ALL specific details from the document including exact names, dates, amounts, addresses, and medical information.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      console.log("Raw Azure OpenAI response:", response.choices[0].message.content);
      const result = JSON.parse(response.choices[0].message.content || "{}");
      console.log("Parsed result:", JSON.stringify(result, null, 2));
      
      // Ensure the response has the expected structure
      return {
        summary: result.summary || "Document analyzed successfully.",
        extractedData: result.extractedData || {},
        keyFindings: result.keyFindings || []
      };
    } catch (error) {
      console.error("Error analyzing document with Azure OpenAI:", error);
      throw new Error("Failed to analyze document");
    }
  }

  async generateDemandLetter(caseData: any, documents: any[], medicalBills: any[]) {
    const prompt = `Generate a professional demand letter for this legal case:

Case Details: ${JSON.stringify(caseData)}
Documents: ${JSON.stringify(documents)}
Medical Bills: ${JSON.stringify(medicalBills)}

Create a comprehensive demand letter that includes:
- Case summary
- Medical findings
- Financial damages
- Legal basis for claim
- Professional legal language`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [{ role: "user", content: prompt }],
      });

      return response.choices[0].message.content || "";
    } catch (error) {
      console.error("Error generating demand letter with Azure OpenAI:", error);
      throw new Error("Failed to generate demand letter");
    }
  }

  async chatCompletion(messages: any[], systemPrompt?: string) {
    try {
      const chatMessages = systemPrompt 
        ? [{ role: "system", content: systemPrompt }, ...messages]
        : messages;

      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: chatMessages,
      });

      return response.choices[0].message.content || "";
    } catch (error) {
      console.error("Error with Azure OpenAI chat completion:", error);
      throw new Error("Failed to complete chat request");
    }
  }
}

export function createAIService(user: User): AIServiceInterface {
  if (user.useAzureOpenAI && user.azureOpenAIEndpoint && user.azureOpenAIApiKey && user.azureModelDeployment) {
    return new AzureOpenAIService(
      user.azureOpenAIEndpoint,
      user.azureOpenAIApiKey,
      user.azureOpenAIVersion || "2024-02-15-preview",
      user.azureModelDeployment
    );
  } else if (user.openaiApiKey) {
    return new OpenAIService(user.openaiApiKey);
  } else {
    throw new Error("No AI service configuration found. Please configure OpenAI or Azure OpenAI in settings.");
  }
}