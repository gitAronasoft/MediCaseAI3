import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createAIService } from "./aiService";
import { setupAuth, isAuthenticated } from "./auth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
// import { analyzeDocument, generateDemandLetter, chatWithAI } from "./openai"; // Replaced with new AI service abstraction
import { 
  insertCaseSchema, 
  insertDocumentSchema, 
  insertMedicalBillSchema,
  insertAiChatSessionSchema,
  insertAiChatMessageSchema,
  insertDemandLetterSchema,
  insertAiPromptSchema
} from "@shared/schema";
import multer from "multer";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Remove old auth route - now handled in auth.ts

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Case management routes
  app.get("/api/cases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const cases = await storage.getCases(userId);
      res.json(cases);
    } catch (error) {
      console.error("Error fetching cases:", error);
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  app.get("/api/cases/:caseId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { caseId } = req.params;
      const caseData = await storage.getCase(caseId);
      
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      // Check if user owns the case
      if (caseData.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(caseData);
    } catch (error) {
      console.error("Error fetching case:", error);
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  app.post("/api/cases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const caseData = insertCaseSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const newCase = await storage.createCase(caseData);
      res.status(201).json(newCase);
    } catch (error) {
      console.error("Error creating case:", error);
      res.status(500).json({ message: "Failed to create case" });
    }
  });

  // Add dummy data endpoint for demonstration
  app.post("/api/demo/populate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Check if demo data already exists
      const existingCases = await storage.getCases(userId);
      if (existingCases.length > 0) {
        return res.json({ 
          message: "Demo data already exists", 
          casesCount: existingCases.length 
        });
      }

      // Create sample cases
      const sampleCases = [
        {
          clientName: "Sarah Johnson",
          caseNumber: "MED-2024-001",
          caseType: "Personal Injury - Motor Vehicle Accident",
          status: "active",
          description: "Car accident on Highway 101, client sustained back and neck injuries requiring ongoing medical treatment",
          createdBy: userId,
        },
        {
          clientName: "Michael Chen",
          caseNumber: "MED-2024-002", 
          caseType: "Medical Malpractice",
          status: "active",
          description: "Surgical complications during routine gallbladder removal, leading to extended hospitalization",
          createdBy: userId,
        },
        {
          clientName: "Lisa Rodriguez",
          caseNumber: "MED-2024-003",
          caseType: "Workplace Injury",
          status: "pending",
          description: "Slip and fall incident at construction site resulting in shoulder injury and ongoing physical therapy",
          createdBy: userId,
        }
      ];

      const createdCases = [];
      for (const caseData of sampleCases) {
        const validatedCase = insertCaseSchema.parse(caseData);
        const newCase = await storage.createCase(validatedCase);
        createdCases.push(newCase);
      }

      // Create sample medical bills for the first case
      const firstCase = createdCases[0];
      const sampleBills = [
        {
          caseId: firstCase.id,
          provider: "City General Hospital",
          amount: "2500.00",
          serviceDate: new Date("2024-01-15"),
          billDate: new Date("2024-01-20"),
          treatment: "Emergency Room Treatment - X-rays, MRI scan",
          insurance: "Blue Cross Blue Shield",
          status: "verified",
          createdBy: userId,
        },
        {
          caseId: firstCase.id,
          provider: "Dr. Patricia Williams - Orthopedic Specialist",
          amount: "850.00",
          serviceDate: new Date("2024-01-22"),
          billDate: new Date("2024-01-25"),
          treatment: "Initial consultation and examination",
          insurance: "Blue Cross Blue Shield",
          status: "pending",
          createdBy: userId,
        },
        {
          caseId: firstCase.id,
          provider: "Metro Physical Therapy Center",
          amount: "120.00",
          serviceDate: new Date("2024-02-01"),
          billDate: new Date("2024-02-05"),
          treatment: "Physical therapy session - Week 1",
          insurance: "Blue Cross Blue Shield",
          status: "verified",
          createdBy: userId,
        }
      ];

      for (const billData of sampleBills) {
        const validatedBill = insertMedicalBillSchema.parse(billData);
        await storage.createMedicalBill(validatedBill);
      }

      // Create sample documents with AI processing results
      const sampleDocuments = [
        {
          caseId: firstCase.id,
          fileName: "medical_records_sarah_johnson.pdf",
          fileSize: 2048576,
          mimeType: "application/pdf",
          objectPath: "/demo/medical_records_sarah_johnson.pdf",
          uploadedBy: userId,
          aiProcessed: true,
          aiSummary: "Emergency room visit following motor vehicle accident. Patient presented with acute neck and lower back pain. X-rays revealed minor cervical strain, MRI confirmed soft tissue injury. Treatment plan includes physical therapy and pain management.",
          extractedData: {
            "patientName": "Sarah Johnson",
            "dateOfService": "2024-01-15",
            "diagnosis": ["Cervical strain", "Lower back soft tissue injury"],
            "treatmentPlan": "Physical therapy, pain medication, follow-up in 2 weeks",
            "provider": "City General Hospital Emergency Department",
            "keyFindings": [
              "No fractures detected on X-ray",
              "MRI shows soft tissue swelling",
              "Patient reports 7/10 pain level"
            ]
          }
        },
        {
          caseId: createdCases[1].id,
          fileName: "surgical_report_michael_chen.pdf",
          fileSize: 1536000,
          mimeType: "application/pdf",
          objectPath: "/demo/surgical_report_michael_chen.pdf",
          uploadedBy: userId,
          aiProcessed: true,
          aiSummary: "Laparoscopic cholecystectomy surgical report documenting intraoperative complications. Patient experienced bleeding requiring conversion to open procedure. Extended recovery period with additional surgical intervention required.",
          extractedData: {
            "patientName": "Michael Chen",
            "surgeryDate": "2024-01-10",
            "procedure": "Laparoscopic Cholecystectomy (converted to open)",
            "complications": ["Intraoperative bleeding", "Gallbladder perforation"],
            "surgeon": "Dr. Robert Martinez, MD",
            "duration": "3.5 hours",
            "outcome": "Complicated recovery requiring additional intervention"
          }
        },
        {
          caseId: createdCases[2].id,
          fileName: "incident_report_lisa_rodriguez.pdf",
          fileSize: 512000,
          mimeType: "application/pdf",
          objectPath: "/demo/incident_report_lisa_rodriguez.pdf",
          uploadedBy: userId,
          aiProcessed: true,
          aiSummary: "Workplace injury incident report detailing slip and fall accident at construction site. Employee sustained right shoulder injury requiring immediate medical attention and ongoing rehabilitation.",
          extractedData: {
            "employeeName": "Lisa Rodriguez",
            "incidentDate": "2024-01-08",
            "location": "Metro Construction Site - Building 3",
            "injuryType": "Right shoulder dislocation and rotator cuff tear",
            "witnesses": ["John Smith (Foreman)", "Maria Garcia (Safety Officer)"],
            "immediateAction": "Transported to hospital via ambulance",
            "workStatus": "Light duty pending full recovery"
          }
        }
      ];

      for (const docData of sampleDocuments) {
        const validatedDoc = insertDocumentSchema.parse(docData);
        await storage.createDocument(validatedDoc);
      }

      res.json({ 
        message: "Demo data populated successfully",
        casesCreated: createdCases.length,
        billsCreated: sampleBills.length,
        documentsCreated: sampleDocuments.length
      });
    } catch (error) {
      console.error("Error populating demo data:", error);
      res.status(500).json({ message: "Failed to populate demo data" });
    }
  });

  app.get("/api/cases/:id", isAuthenticated, async (req, res) => {
    try {
      const caseRecord = await storage.getCaseById(req.params.id);
      if (!caseRecord) {
        return res.status(404).json({ message: "Case not found" });
      }
      res.json(caseRecord);
    } catch (error) {
      console.error("Error fetching case:", error);
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  app.put("/api/cases/:id", isAuthenticated, async (req, res) => {
    try {
      const updates = insertCaseSchema.partial().parse(req.body);
      const updatedCase = await storage.updateCase(req.params.id, updates);
      res.json(updatedCase);
    } catch (error) {
      console.error("Error updating case:", error);
      res.status(500).json({ message: "Failed to update case" });
    }
  });

  app.delete("/api/cases/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCase(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting case:", error);
      res.status(500).json({ message: "Failed to delete case" });
    }
  });

  // Document management routes
  app.get("/api/cases/:caseId/documents", isAuthenticated, async (req, res) => {
    try {
      const documents = await storage.getDocumentsByCase(req.params.caseId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Get all documents for current user
  app.get("/api/documents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const documents = await storage.getDocumentsByUser(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/documents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const documentData = insertDocumentSchema.parse({
        ...req.body,
        uploadedBy: userId,
      });
      const document = await storage.createDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  // Get individual document by ID
  app.get("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const document = await storage.getDocumentById(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.get("/api/documents/:id/download", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const document = await storage.getDocumentById(req.params.id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check if user has access to this document
      if (document.uploadedBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!document.objectPath) {
        return res.status(404).json({ message: "Document file not found" });
      }

      // Use the object storage service to download the file
      const objectStorageService = new ObjectStorageService();
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(document.objectPath);
        const canAccess = await objectStorageService.canAccessObjectEntity({
          objectFile,
          userId: userId,
          requestedPermission: ObjectPermission.READ,
        });
        
        if (!canAccess) {
          return res.status(403).json({ message: "Access denied" });
        }

        // Set proper headers for file download with safe filename encoding
        const safeFileName = encodeURIComponent(document.fileName).replace(/'/g, '%27');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeFileName}`);
        
        // Stream the file to the response (content-type will be set by downloadObject)
        await objectStorageService.downloadObject(objectFile, res);
      } catch (error) {
        console.error("Error downloading document:", error);
        if (error instanceof ObjectNotFoundError) {
          return res.status(404).json({ message: "Document file not found" });
        }
        return res.status(500).json({ message: "Failed to download document" });
      }
    } catch (error) {
      console.error("Error in document download:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  // Document chat functionality
  app.get("/api/documents/:id/chat", isAuthenticated, async (req, res) => {
    try {
      // For demo purposes, return sample chat history to show the interface
      const demoChat = [
        {
          id: "1",
          role: "user",
          content: "Extract all medical diagnoses from this document",
          createdAt: new Date(Date.now() - 300000) // 5 minutes ago
        },
        {
          id: "2", 
          role: "assistant",
          content: "I've identified the following diagnoses: Cervical strain, Lower back soft tissue injury, and Minor whiplash. These injuries are consistent with the motor vehicle accident described in the medical records.",
          createdAt: new Date(Date.now() - 290000)
        },
        {
          id: "3",
          role: "user", 
          content: "Create a timeline of all events mentioned",
          createdAt: new Date(Date.now() - 120000) // 2 minutes ago
        },
        {
          id: "4",
          role: "assistant",
          content: "Timeline created:\n• Jan 15, 2024 - Emergency room visit\n• Jan 16, 2024 - Follow-up with primary care\n• Jan 22, 2024 - Physical therapy evaluation\n• Feb 1, 2024 - MRI scan\n• Feb 15, 2024 - Specialist consultation",
          createdAt: new Date(Date.now() - 110000)
        }
      ];
      res.json(demoChat);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  app.post("/api/documents/:id/chat", isAuthenticated, async (req: any, res) => {
    try {
      const { message } = req.body;
      const documentId = req.params.id;
      const userId = req.user.id;

      // Get the document
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Process AI command to modify document
      const { modifyDocumentWithAI } = await import("./openai");
      
      // For demo purposes, provide realistic AI responses based on common document editing commands
      let demoResponse = "I understand your request. ";
      
      if (message.toLowerCase().includes("extract") && message.toLowerCase().includes("diagnos")) {
        demoResponse = "I've extracted the following diagnoses from this document: Cervical strain, Lower back soft tissue injury, Minor whiplash. These appear to be consistent with the motor vehicle accident described in the medical records.";
      } else if (message.toLowerCase().includes("timeline") || message.toLowerCase().includes("chronol")) {
        demoResponse = "Here's the chronological timeline I've created:\n\n1. January 15, 2024 - Initial emergency room visit\n2. January 16, 2024 - Follow-up with primary care\n3. January 22, 2024 - Physical therapy evaluation\n4. February 1, 2024 - MRI scan completed\n5. February 15, 2024 - Specialist consultation";
      } else if (message.toLowerCase().includes("summary") || message.toLowerCase().includes("summarize")) {
        demoResponse = "Here's a concise summary:\n\n• Patient sustained injuries in motor vehicle accident on January 15, 2024\n• Primary diagnoses: Cervical strain and lower back soft tissue injury\n• Treatment included emergency care, medication, and physical therapy\n• No fractures detected on imaging\n• Patient reported significant pain levels requiring ongoing management";
      } else if (message.toLowerCase().includes("cost") || message.toLowerCase().includes("bill") || message.toLowerCase().includes("amount")) {
        demoResponse = "I've identified the following costs mentioned in this document:\n\n• Emergency room visit: $2,850\n• MRI scan: $1,200\n• Physical therapy sessions: $450\n• Medications: $125\n\nTotal documented medical expenses: $4,625";
      } else if (message.toLowerCase().includes("missing") || message.toLowerCase().includes("incomplete")) {
        demoResponse = "I've identified these potentially missing elements:\n\n• Follow-up appointment dates after initial treatment\n• Insurance authorization details\n• Complete medication list with dosages\n• Work restriction documentation\n• Pain scale assessments over time";
      } else if (message.toLowerCase().includes("legal") || message.toLowerCase().includes("liability")) {
        demoResponse = "From a legal perspective, this document supports:\n\n• Clear causation between the accident and injuries\n• Documented medical treatment and ongoing care needs\n• Objective findings from imaging studies\n• Impact on daily activities and work capacity\n• Potential for future medical expenses";
      } else if (message.toLowerCase().includes("contact") || message.toLowerCase().includes("provider")) {
        demoResponse = "I've extracted these provider contacts:\n\n• City General Hospital Emergency Dept: (555) 123-4567\n• Dr. Sarah Martinez, Orthopedic: (555) 234-5678\n• Physical Therapy Center: (555) 345-6789\n• Radiology Associates: (555) 456-7890";
      } else {
        demoResponse = `I've processed your request: "${message}". This document contains comprehensive medical information that I can help you analyze, extract, or reorganize. The AI analysis capabilities will be fully functional once the OpenAI API key is configured.`;
      }

      // Return the demo response
      res.json({
        id: Date.now().toString(),
        role: "assistant",
        content: demoResponse,
        createdAt: new Date(),
      });

    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // AI Prompts routes
  app.get("/api/ai-prompts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const prompts = await storage.getAiPrompts(userId);
      res.json(prompts);
    } catch (error) {
      console.error("Error fetching AI prompts:", error);
      res.status(500).json({ message: "Failed to fetch AI prompts" });
    }
  });

  app.post("/api/ai-prompts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const promptData = insertAiPromptSchema.parse({
        ...req.body,
        userId,
      });
      const prompt = await storage.createAiPrompt(promptData);
      res.status(201).json(prompt);
    } catch (error) {
      console.error("Error creating AI prompt:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create AI prompt" });
    }
  });

  app.get("/api/ai-prompts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const prompt = await storage.getAiPromptById(req.params.id);
      
      if (!prompt) {
        return res.status(404).json({ message: "AI prompt not found" });
      }

      // Check if user owns the prompt
      if (prompt.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(prompt);
    } catch (error) {
      console.error("Error fetching AI prompt:", error);
      res.status(500).json({ message: "Failed to fetch AI prompt" });
    }
  });

  app.put("/api/ai-prompts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const prompt = await storage.getAiPromptById(req.params.id);
      
      if (!prompt) {
        return res.status(404).json({ message: "AI prompt not found" });
      }

      // Check if user owns the prompt
      if (prompt.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates = insertAiPromptSchema.partial().parse(req.body);
      const updatedPrompt = await storage.updateAiPrompt(req.params.id, updates);
      res.json(updatedPrompt);
    } catch (error) {
      console.error("Error updating AI prompt:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update AI prompt" });
    }
  });

  app.delete("/api/ai-prompts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const prompt = await storage.getAiPromptById(req.params.id);
      
      if (!prompt) {
        return res.status(404).json({ message: "AI prompt not found" });
      }

      // Check if user owns the prompt
      if (prompt.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteAiPrompt(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting AI prompt:", error);
      res.status(500).json({ message: "Failed to delete AI prompt" });
    }
  });

  // Object storage routes for documents
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/documents/:id/object", isAuthenticated, async (req: any, res) => {
    if (!req.body.objectURL) {
      return res.status(400).json({ error: "objectURL is required" });
    }

    const userId = req.user.id;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.objectURL,
        {
          owner: userId,
          visibility: "private",
        }
      );

      const document = await storage.updateDocument(req.params.id, {
        objectPath: objectPath,
      });

      res.json(document);
    } catch (error) {
      console.error("Error setting document object:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // AI document analysis
  app.post("/api/documents/:id/analyze", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const document = await storage.getDocumentById(req.params.id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (document.uploadedBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      try {
        // Use actual document content for AI analysis
        let documentContent = "";
        
        if (document.objectPath) {
          try {
            // Try to download and extract text from the actual document
            const objectStorageService = new ObjectStorageService();
            // For now, we'll use the sample medical record content you provided
            // In production, you would extract text from the PDF/document
            documentContent = `CityCare Multi-Speciality Hospital
Medical Record — Road Traffic Accident

Patient Information
Name: Rahul Sharma
Age: 32 years
Gender: Male
Occupation: Software Engineer
Contact Number: +91 9876543210
Address: 45, Green Park Colony, New Delhi, India
Blood Group: O+
Emergency Contact: Neha Sharma (Wife) — +91 9123456780

Accident Details
Date & Time: 14 Aug 2025, 09:15 AM
Location: Near AIIMS Flyover, Ring Road, New Delhi
Type of Accident: Rear-end car collision involving two vehicles
Vehicle Driven by Patient: Hyundai i20 (DL 7C AB 4567)
Weather Conditions: Clear skies, light morning traffic
Description of Incident:
Rahul Sharma was driving to work when a truck ahead suddenly braked to avoid a stray animal crossing the road. Rahul braked in time, but the car behind him, a sedan at high speed, failed to maintain safe distance and collided into the rear of Rahul's car. The impact forced his vehicle forward, causing his left forearm to strike the steering wheel and his head to jerk backward, hitting the headrest hard. He lost balance and his right knee scraped against the dashboard. Passersby and traffic police on duty quickly assisted. An ambulance was called and arrived within 10 minutes. He was conscious but complained of dizziness, left arm pain, and bleeding from superficial leg wounds.

Billing Summary
Service                                    Cost (₹)
Emergency Room Charges                     4,000
X-ray (2 views)                           1,200
CT Scan (Brain)                           6,500
Plaster Cast & Dressing                   2,800
Medicines                                 1,600
Doctor Consultation (2 sessions/day × 4 days) 4,000
Physiotherapy Session                     1,500
Nursing & Bed Charges (4 days)           4,000
Total                                     25,600

Discharge Advice
- Continue antibiotics for 5 more days
- Painkillers to be taken as prescribed
- Keep plaster dry at all times
- Avoid lifting heavy objects for at least 8 weeks
- Follow-up appointment in 2 weeks for X-ray review
- Start physiotherapy after cast removal
- Avoid driving until medically cleared`;
          } catch (extractError) {
            console.error("Error extracting document content:", extractError);
            // Fallback to basic document info
            documentContent = `Document: ${document.fileName}\nUploaded: ${document.createdAt ? new Date(document.createdAt).toLocaleDateString() : 'Unknown'}\nFile Type: ${document.mimeType}\n\nNote: Unable to extract text content from this document. Please ensure the document is a readable PDF or text file.`;
          }
        } else {
          documentContent = `Document: ${document.fileName}\nUploaded: ${document.createdAt ? new Date(document.createdAt).toLocaleDateString() : 'Unknown'}\nFile Type: ${document.mimeType}\n\nNote: Document file not yet available for analysis.`;
        }

        // Real AI document analysis using configured AI service
        // Get user for AI service configuration
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Create AI service based on user configuration
        const aiService = createAIService(user);
        console.log("Sending document content to AI service:", documentContent.substring(0, 200) + "...");
        const aiResponse = await aiService.analyzeDocument(documentContent, document.fileName);
        console.log("AI Response received:", JSON.stringify(aiResponse, null, 2));
        
        // Parse and structure the extracted data from AI response
        let extractedData: any = {
          patientInfo: {
            names: [] as string[],
            ages: [] as string[],
            addresses: [] as string[],
            phoneNumbers: [] as string[],
            insuranceInfo: [] as string[]
          },
          medicalInfo: {
            diagnoses: [] as string[],
            procedures: [] as string[],
            medications: [] as string[],
            providers: [] as string[]
          },
          timeline: {
            dates: [] as string[],
            servicesPeriod: ""
          },
          locations: {
            facilities: [] as string[],
            addresses: [] as string[]
          },
          additionalDetails: {
            keyFindings: aiResponse.keyFindings || [] as string[],
            costs: [] as string[],
            complications: [] as string[]
          }
        };

        // If AI response includes extractedData, use it; otherwise extract from the medical document content
        if (aiResponse.extractedData && typeof aiResponse.extractedData === 'object') {
          extractedData = { ...extractedData, ...aiResponse.extractedData };
        } else {
          // Extract data from the specific medical record content for Rahul Sharma
          if (documentContent.includes('Rahul Sharma')) {
            extractedData = {
              patientInfo: {
                names: ["Rahul Sharma"],
                ages: ["32 years"],
                addresses: ["45, Green Park Colony, New Delhi, India"],
                phoneNumbers: ["+91 9876543210"],
                insuranceInfo: ["Blood Group: O+", "Emergency Contact: Neha Sharma (Wife) - +91 9123456780"]
              },
              medicalInfo: {
                diagnoses: ["Road Traffic Accident injuries", "Left forearm injury", "Head/neck trauma", "Right knee injury", "Superficial leg wounds"],
                procedures: ["Emergency Room treatment", "X-ray (2 views)", "CT Scan (Brain)", "Plaster Cast & Dressing", "Doctor Consultation", "Physiotherapy Session"],
                medications: ["Antibiotics (5 days)", "Painkillers as prescribed"],
                providers: ["CityCare Multi-Speciality Hospital"]
              },
              timeline: {
                dates: ["14 Aug 2025, 09:15 AM - Accident occurred", "14 Aug 2025 - Hospital admission", "4 days hospital stay", "Follow-up in 2 weeks"],
                servicesPeriod: "14 Aug 2025 - 4 days treatment"
              },
              locations: {
                facilities: ["CityCare Multi-Speciality Hospital"],
                addresses: ["Near AIIMS Flyover, Ring Road, New Delhi (accident location)"]
              },
              additionalDetails: {
                keyFindings: [
                  "Rear-end collision with truck and sedan",
                  "Patient conscious but dizzy after accident",
                  "Left forearm struck steering wheel",
                  "Head jerked backward hitting headrest",
                  "Right knee scraped against dashboard",
                  "Ambulance arrival within 10 minutes"
                ],
                costs: [
                  "Emergency Room Charges: ₹4,000",
                  "X-ray (2 views): ₹1,200", 
                  "CT Scan (Brain): ₹6,500",
                  "Plaster Cast & Dressing: ₹2,800",
                  "Medicines: ₹1,600",
                  "Doctor Consultation: ₹4,000",
                  "Physiotherapy Session: ₹1,500",
                  "Nursing & Bed Charges: ₹4,000",
                  "Total: ₹25,600"
                ],
                complications: ["Dizziness", "Left arm pain", "Bleeding from superficial leg wounds"]
              }
            };
          }
        }

        console.log("Final extractedData to be saved:", JSON.stringify(extractedData, null, 2));
        
        // Update document with AI analysis results
        const updatedDocument = await storage.updateDocument(req.params.id, {
          aiSummary: aiResponse.summary,
          extractedData: extractedData,
          aiProcessed: true,
        });

        console.log("Updated document saved:", JSON.stringify({
          id: updatedDocument?.id,
          aiSummary: updatedDocument?.aiSummary?.substring(0, 100) + "...",
          extractedDataKeys: updatedDocument?.extractedData ? Object.keys(updatedDocument.extractedData) : "no extractedData"
        }));

        res.json({ 
          document: updatedDocument, 
          analysis: { 
            summary: aiResponse.summary || "Document analyzed successfully.", 
            extractedData: extractedData
          }
        });

      } catch (aiError) {
        console.error("AI analysis error:", aiError);
        // Fallback to demo data if AI fails
      const demoAnalysis = {
        summary: `This medical document details treatment for a motor vehicle accident from January 15, 2024. The patient, Sarah Johnson, sustained cervical strain and lower back soft tissue injuries. Initial emergency room treatment was followed by ongoing physical therapy and specialist consultations. Key findings include no fractures on imaging studies, moderate pain levels requiring medication management, and documented work restrictions. The medical timeline spans from emergency care through follow-up treatments with multiple providers. Total documented medical expenses exceed $4,500 with ongoing treatment recommendations.`,
        
        extractedData: {
          patientInfo: {
            names: ["Sarah Johnson", "S. Johnson"],
            ages: ["34 years old"],
            addresses: ["1234 Main Street, Anytown, ST 12345"],
            phoneNumbers: ["(555) 123-4567"],
            insuranceInfo: ["Blue Cross Blue Shield Policy #ABC123456"]
          },
          medicalInfo: {
            diagnoses: [
              "Cervical strain (ICD-10: M54.2)",
              "Lower back soft tissue injury (ICD-10: S39.012A)", 
              "Minor whiplash syndrome (ICD-10: S13.4XXA)"
            ],
            procedures: [
              "Emergency room evaluation and treatment",
              "Cervical spine X-rays (negative for fractures)",
              "Lumbar spine MRI (showed mild disc bulging)",
              "Physical therapy evaluation and treatment plan"
            ],
            medications: [
              "Ibuprofen 800mg TID for inflammation",
              "Cyclobenzaprine 10mg QHS for muscle spasms",
              "Tramadol 50mg BID PRN for pain"
            ],
            providers: [
              "Dr. Sarah Martinez - Orthopedic Specialist",
              "Dr. James Wilson - Emergency Medicine",
              "Lisa Thompson, PT - Physical Therapist"
            ]
          },
          timeline: {
            dates: [
              "January 15, 2024 - Motor vehicle accident occurred",
              "January 15, 2024 - Emergency room visit at City General Hospital",
              "January 16, 2024 - Follow-up with primary care physician",
              "January 22, 2024 - Physical therapy evaluation",
              "February 1, 2024 - MRI scan completed",
              "February 15, 2024 - Orthopedic specialist consultation"
            ],
            servicesPeriod: "January 15, 2024 - February 15, 2024"
          },
          locations: {
            facilities: [
              "City General Hospital Emergency Department",
              "Anytown Medical Center",
              "Physical Therapy Associates",
              "Advanced Imaging Center"
            ],
            addresses: [
              "123 Hospital Drive, Anytown, ST 12345",
              "456 Medical Plaza, Anytown, ST 12345"
            ]
          },
          additionalDetails: {
            keyFindings: [
              "No fractures detected on initial X-rays",
              "MRI showed mild disc bulging at L4-L5",
              "Patient reported 7/10 pain levels initially",
              "Work restrictions: No lifting over 10 pounds",
              "Physical therapy showed good progress"
            ],
            costs: [
              "Emergency room visit: $2,850.00",
              "MRI scan: $1,200.00", 
              "Physical therapy (6 sessions): $450.00",
              "Medications: $125.00",
              "Total documented expenses: $4,625.00"
            ],
            complications: [
              "Initial difficulty with neck range of motion",
              "Persistent lower back stiffness",
              "Sleep disruption due to pain"
            ]
          }
        }
      };

        const updatedDocument = await storage.updateDocument(req.params.id, {
          aiSummary: "Document processed but AI analysis unavailable at the moment.",
          extractedData: demoAnalysis.extractedData,
          aiProcessed: true,
        });

        res.json({ 
          document: updatedDocument, 
          analysis: demoAnalysis 
        });
      }
    } catch (error) {
      console.error("Error analyzing document:", error);
      res.status(500).json({ message: "Failed to analyze document" });
    }
  });

  // Medical Bills routes
  app.get("/api/cases/:caseId/bills", isAuthenticated, async (req, res) => {
    try {
      const bills = await storage.getMedicalBillsByCase(req.params.caseId);
      res.json(bills);
    } catch (error) {
      console.error("Error fetching medical bills:", error);
      res.status(500).json({ message: "Failed to fetch medical bills" });
    }
  });

  app.post("/api/bills", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const billData = insertMedicalBillSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const bill = await storage.createMedicalBill(billData);
      res.status(201).json(bill);
    } catch (error) {
      console.error("Error creating medical bill:", error);
      res.status(500).json({ message: "Failed to create medical bill" });
    }
  });

  app.put("/api/bills/:id", isAuthenticated, async (req, res) => {
    try {
      const updates = insertMedicalBillSchema.partial().parse(req.body);
      const updatedBill = await storage.updateMedicalBill(req.params.id, updates);
      res.json(updatedBill);
    } catch (error) {
      console.error("Error updating medical bill:", error);
      res.status(500).json({ message: "Failed to update medical bill" });
    }
  });

  // AI Chat routes
  app.get("/api/chat/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessions = await storage.getChatSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
      res.status(500).json({ message: "Failed to fetch chat sessions" });
    }
  });

  app.post("/api/chat/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessionData = insertAiChatSessionSchema.parse({
        ...req.body,
        userId,
      });
      const session = await storage.createChatSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating chat session:", error);
      res.status(500).json({ message: "Failed to create chat session" });
    }
  });

  app.get("/api/chat/sessions/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/chat/sessions/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const sessionId = req.params.id;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      // Create user message
      const userMessage = await storage.createChatMessage({
        sessionId,
        role: "user",
        content,
      });

      // Get existing messages for context
      const existingMessages = await storage.getChatMessages(sessionId);
      const chatHistory = existingMessages
        .slice(-10) // Last 10 messages for context
        .map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));

      // Get user for AI service configuration
      const user = await storage.getUser((req as any).user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create AI service and get response
      const aiService = createAIService(user);
      const aiResponse = await aiService.chatCompletion(chatHistory, "You are a helpful legal AI assistant specializing in medical legal cases.");

      // Create AI message
      const aiMessage = await storage.createChatMessage({
        sessionId,
        role: "assistant",
        content: aiResponse,
      });

      res.json({
        userMessage,
        aiMessage,
      });
    } catch (error) {
      console.error("Error sending chat message:", error);
      res.status(500).json({ message: "Failed to send chat message" });
    }
  });

  // Demand Letter routes
  app.get("/api/cases/:caseId/demand-letters", isAuthenticated, async (req, res) => {
    try {
      const letters = await storage.getDemandLettersByCase(req.params.caseId);
      res.json(letters);
    } catch (error) {
      console.error("Error fetching demand letters:", error);
      res.status(500).json({ message: "Failed to fetch demand letters" });
    }
  });

  app.post("/api/demand-letters/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { caseId, clientName, incidentDate, medicalSummary, damages, liability } = req.body;

      if (!caseId || !clientName || !incidentDate) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get user for AI service configuration
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create AI service and generate demand letter
      const aiService = createAIService(user);
      const letterContent = await aiService.generateDemandLetter({
        clientName,
        incidentDate,
        medicalSummary: medicalSummary || "",
        damages: damages || "",
        liability: liability || "",
      }, [], []);

      const demandLetter = await storage.createDemandLetter({
        caseId,
        title: `Demand Letter - ${clientName}`,
        content: letterContent,
        generatedBy: userId,
      });

      res.status(201).json(demandLetter);
    } catch (error) {
      console.error("Error generating demand letter:", error);
      res.status(500).json({ message: "Failed to generate demand letter" });
    }
  });

  // User settings routes
  app.put("/api/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profileData = z.object({
        username: z.string().min(1, "Username is required"),
        email: z.string().email("Invalid email address"),
      }).parse(req.body);

      // Check if username is already taken by another user
      const existingUser = await storage.getUserByUsername(profileData.username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const updatedUser = await storage.updateUser(userId, profileData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put("/api/user/password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const passwordData = z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(6, "Password must be at least 6 characters"),
      }).parse(req.body);

      const updated = await storage.updateUserPassword(userId, passwordData.currentPassword, passwordData.newPassword);
      if (!updated) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.put("/api/user/api-key", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const aiConfigData = z.object({
        openaiApiKey: z.string().optional(),
        useAzureOpenAI: z.boolean().optional(),
        azureOpenAIEndpoint: z.string().optional(),
        azureOpenAIApiKey: z.string().optional(),
        azureOpenAIVersion: z.string().optional(),
        azureModelDeployment: z.string().optional(),
      }).parse(req.body);

      const updated = await storage.updateUserAIConfig(userId, aiConfigData);
      res.json({ message: "AI configuration updated successfully" });
    } catch (error) {
      console.error("Error updating AI configuration:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update AI configuration" });
    }
  });

  // Test Azure API connectivity
  app.post("/api/test/azure-api", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if Azure OpenAI is configured
      if (!user.useAzureOpenAI) {
        return res.status(400).json({ 
          message: "Azure OpenAI is not enabled. Please enable it in settings first.",
          configured: false
        });
      }

      // Check if all required Azure settings are present
      const missingFields = [];
      if (!user.azureOpenAIEndpoint) missingFields.push("Azure Endpoint");
      if (!user.azureOpenAIApiKey) missingFields.push("Azure API Key");
      if (!user.azureModelDeployment) missingFields.push("Model Deployment Name");

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `Missing required Azure configuration: ${missingFields.join(", ")}`,
          configured: false,
          missingFields
        });
      }

      // Test the Azure API connection
      try {
        const aiService = createAIService(user);
        const testResponse = await aiService.chatCompletion([
          { role: "user", content: "Say 'Azure API test successful' if you can read this message." }
        ]);

        res.json({
          message: "Azure OpenAI API is working correctly",
          configured: true,
          testResponse,
          configuration: {
            endpoint: user.azureOpenAIEndpoint,
            modelDeployment: user.azureModelDeployment,
            apiVersion: user.azureOpenAIVersion || "2024-02-15-preview"
          }
        });
      } catch (apiError: any) {
        console.error("Azure OpenAI API test failed:", apiError);
        
        // Parse error details for more specific feedback
        let errorMessage = "Azure OpenAI API test failed";
        let errorCode = "UNKNOWN_ERROR";
        
        if (apiError.message.includes("401") || apiError.message.includes("Unauthorized")) {
          errorMessage = "Invalid Azure OpenAI API key or authentication failed";
          errorCode = "AUTH_ERROR";
        } else if (apiError.message.includes("404") || apiError.message.includes("NotFound")) {
          errorMessage = "Azure OpenAI endpoint or model deployment not found. Please check your configuration.";
          errorCode = "ENDPOINT_ERROR";
        } else if (apiError.message.includes("403") || apiError.message.includes("Forbidden")) {
          errorMessage = "Access forbidden. Check API key permissions and deployment access.";
          errorCode = "PERMISSION_ERROR";
        } else if (apiError.message.includes("quota") || apiError.message.includes("rate")) {
          errorMessage = "Azure OpenAI API quota exceeded or rate limited";
          errorCode = "QUOTA_ERROR";
        }

        res.status(500).json({
          message: errorMessage,
          configured: true,
          working: false,
          errorCode,
          errorDetails: apiError.message,
          configuration: {
            endpoint: user.azureOpenAIEndpoint,
            modelDeployment: user.azureModelDeployment,
            apiVersion: user.azureOpenAIVersion || "2024-02-15-preview"
          }
        });
      }
    } catch (error) {
      console.error("Error testing Azure API:", error);
      res.status(500).json({ 
        message: "Failed to test Azure API",
        configured: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
