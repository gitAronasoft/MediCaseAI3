import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  varchar,
  timestamp,
  decimal,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User table for simple login authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  openaiApiKey: text("openai_api_key"),
  useAzureOpenAI: boolean("use_azure_openai").default(false),
  azureOpenAIEndpoint: text("azure_openai_endpoint"),
  azureOpenAIApiKey: text("azure_openai_api_key"),
  azureOpenAIVersion: text("azure_openai_version").default("2024-02-15-preview"),
  azureModelDeployment: text("azure_model_deployment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiPrompts = pgTable("ai_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // 'document_analysis', 'demand_letter', 'chat_system', 'document_editing'
  prompt: text("prompt").notNull(),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientName: text("client_name").notNull(),
  caseNumber: varchar("case_number").notNull().unique(),
  caseType: text("case_type").notNull(),
  status: varchar("status").notNull().default("active"),
  description: text("description"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  objectPath: text("object_path").notNull(),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  aiProcessed: boolean("ai_processed").default(false),
  aiSummary: text("ai_summary"),
  extractedData: jsonb("extracted_data"),
  
  // Enhanced Azure workflow metadata
  processingStatus: varchar("processing_status").default("uploaded"), // 'uploaded', 'analyzing', 'processed', 'error'
  documentIntelligence: jsonb("document_intelligence"), // Store Document Intelligence results
  vectorEmbedding: jsonb("vector_embedding"), // Store embedding metadata
  searchIndexed: boolean("search_indexed").default(false),
  searchIndexedAt: timestamp("search_indexed_at"),
  processingErrors: jsonb("processing_errors"), // Store any processing errors
  lastProcessedAt: timestamp("last_processed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const medicalBills = pgTable("medical_bills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  serviceDate: timestamp("service_date").notNull(),
  billDate: timestamp("bill_date").notNull(),
  treatment: text("treatment"),
  insurance: text("insurance"),
  status: varchar("status").notNull().default("pending"),
  documentId: varchar("document_id").references(() => documents.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiChatSessions = pgTable("ai_chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiChatMessages = pgTable("ai_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => aiChatSessions.id, { onDelete: "cascade" }),
  role: varchar("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const demandLetters = pgTable("demand_letters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  generatedBy: varchar("generated_by").notNull().references(() => users.id),
  status: varchar("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const casesRelations = relations(cases, ({ one, many }) => ({
  createdBy: one(users, { fields: [cases.createdBy], references: [users.id] }),
  documents: many(documents),
  medicalBills: many(medicalBills),
  aiChatSessions: many(aiChatSessions),
  demandLetters: many(demandLetters),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  case: one(cases, { fields: [documents.caseId], references: [cases.id] }),
  uploadedBy: one(users, { fields: [documents.uploadedBy], references: [users.id] }),
}));

export const medicalBillsRelations = relations(medicalBills, ({ one }) => ({
  case: one(cases, { fields: [medicalBills.caseId], references: [cases.id] }),
  document: one(documents, { fields: [medicalBills.documentId], references: [documents.id] }),
  createdBy: one(users, { fields: [medicalBills.createdBy], references: [users.id] }),
}));

export const aiChatSessionsRelations = relations(aiChatSessions, ({ one, many }) => ({
  case: one(cases, { fields: [aiChatSessions.caseId], references: [cases.id] }),
  user: one(users, { fields: [aiChatSessions.userId], references: [users.id] }),
  messages: many(aiChatMessages),
}));

export const aiChatMessagesRelations = relations(aiChatMessages, ({ one }) => ({
  session: one(aiChatSessions, { fields: [aiChatMessages.sessionId], references: [aiChatSessions.id] }),
}));

export const demandLettersRelations = relations(demandLetters, ({ one }) => ({
  case: one(cases, { fields: [demandLetters.caseId], references: [cases.id] }),
  generatedBy: one(users, { fields: [demandLetters.generatedBy], references: [users.id] }),
}));

export const aiPromptsRelations = relations(aiPrompts, ({ one }) => ({
  user: one(users, { fields: [aiPrompts.userId], references: [users.id] }),
}));

// Insert schemas
export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertMedicalBillSchema = createInsertSchema(medicalBills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiChatSessionSchema = createInsertSchema(aiChatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiChatMessageSchema = createInsertSchema(aiChatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertDemandLetterSchema = createInsertSchema(demandLetters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiPromptSchema = createInsertSchema(aiPrompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof cases.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertMedicalBill = z.infer<typeof insertMedicalBillSchema>;
export type MedicalBill = typeof medicalBills.$inferSelect;
export type InsertAiChatSession = z.infer<typeof insertAiChatSessionSchema>;
export type AiChatSession = typeof aiChatSessions.$inferSelect;
export type InsertAiChatMessage = z.infer<typeof insertAiChatMessageSchema>;
export type AiChatMessage = typeof aiChatMessages.$inferSelect;
export type InsertDemandLetter = z.infer<typeof insertDemandLetterSchema>;
export type DemandLetter = typeof demandLetters.$inferSelect;
export type InsertAiPrompt = z.infer<typeof insertAiPromptSchema>;
export type AiPrompt = typeof aiPrompts.$inferSelect;
