import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface DocumentAnalysisResult {
  summary: string;
  keyPoints: string[];
  medicalTimeline: Array<{
    date: string;
    event: string;
    provider?: string;
    significance: string;
  }>;
  extractedBills: Array<{
    provider: string;
    amount: number;
    serviceDate: string;
    treatment: string;
    insurance?: string;
  }>;
  recommendedActions: string[];
}

export async function analyzeDocument(
  documentContent: string,
  documentType: string
): Promise<DocumentAnalysisResult> {
  try {
    const prompt = `Analyze this ${documentType} document for a medical legal case. Extract key information and provide a comprehensive summary.

Document Content:
${documentContent}

Please provide a JSON response with the following structure:
{
  "summary": "Brief overview of the document",
  "keyPoints": ["Key point 1", "Key point 2", ...],
  "medicalTimeline": [
    {
      "date": "YYYY-MM-DD",
      "event": "Medical event description",
      "provider": "Healthcare provider name",
      "significance": "Legal significance"
    }
  ],
  "extractedBills": [
    {
      "provider": "Provider name",
      "amount": 0.00,
      "serviceDate": "YYYY-MM-DD",
      "treatment": "Treatment description",
      "insurance": "Insurance information"
    }
  ],
  "recommendedActions": ["Action 1", "Action 2", ...]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a legal assistant specializing in medical malpractice and personal injury cases. Analyze documents thoroughly and extract relevant medical and billing information."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    throw new Error(`Failed to analyze document: ${(error as Error).message}`);
  }
}

export async function generateDemandLetter(
  caseDetails: {
    clientName: string;
    incidentDate: string;
    medicalSummary: string;
    damages: string;
    liability: string;
  }
): Promise<string> {
  try {
    const prompt = `Generate a professional demand letter for a medical legal case with the following details:

Client Name: ${caseDetails.clientName}
Incident Date: ${caseDetails.incidentDate}
Medical Summary: ${caseDetails.medicalSummary}
Damages: ${caseDetails.damages}
Liability: ${caseDetails.liability}

Please create a formal, professional demand letter that includes:
1. Proper legal formatting
2. Clear statement of facts
3. Medical issues and treatment
4. Damages calculation
5. Demand for compensation
6. Deadline for response

The letter should be persuasive but professional, suitable for legal proceedings.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an experienced legal professional specializing in medical malpractice and personal injury law. Generate professional demand letters that are legally sound and persuasive."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    throw new Error(`Failed to generate demand letter: ${(error as Error).message}`);
  }
}

export async function modifyDocumentWithAI(document: any, userCommand: string): Promise<{
  response: string;
  updatedSummary?: string;
  updatedExtractedData?: any;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an AI assistant helping with medical legal document analysis and editing. 

          You have access to a document with the following information:
          - File: ${document.fileName}
          - Summary: ${document.aiSummary || "No summary available"}
          - Extracted Data: ${JSON.stringify(document.extractedData || {}, null, 2)}

          Based on the user's command, you can:
          1. Provide information about the document
          2. Suggest modifications to the summary
          3. Update extracted data
          4. Answer questions about the content
          5. Generate new insights

          If you need to modify the document content, respond with JSON in this format:
          {
            "response": "Your response to the user",
            "updatedSummary": "Modified summary if changed",
            "updatedExtractedData": { "updated extracted data if changed" }
          }

          If no modifications are needed, respond with JSON:
          {
            "response": "Your response to the user"
          }

          Be helpful, accurate, and focus on legal and medical relevance.`
        },
        {
          role: "user",
          content: userCommand
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      response: result.response || "I've processed your request.",
      updatedSummary: result.updatedSummary,
      updatedExtractedData: result.updatedExtractedData
    };
  } catch (error) {
    console.error("AI document modification error:", error);
    throw new Error("Failed to process AI command: " + (error as Error).message);
  }
}

export async function chatWithAI(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context?: {
    caseId?: string;
    documents?: string[];
    medicalBills?: string[];
  }
): Promise<string> {
  try {
    const systemPrompt = `You are an AI legal assistant specializing in medical legal cases. You help lawyers with:
- Document analysis and content extraction
- Medical chronology review
- Demand letter generation and refinement
- Case strategy discussion
- Medical billing review

${context ? `
Case Context:
${context.caseId ? `Case ID: ${context.caseId}` : ''}
${context.documents ? `Available Documents: ${context.documents.join(', ')}` : ''}
${context.medicalBills ? `Medical Bills: ${context.medicalBills.join(', ')}` : ''}
` : ''}

Provide helpful, accurate, and professional assistance. Always maintain legal and medical accuracy.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...messages
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    throw new Error(`Failed to chat with AI: ${(error as Error).message}`);
  }
}

export async function extractTextFromPDF(base64Content: string): Promise<string> {
  try {
    // Use OpenAI's vision capabilities to extract text from PDF pages converted to images
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text content from this document image. Preserve formatting and structure as much as possible. Return only the extracted text."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Content}`
              }
            }
          ],
        },
      ],
      max_tokens: 4000,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}
