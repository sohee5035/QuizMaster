# KB 외환 마스터 연습 앱

## Overview

This is a Korean language web application designed for practicing KB Foreign Exchange Master exam questions. The app provides an interactive learning platform with multiple-choice questions (MCQ) and true/false (OX) questions, featuring randomized answer choices, explanations after each answer, and progress tracking through a sequential question flow.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built using Vite for fast development and optimized builds
- **UI Components**: Shadcn/ui component library with Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS variables for theming, configured with Korean fonts (Noto Sans KR, Open Sans)
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Client-side state-based navigation using React state instead of traditional routing

### Backend Architecture
- **Framework**: Express.js with TypeScript, serving both API endpoints and static assets
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: In-memory storage for question sessions and user responses
- **API Design**: RESTful endpoints for session management, question retrieval, and answer submission

### Data Architecture
- **Questions Table**: Stores question content, type (MCQ/OX), explanations, difficulty, and metadata
- **Choices Table**: Stores multiple-choice options linked to questions with correctness flags
- **Sessions Table**: Tracks user learning sessions with different modes (study, mock, review)
- **Responses Table**: Records user answers and correctness for session analytics

### Key Features
- **Question Randomization**: Fisher-Yates shuffle algorithm for randomizing choice order in MCQ questions
- **Progressive Learning**: Sequential question flow with mandatory explanation review before proceeding
- **Answer Validation**: Immediate feedback with visual indicators for correct/incorrect answers
- **Session Tracking**: Persistent session state allowing users to continue where they left off

### Database Schema Design
- Questions support both MCQ (multiple choice) and OX (true/false) types in a single table
- Flexible tagging system for question categorization
- Foreign key relationships ensuring data integrity between questions, choices, and responses

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL driver for Neon database connections
- **drizzle-orm**: Type-safe SQL ORM for database operations with schema validation
- **drizzle-kit**: Database migration and schema management tools

### UI and Styling
- **@radix-ui/***: Comprehensive set of accessible UI primitives for complex components
- **tailwindcss**: Utility-first CSS framework with custom configuration for Korean typography
- **class-variance-authority**: Utility for creating variant-based component APIs
- **lucide-react**: Icon library providing consistent iconography

### State Management and Data Fetching
- **@tanstack/react-query**: Server state management with caching, background updates, and error handling
- **react-hook-form** and **@hookform/resolvers**: Form state management with validation support

### Development Tools
- **vite**: Fast build tool with hot module replacement and optimized production builds
- **typescript**: Static type checking for enhanced developer experience and code reliability
- **esbuild**: Fast JavaScript bundler for server-side build processes

### Database Configuration
- Configured for PostgreSQL dialect with environment-based connection strings
- Migration files stored in `./migrations` directory with schema defined in `./shared/schema.ts`
- Supports both development and production database environments