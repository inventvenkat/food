# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack recipe management application with a React frontend and Node.js/Express backend. The application is currently undergoing a migration from MongoDB to DynamoDB. Users can create, share, and manage recipes, with LLM-assisted recipe parsing as a key feature.

## Development Commands

### Local Development (Docker Compose)
```bash
# Start the full application stack (DynamoDB Local, server, client)
docker-compose up

# Initialize DynamoDB tables for local development
cd server && node config/init-dynamodb.js

# Access the application
# Frontend: http://localhost:3003
# Backend: http://localhost:3002
# DynamoDB Local: http://localhost:8000
```

### Frontend (React - client/)
```bash
cd client
npm install
npm start       # Development server on http://localhost:3000
npm test        # Run tests
npm run build   # Production build
```

### Backend (Node.js - server/)
```bash
cd server
npm install
npm start       # Development server with nodemon on port 3001
```

### Infrastructure (Terraform - terraform/)
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## Architecture

### Database Layer (DynamoDB Migration)
- **Current State**: Transitioning from MongoDB to DynamoDB
- **Models**: User, Recipe, RecipeCollection, MealPlan with single-table design
- **Key Pattern**: Uses composite keys (PK/SK) with GSI indexes for access patterns
- **Local Development**: DynamoDB Local via Docker
- **AWS Deployment**: Native DynamoDB with proper IAM roles

### Backend Structure
- **Framework**: Node.js with Express
- **Authentication**: JWT tokens via `authMiddleware.js`
- **File Uploads**: Multer for recipe images
- **Document Parsing**: Mammoth (DOCX) and pdf-parse (PDF) for recipe text extraction
- **Configuration**: Environment-based config with `db.js` handling DynamoDB client setup

### Frontend Structure
- **Framework**: React with functional components and hooks
- **Routing**: React Router v7
- **Styling**: Tailwind CSS
- **Rich Text**: Tiptap editor for recipe instructions
- **Key Feature**: LLM-assisted recipe parsing workflow in `CreateRecipePage.js`

### Key Features Implementation
1. **LLM-Assisted Recipe Parsing**: Primary recipe import method using external LLM with structured JSON prompts
2. **Audio Recipe Reading**: Web Speech API integration in `RecipeDetailPage.js`
3. **Recipe Collections**: User-created recipe collections with sharing capabilities
4. **Meal Planning**: Calendar-based meal planning with `react-big-calendar`
5. **Shopping Lists**: Generated from meal plans and recipes

## Database Migration Notes

The application is currently migrating from Mongoose/MongoDB to DynamoDB:
- DynamoDB models use single-table design with PK/SK pattern
- GSI indexes support various query patterns (by author, public recipes, categories)
- Environment variable `DYNAMODB_ENDPOINT_OVERRIDE` switches between local and AWS DynamoDB
- All models in `server/models/` have been converted to DynamoDB document operations

## Environment Configuration

### Required Environment Variables
```bash
# Server
JWT_SECRET=yourSuperSecretKeyForJWTs
APP_PORT=3001

# DynamoDB (Local Development)
DYNAMODB_ENDPOINT_OVERRIDE=http://dynamodb-local:8000
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
AWS_REGION=localhost

# DynamoDB (AWS Production)
AWS_REGION=us-east-1
# AWS credentials via IAM roles (no hardcoded keys)
```

## Testing and Quality

- Frontend testing with Jest and React Testing Library
- No specific backend test framework currently configured
- Docker health checks implemented for services
- Linting via ESLint (extends react-app configuration)

## Deployment

### CI/CD Pipeline (Jenkins)
- Automated Docker image building for client and server
- Image tagging with build numbers
- Push to Docker registry
- Configured for GitHub integration

### Infrastructure as Code (Terraform)
- AWS provider configuration with version pinning
- VPC, security groups, ALB, EC2, and DynamoDB table definitions
- Designed for scalable AWS deployment

## Important Implementation Details

### LLM Recipe Parsing Workflow
Located in `client/src/pages/CreateRecipePage.js`:
1. User clicks "Copy LLM Formatting Instructions"
2. App generates JSON schema prompt and copies to clipboard
3. User pastes prompt + recipe text into external LLM
4. User copies LLM's JSON output back to app
5. App parses JSON and populates form fields

### Rich Text Editor Integration
`RichTextEditor.js` uses Tiptap with special handling for programmatic content updates via `useEffect` to sync with external data sources.

### DynamoDB Access Patterns
- User recipes: GSI1 with `USER#<id>` as PK
- Public recipes: GSI2 with `PUBLIC#TRUE` as PK
- Category queries: GSI3 with `CATEGORY#<name>` as PK
- Composite sort keys enable time-based sorting