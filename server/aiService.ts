import OpenAI from "openai";
import { User } from "@shared/schema";

export interface AIServiceInterface {
  analyzeDocument(content: string, fileName: string): Promise<{
    summary: string;
    extractedData: any;
    keyFindings: string[];
  }>;
  
  extractMedicalBills(content: string, fileName: string): Promise<any[]>;
  
  generateDemandLetter(caseData: any, documents: any[], medicalBills: any[]): Promise<string>;
  
  chatCompletion(messages: any[], systemPrompt?: string): Promise<string>;
}

export class OpenAIService implements AIServiceInterface {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async extractMedicalBills(content: string, fileName: string): Promise<any[]> {
    const prompt = `Extract ALL medical bills, invoices, and billing information from this medical document:

Document: ${fileName}
Content: ${content}

For each medical bill found, extract:
- provider (hospital/clinic/doctor name)
- amount (total bill amount in dollars)
- serviceDate (date service was provided, format: YYYY-MM-DD)
- billDate (date bill was issued, format: YYYY-MM-DD)
- treatment (description of treatment/service provided)
- insurance (insurance company/plan mentioned)
- status (use "pending" as default)

If multiple bills or line items exist, extract each as a separate bill.
If dates are unclear, use best estimate based on context.
If amount includes currency symbols, remove them and provide numeric value only.

Format as JSON array of bills: [{"provider": "...", "amount": "...", "serviceDate": "...", "billDate": "...", "treatment": "...", "insurance": "...", "status": "pending"}]

If no medical bills found, return empty array: []`;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Handle both array format and object with bills property
      if (Array.isArray(result)) {
        return result;
      } else if (result.bills && Array.isArray(result.bills)) {
        return result.bills;
      } else {
        return [];
      }
    } catch (error) {
      console.error("Error extracting medical bills with OpenAI:", error);
      return [];
    }
  }

  async analyzeDocument(content: string, fileName: string) {
    const prompt = `Analyze this legal/medical document for a Personal Injury case and extract comprehensive information. Focus on creating a medical chronology suitable for demand packages and legal preparation.

Document: ${fileName}
Content: ${content}

Extract and return a JSON object with the following structure for Personal Injury legal purposes:
{
  "summary": "A detailed narrative summary of this particular bill/record that has been analyzed, focusing on the medical story and legal significance",
  "extractedData": {
    "patientInfo": {
      "patientName": "Full patient name",
      "dateOfBirth": "Date of birth or age",
      "gender": "Patient gender", 
      "address": "Patient address",
      "insurance": "Insurance details (Auto, Health, VA, Medicare, etc.)",
      "accidentDate": "Date of accident/incident"
    },
    "medicalInfo": {
      "injuryDiagnoses": [
        {
          "diagnosis": "cervical strain",
          "icd10Code": "M54.2",
          "narrative": "Detailed description of the injury"
        }
      ],
      "proceduresPerformed": [
        {
          "procedure": "MRI Lumbar Spine",
          "cptCode": "72148", 
          "description": "Detailed procedure description including findings"
        }
      ],
      "diagnostics": [
        {
          "test": "X-ray Cervical Spine",
          "results": "Key impressions and findings (e.g., herniated disc at L4-5, fracture)",
          "significance": "Legal significance of findings"
        }
      ],
      "treatmentRecommendations": [
        "Physical therapy 2-3x per week",
        "Pain management consult for epidural injections",
        "Orthopedic surgery consultation"
      ]
    },
    "painSymptomReports": {
      "painScaleReports": ["Pain scale 7/10 in lower back", "Headache 5/10"],
      "functionalLimitations": ["Cannot lift over 10 lbs", "Cannot sit for more than 30 minutes", "Difficulty driving"],
      "subjectiveComplaints": ["Persistent headaches", "Dizziness", "Numbness in left arm"]
    },
    "timeline": [
      {
        "eventDate": "2024-09-03",
        "eventType": "First Diagnostic Testing",
        "facilityProvider": "Pinnacle Healthcare Radiology",
        "narrativeSummary": "James underwent multiple imaging procedures after the accident, beginning with CT Abdomen and Pelvis with Contrast showing no acute trauma but degenerative changes",
        "cost": "$413.00"
      }
    ],
    "providerInfo": {
      "facilityName": "Medical facility name",
      "treatingProviderName": "Dr. Name",
      "specialty": "Orthopedics/Pain Management/etc",
      "locationAddress": "Full facility address",
      "referralChain": ["PCP → Orthopedist → Pain Management"]
    },
    "billingFinancials": {
      "serviceCharges": [
        {
          "service": "CT Scan with contrast",
          "cptCode": "74177",
          "amount": "$2,660.00"
        }
      ],
      "outstandingBalance": "$1,697.00",
      "paymentsAdjustments": "Insurance payments and write-offs",
      "duplicateCharges": "Any duplicate charges flagged"
    },
    "prognosisFutureCare": {
      "physiciansPrognosis": "Temporary vs permanent impairment assessment",
      "futureMedicalRecommendations": ["Ongoing PT", "Possible surgery", "Pain management"],
      "anticipatedCosts": "Future cost estimates if mentioned"
    },
    "complicationsNotes": {
      "preExistingConditions": "Any pre-existing conditions noted",
      "accidentRelatedAggravations": "How accident aggravated existing conditions",
      "delaysInCare": "Treatment delays or gaps in care",
      "complianceIssues": "Missed appointments, early discharge, etc."
    }
  },
  "keyFindings": ["Critical findings that support the legal case and demonstrate injury causation"]
}

IMPORTANT: Extract ALL specific details including exact dates, dollar amounts, provider names, diagnostic codes, and medical findings. Create a narrative that tells the medical story chronologically and focuses on how this document supports the personal injury claim.`;

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
    const prompt = `Analyze this legal/medical document for a Personal Injury case and extract comprehensive information. Focus on creating a medical chronology suitable for demand packages and legal preparation.

Document: ${fileName}
Content: ${content}

Extract and return a JSON object with the following structure for Personal Injury legal purposes:
{
  "summary": "A detailed narrative summary of this particular bill/record that has been analyzed, focusing on the medical story and legal significance",
  "extractedData": {
    "patientInfo": {
      "patientName": "Full patient name",
      "dateOfBirth": "Date of birth or age",
      "gender": "Patient gender", 
      "address": "Patient address",
      "insurance": "Insurance details (Auto, Health, VA, Medicare, etc.)",
      "accidentDate": "Date of accident/incident"
    },
    "medicalInfo": {
      "injuryDiagnoses": [
        {
          "diagnosis": "cervical strain",
          "icd10Code": "M54.2",
          "narrative": "Detailed description of the injury"
        }
      ],
      "proceduresPerformed": [
        {
          "procedure": "MRI Lumbar Spine",
          "cptCode": "72148", 
          "description": "Detailed procedure description including findings"
        }
      ],
      "diagnostics": [
        {
          "test": "X-ray Cervical Spine",
          "results": "Key impressions and findings (e.g., herniated disc at L4-5, fracture)",
          "significance": "Legal significance of findings"
        }
      ],
      "treatmentRecommendations": [
        "Physical therapy 2-3x per week",
        "Pain management consult for epidural injections",
        "Orthopedic surgery consultation"
      ]
    },
    "painSymptomReports": {
      "painScaleReports": ["Pain scale 7/10 in lower back", "Headache 5/10"],
      "functionalLimitations": ["Cannot lift over 10 lbs", "Cannot sit for more than 30 minutes", "Difficulty driving"],
      "subjectiveComplaints": ["Persistent headaches", "Dizziness", "Numbness in left arm"]
    },
    "timeline": [
      {
        "eventDate": "2024-09-03",
        "eventType": "First Diagnostic Testing",
        "facilityProvider": "Pinnacle Healthcare Radiology",
        "narrativeSummary": "James underwent multiple imaging procedures after the accident, beginning with CT Abdomen and Pelvis with Contrast showing no acute trauma but degenerative changes",
        "cost": "$413.00"
      }
    ],
    "providerInfo": {
      "facilityName": "Medical facility name",
      "treatingProviderName": "Dr. Name",
      "specialty": "Orthopedics/Pain Management/etc",
      "locationAddress": "Full facility address",
      "referralChain": ["PCP → Orthopedist → Pain Management"]
    },
    "billingFinancials": {
      "serviceCharges": [
        {
          "service": "CT Scan with contrast",
          "cptCode": "74177",
          "amount": "$2,660.00"
        }
      ],
      "outstandingBalance": "$1,697.00",
      "paymentsAdjustments": "Insurance payments and write-offs",
      "duplicateCharges": "Any duplicate charges flagged"
    },
    "prognosisFutureCare": {
      "physiciansPrognosis": "Temporary vs permanent impairment assessment",
      "futureMedicalRecommendations": ["Ongoing PT", "Possible surgery", "Pain management"],
      "anticipatedCosts": "Future cost estimates if mentioned"
    },
    "complicationsNotes": {
      "preExistingConditions": "Any pre-existing conditions noted",
      "accidentRelatedAggravations": "How accident aggravated existing conditions",
      "delaysInCare": "Treatment delays or gaps in care",
      "complianceIssues": "Missed appointments, early discharge, etc."
    }
  },
  "keyFindings": ["Critical findings that support the legal case and demonstrate injury causation"]
}

IMPORTANT: Extract ALL specific details including exact dates, dollar amounts, provider names, diagnostic codes, and medical findings. Create a narrative that tells the medical story chronologically and focuses on how this document supports the personal injury claim.`;

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

  async extractMedicalBills(content: string, fileName: string): Promise<any[]> {
    const prompt = `Extract ALL medical bills, invoices, and billing information from this medical document:

Document: ${fileName}
Content: ${content}

For each medical bill found, extract:
- provider (hospital/clinic/doctor name)
- amount (total bill amount in dollars)
- serviceDate (date service was provided, format: YYYY-MM-DD)
- billDate (date bill was issued, format: YYYY-MM-DD)
- treatment (description of treatment/service provided)
- insurance (insurance company/plan mentioned)
- status (use "pending" as default)

If multiple bills or line items exist, extract each as a separate bill.
If dates are unclear, use best estimate based on context.
If amount includes currency symbols, remove them and provide numeric value only.

Format as JSON object with bills array: {"bills": [{"provider": "...", "amount": "...", "serviceDate": "...", "billDate": "...", "treatment": "...", "insurance": "...", "status": "pending"}]}

If no medical bills found, return: {"bills": []}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Handle both array format and object with bills property
      if (Array.isArray(result)) {
        return result;
      } else if (result.bills && Array.isArray(result.bills)) {
        return result.bills;
      } else {
        return [];
      }
    } catch (error) {
      console.error("Error extracting medical bills with Azure OpenAI:", error);
      return [];
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
  // Use Azure OpenAI if user has it enabled and endpoint configured
  if (user.useAzureOpenAI && user.azureOpenAIEndpoint && user.azureModelDeployment) {
    // Use environment variable for API key if user doesn't have one stored
    const apiKey = user.azureOpenAIApiKey || process.env.AZURE_OPENAI_KEY;
    
    if (apiKey) {
      console.log(`🎯 Using Azure OpenAI: ${user.azureOpenAIEndpoint} with deployment: ${user.azureModelDeployment}`);
      return new AzureOpenAIService(
        user.azureOpenAIEndpoint,
        apiKey,
        user.azureOpenAIVersion || "2024-02-15-preview",
        user.azureModelDeployment
      );
    }
  }
  
  // Fallback to regular OpenAI if available
  if (user.openaiApiKey) {
    return new OpenAIService(user.openaiApiKey);
  } else {
    throw new Error("No AI service configuration found. Please configure OpenAI or Azure OpenAI in settings.");
  }
}