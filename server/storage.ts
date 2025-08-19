import {
  users,
  cases,
  documents,
  medicalBills,
  aiChatSessions,
  aiChatMessages,
  demandLetters,
  aiPrompts,
  type User,
  type InsertUser,
  type Case,
  type InsertCase,
  type Document,
  type InsertDocument,
  type MedicalBill,
  type InsertMedicalBill,
  type AiChatSession,
  type InsertAiChatSession,
  type AiChatMessage,
  type InsertAiChatMessage,
  type DemandLetter,
  type InsertDemandLetter,
  type AiPrompt,
  type InsertAiPrompt,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, asc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(userData: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  updateUserPassword(id: string, currentPassword: string, newPassword: string): Promise<boolean>;
  updateUserApiKey(id: string, apiKey: string): Promise<boolean>;
  updateUserAIConfig(id: string, config: any): Promise<boolean>;

  // Case operations
  createCase(caseData: InsertCase): Promise<Case>;
  getCases(userId: string): Promise<Case[]>;
  getCase(id: string): Promise<Case | undefined>;
  getCaseById(id: string): Promise<Case | undefined>;
  updateCase(id: string, updates: Partial<InsertCase>): Promise<Case>;
  deleteCase(id: string): Promise<void>;

  // Document operations
  createDocument(documentData: InsertDocument): Promise<Document>;
  getDocumentsByCase(caseId: string): Promise<Document[]>;
  getDocumentById(id: string): Promise<Document | undefined>;
  updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  // Medical Bill operations
  createMedicalBill(billData: InsertMedicalBill): Promise<MedicalBill>;
  getMedicalBillsByCase(caseId: string): Promise<MedicalBill[]>;
  getMedicalBillById(id: string): Promise<MedicalBill | undefined>;
  updateMedicalBill(id: string, updates: Partial<InsertMedicalBill>): Promise<MedicalBill>;
  deleteMedicalBill(id: string): Promise<void>;

  // AI Chat operations
  createChatSession(sessionData: InsertAiChatSession): Promise<AiChatSession>;
  getChatSessions(userId: string): Promise<AiChatSession[]>;
  getChatSessionById(id: string): Promise<AiChatSession | undefined>;
  createChatMessage(messageData: InsertAiChatMessage): Promise<AiChatMessage>;
  getChatMessages(sessionId: string): Promise<AiChatMessage[]>;

  // Demand Letter operations
  createDemandLetter(letterData: InsertDemandLetter): Promise<DemandLetter>;
  getDemandLettersByCase(caseId: string): Promise<DemandLetter[]>;
  getDemandLetterById(id: string): Promise<DemandLetter | undefined>;
  updateDemandLetter(id: string, updates: Partial<InsertDemandLetter>): Promise<DemandLetter>;

  // AI Prompt operations
  createAiPrompt(promptData: InsertAiPrompt): Promise<AiPrompt>;
  getAiPrompts(userId: string): Promise<AiPrompt[]>;
  getAiPromptById(id: string): Promise<AiPrompt | undefined>;
  getAiPromptByType(userId: string, type: string): Promise<AiPrompt | undefined>;
  updateAiPrompt(id: string, updates: Partial<InsertAiPrompt>): Promise<AiPrompt>;
  deleteAiPrompt(id: string): Promise<void>;

  // Statistics
  getDashboardStats(userId: string): Promise<{
    activeCases: number;
    pendingBills: string;
    documentsProcessed: number;
    aiExtractions: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPassword(id: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const { comparePasswords, hashPassword } = await import("./auth");
    
    // Get current user
    const user = await this.getUser(id);
    if (!user) return false;

    // Verify current password
    const isCurrentPasswordValid = await comparePasswords(currentPassword, user.password);
    if (!isCurrentPasswordValid) return false;

    // Hash new password and update
    const hashedNewPassword = await hashPassword(newPassword);
    await db
      .update(users)
      .set({ password: hashedNewPassword, updatedAt: new Date() })
      .where(eq(users.id, id));

    return true;
  }

  async updateUserApiKey(id: string, apiKey: string): Promise<boolean> {
    await db
      .update(users)
      .set({ openaiApiKey: apiKey, updatedAt: new Date() })
      .where(eq(users.id, id));

    return true;
  }

  async updateUserAIConfig(id: string, config: {
    openaiApiKey?: string;
    useAzureOpenAI?: boolean;
    azureOpenAIEndpoint?: string;
    azureOpenAIApiKey?: string;
    azureOpenAIVersion?: string;
    azureModelDeployment?: string;
  }): Promise<boolean> {
    await db
      .update(users)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(users.id, id));

    return true;
  }

  // Case operations
  async createCase(caseData: InsertCase): Promise<Case> {
    const [caseRecord] = await db.insert(cases).values(caseData).returning();
    return caseRecord;
  }

  async getCases(userId: string): Promise<Case[]> {
    return await db
      .select()
      .from(cases)
      .where(eq(cases.createdBy, userId))
      .orderBy(desc(cases.updatedAt));
  }

  async getCase(id: string): Promise<Case | undefined> {
    const [caseRecord] = await db.select().from(cases).where(eq(cases.id, id));
    return caseRecord;
  }

  async getCaseById(id: string): Promise<Case | undefined> {
    const [caseRecord] = await db.select().from(cases).where(eq(cases.id, id));
    return caseRecord;
  }

  async updateCase(id: string, updates: Partial<InsertCase>): Promise<Case> {
    const [caseRecord] = await db
      .update(cases)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cases.id, id))
      .returning();
    return caseRecord;
  }

  async deleteCase(id: string): Promise<void> {
    await db.delete(cases).where(eq(cases.id, id));
  }

  // Document operations
  async createDocument(documentData: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(documentData).returning();
    return document;
  }

  async getDocumentsByCase(caseId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.caseId, caseId))
      .orderBy(desc(documents.createdAt));
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.uploadedBy, userId))
      .orderBy(desc(documents.createdAt));
  }

  async getDocumentById(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document> {
    const [document] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Medical Bill operations
  async createMedicalBill(billData: InsertMedicalBill): Promise<MedicalBill> {
    const [bill] = await db.insert(medicalBills).values(billData).returning();
    return bill;
  }

  async getMedicalBillsByCase(caseId: string): Promise<MedicalBill[]> {
    return await db
      .select()
      .from(medicalBills)
      .where(eq(medicalBills.caseId, caseId))
      .orderBy(asc(medicalBills.serviceDate));
  }

  async getMedicalBillById(id: string): Promise<MedicalBill | undefined> {
    const [bill] = await db.select().from(medicalBills).where(eq(medicalBills.id, id));
    return bill;
  }

  async updateMedicalBill(id: string, updates: Partial<InsertMedicalBill>): Promise<MedicalBill> {
    const [bill] = await db
      .update(medicalBills)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(medicalBills.id, id))
      .returning();
    return bill;
  }

  async deleteMedicalBill(id: string): Promise<void> {
    await db.delete(medicalBills).where(eq(medicalBills.id, id));
  }

  // AI Chat operations
  async createChatSession(sessionData: InsertAiChatSession): Promise<AiChatSession> {
    const [session] = await db.insert(aiChatSessions).values(sessionData).returning();
    return session;
  }

  async getChatSessions(userId: string): Promise<AiChatSession[]> {
    return await db
      .select()
      .from(aiChatSessions)
      .where(eq(aiChatSessions.userId, userId))
      .orderBy(desc(aiChatSessions.updatedAt));
  }

  async getChatSessionById(id: string): Promise<AiChatSession | undefined> {
    const [session] = await db.select().from(aiChatSessions).where(eq(aiChatSessions.id, id));
    return session;
  }

  async createChatMessage(messageData: InsertAiChatMessage): Promise<AiChatMessage> {
    const [message] = await db.insert(aiChatMessages).values(messageData).returning();
    return message;
  }

  async getChatMessages(sessionId: string): Promise<AiChatMessage[]> {
    return await db
      .select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.sessionId, sessionId))
      .orderBy(asc(aiChatMessages.createdAt));
  }

  // Demand Letter operations
  async createDemandLetter(letterData: InsertDemandLetter): Promise<DemandLetter> {
    const [letter] = await db.insert(demandLetters).values(letterData).returning();
    return letter;
  }

  async getDemandLettersByCase(caseId: string): Promise<DemandLetter[]> {
    return await db
      .select()
      .from(demandLetters)
      .where(eq(demandLetters.caseId, caseId))
      .orderBy(desc(demandLetters.createdAt));
  }

  async getDemandLetterById(id: string): Promise<DemandLetter | undefined> {
    const [letter] = await db.select().from(demandLetters).where(eq(demandLetters.id, id));
    return letter;
  }

  async updateDemandLetter(id: string, updates: Partial<InsertDemandLetter>): Promise<DemandLetter> {
    const [letter] = await db
      .update(demandLetters)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(demandLetters.id, id))
      .returning();
    return letter;
  }

  // AI Prompt operations
  async createAiPrompt(promptData: InsertAiPrompt): Promise<AiPrompt> {
    const [prompt] = await db.insert(aiPrompts).values(promptData).returning();
    return prompt;
  }

  async getAiPrompts(userId: string): Promise<AiPrompt[]> {
    return await db
      .select()
      .from(aiPrompts)
      .where(eq(aiPrompts.userId, userId))
      .orderBy(desc(aiPrompts.createdAt));
  }

  async getAiPromptById(id: string): Promise<AiPrompt | undefined> {
    const [prompt] = await db
      .select()
      .from(aiPrompts)
      .where(eq(aiPrompts.id, id));
    return prompt;
  }

  async getAiPromptByType(userId: string, type: string): Promise<AiPrompt | undefined> {
    const [prompt] = await db
      .select()
      .from(aiPrompts)
      .where(and(eq(aiPrompts.userId, userId), eq(aiPrompts.type, type), eq(aiPrompts.isActive, true)))
      .orderBy(desc(aiPrompts.isDefault), desc(aiPrompts.createdAt));
    return prompt;
  }

  async updateAiPrompt(id: string, updates: Partial<InsertAiPrompt>): Promise<AiPrompt> {
    const [prompt] = await db
      .update(aiPrompts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aiPrompts.id, id))
      .returning();
    return prompt;
  }

  async deleteAiPrompt(id: string): Promise<void> {
    await db.delete(aiPrompts).where(eq(aiPrompts.id, id));
  }

  // Statistics
  async getDashboardStats(userId: string): Promise<{
    activeCases: number;
    pendingBills: string;
    documentsProcessed: number;
    aiExtractions: number;
  }> {
    // Get active cases count
    const userCases = await db
      .select()
      .from(cases)
      .where(and(eq(cases.createdBy, userId), eq(cases.status, "active")));

    const activeCases = userCases.length;

    // Get pending bills total
    const caseIds = userCases.map(c => c.id);
    let pendingBillsTotal = 0;

    if (caseIds.length > 0) {
      const billsQuery = await db
        .select()
        .from(medicalBills)
        .where(and(
          eq(medicalBills.status, "pending")
        ));

      const relevantBills = billsQuery.filter(bill => caseIds.includes(bill.caseId));
      pendingBillsTotal = relevantBills.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
    }

    // Get documents processed count
    let documentsProcessed = 0;
    if (caseIds.length > 0) {
      const docsQuery = await db
        .select()
        .from(documents)
        .where(eq(documents.aiProcessed, true));

      documentsProcessed = docsQuery.filter(doc => caseIds.includes(doc.caseId)).length;
    }

    // Get AI extractions count (same as documents processed)
    const aiExtractions = documentsProcessed;

    return {
      activeCases,
      pendingBills: `$${pendingBillsTotal.toLocaleString()}`,
      documentsProcessed,
      aiExtractions,
    };
  }
}

export const storage = new DatabaseStorage();
