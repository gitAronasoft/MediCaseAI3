# Overview

LegalMed is a comprehensive medical case management platform designed for law firms handling medical legal cases. The application provides AI-powered document analysis, chronological bill review, intelligent demand letter generation, and an interactive AI document editor with chat interface for content modification and refinement. Built as a full-stack application with React frontend and Express backend, it streamlines the complex workflow of managing medical legal documentation and case analysis with advanced AI-powered document review and editing capabilities.

## Recent Changes (August 21, 2025)

✓ **Implemented AI Medical Bill Extraction** - Added comprehensive medical bill extraction from uploaded documents using Azure OpenAI and Document Intelligence
✓ **Automatic Medical Bill Processing** - Documents now automatically extract medical bills during upload and store them in database with same structure as existing bills
✓ **Medical Bills API Endpoints** - Created dedicated endpoint `/api/documents/:id/extract-bills` for extracting bills from existing documents
✓ **Enhanced Document Analysis Workflow** - Integrated medical bill extraction into the complete document processing pipeline (Upload → Extract Text → AI Analysis → Store Bills)
✓ **Database Integration** - Medical bills are automatically stored with proper relationships to cases and documents, following existing data structure
✓ **Bills Display Integration** - Extracted bills appear in Medical Bills page with same format as existing bills (provider, amount, dates, treatment, status)

Previous Changes (August 20, 2025):
✓ **Configured Document Intelligence Integration** - Implemented Azure Document Intelligence service for advanced document text extraction and analysis
✓ **Integrated Search Service** - Built comprehensive Azure Cognitive Search integration with full-text search, filtering, and autocomplete functionality
✓ **Enhanced OpenAI Integration** - Streamlined OpenAI service configuration with proper initialization and health monitoring
✓ **Added Search APIs** - Created REST endpoints for document search, suggestions, and intelligent content discovery
✓ **Implemented Enhanced Document Upload** - New upload endpoint that combines file storage, AI analysis, and automatic search indexing
✓ **Built Health Monitoring System** - Added service health checks for all Azure services with detailed status reporting
✓ **Enhanced AI Document Processing** - Integrated Document Intelligence with OpenAI for superior document analysis and data extraction

Previous Changes (August 14, 2025):
✓ **Fixed Create New Case functionality** - Resolved form validation issue where `createdBy` field was required but not provided by frontend
✓ **Enhanced form handling** - Properly configured form schema to exclude backend-only fields from frontend validation
✓ **Improved case creation workflow** - User ID is now automatically injected during case creation for proper data association
✓ **Form debugging and validation** - Added comprehensive error handling and validation feedback for better user experience
✓ **Implemented AI Prompts Configuration System** - Complete customizable AI prompt management with database schema, full CRUD APIs, and modern UI
✓ **Enhanced Settings Page** - Added new AI Prompts Configuration section with create, edit, delete, and organize functionality
✓ **Database Extensions** - Created ai_prompts table with proper relations and user-specific prompt management
✓ **API Infrastructure** - Built comprehensive REST endpoints for AI prompts with authentication and validation

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built with **React 18** using TypeScript and follows a component-based architecture:

- **UI Framework**: Utilizes shadcn/ui components built on Radix UI primitives for consistent, accessible design
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

The frontend follows a modular structure with dedicated components for different features like case management, document handling, medical bills, and AI assistance.

## Backend Architecture

The backend is built with **Express.js** and TypeScript:

- **Framework**: Express.js with middleware for JSON parsing, logging, and error handling
- **API Design**: RESTful API with organized route handlers for different resources
- **File Upload**: Multer for handling file uploads with memory storage
- **Validation**: Zod schemas for request/response validation
- **Error Handling**: Centralized error handling middleware with structured error responses

## Data Storage Solutions

**Database**: PostgreSQL with Drizzle ORM for type-safe database operations:
- **Schema Management**: Drizzle migrations with shared schema definitions
- **Connection**: Neon Database serverless driver for scalable PostgreSQL hosting
- **Session Storage**: PostgreSQL-based session storage for authentication

**Object Storage**: Google Cloud Storage integration:
- **File Management**: Direct-to-cloud uploads with presigned URLs
- **Access Control**: Custom ACL policy system for fine-grained object permissions
- **Replit Integration**: Uses Replit's sidecar service for GCS credentials

## Authentication and Authorization

**Authentication System**: Simple Username/Password Authentication:
- **Strategy**: Passport.js with Local Strategy using bcrypt password hashing
- **Session Management**: Express sessions with PostgreSQL storage  
- **User Management**: Manual user creation with secure password storage
- **Security**: HTTP-only cookies with secure flags and bcrypt password hashing

**Authorization**: Route-level authentication middleware with user context injection.

## External Dependencies

**AI Services**:
- **OpenAI GPT-4o**: Document analysis, content extraction, demand letter generation, and interactive chat
- **Azure Document Intelligence**: Advanced document text extraction, table detection, key-value pair extraction, and structured document analysis
- **Azure Cognitive Search**: Full-text search, intelligent filtering, autocomplete suggestions, and semantic search across all documents
- **Custom AI Features**: Medical timeline extraction, bill analysis, legal document summarization, and AI-powered document editing
- **Document Review System**: Interactive AI editor allowing users to modify, extract, and refine document content through natural language commands
- **AI Prompts Management**: Customizable prompt system allowing users to create, edit, and manage AI prompts for different tasks (document analysis, demand letters, chat system, document editing)
- **Integrated Processing Pipeline**: Seamless integration between Document Intelligence, OpenAI analysis, and search indexing for comprehensive document processing

**Cloud Services**:
- **Google Cloud Storage**: File storage with ACL-based access control
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Services**: Authentication provider and cloud credentials management

**File Upload**:
- **Uppy**: Modern file upload library with dashboard interface, progress tracking, and AWS S3 compatibility
- **Direct Upload**: Client-side uploads to GCS with backend-generated presigned URLs

**Development Tools**:
- **TypeScript**: Full-stack type safety with shared schemas
- **ESBuild**: Production bundling for server-side code
- **Drizzle Kit**: Database migration and introspection tools
- **Vite**: Frontend development server with HMR and build optimization

The architecture emphasizes type safety, scalability, and developer experience while providing a robust platform for medical legal case management with AI-powered assistance.