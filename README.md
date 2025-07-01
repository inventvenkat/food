# Recipe Management Application

A full-stack recipe management application with LLM-assisted recipe parsing, built with React frontend and Node.js/Express backend using DynamoDB.

## Features

- **LLM-Assisted Recipe Parsing**: Import recipes using external LLM with structured JSON prompts
- **Audio Recipe Reading**: Web Speech API integration for hands-free cooking
- **Recipe Collections**: Create and share recipe collections
- **Meal Planning**: Calendar-based meal planning with shopping list generation
- **Rich Text Editor**: Tiptap editor for detailed recipe instructions
- **File Upload Support**: Import recipes from DOCX and PDF files

## Architecture

- **Frontend**: React with Tailwind CSS
- **Backend**: Node.js/Express with JWT authentication
- **Database**: DynamoDB (migrated from MongoDB)
- **Infrastructure**: AWS with Terraform IaC
- **Deployment**: Docker containers with CI/CD pipeline

## Local Development

### Prerequisites

- Docker and Docker Compose
- Node.js 16+ (for local development without Docker)
- AWS CLI (for production deployment)

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd recipe-management-app
   ```

2. **Start the application stack**
   ```bash
   docker-compose up
   ```

3. **Initialize DynamoDB tables**
   ```bash
   cd server && node config/init-dynamodb.js
   ```

4. **Access the application**
   - Frontend: http://localhost:3003
   - Backend API: http://localhost:3002
   - DynamoDB Local Admin: http://localhost:8000

### Local Development without Docker

#### Backend Setup

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set environment variables**
   ```bash
   # Create .env file
   JWT_SECRET=yourSuperSecretKeyForJWTs
   APP_PORT=3001
   DYNAMODB_ENDPOINT_OVERRIDE=http://localhost:8000
   AWS_ACCESS_KEY_ID=dummy
   AWS_SECRET_ACCESS_KEY=dummy
   AWS_REGION=localhost
   ```

4. **Start DynamoDB Local**
   ```bash
   docker run -p 8000:8000 amazon/dynamodb-local
   ```

5. **Initialize database tables**
   ```bash
   node config/init-dynamodb.js
   ```

6. **Start the server**
   ```bash
   npm start
   ```

#### Frontend Setup

1. **Navigate to client directory**
   ```bash
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Development Commands

```bash
# Frontend
cd client
npm test              # Run tests
npm run build         # Production build
npm run lint          # Lint code

# Backend
cd server
npm start             # Development server with nodemon
npm test              # Run tests (if configured)

# Infrastructure
cd terraform
terraform init        # Initialize Terraform
terraform plan        # Plan infrastructure changes
terraform apply       # Apply infrastructure changes
```

## Production Deployment

### AWS Infrastructure Setup

1. **Configure AWS credentials**
   ```bash
   aws configure
   ```

2. **Deploy infrastructure with Terraform**
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

3. **Set production environment variables**
   ```bash
   # Required for production
   JWT_SECRET=<secure-random-string>
   AWS_REGION=us-east-1
   # AWS credentials handled via IAM roles
   ```

### Docker Deployment

#### Build Images

```bash
# Build backend image
cd server
docker build -t recipe-backend .

# Build frontend image
cd client
docker build -t recipe-frontend .
```

#### Deploy with Docker Compose (Production)

```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d
```

### CI/CD Pipeline

The application includes a Jenkins pipeline configuration:

1. **Automated Docker image building**
2. **Image tagging with build numbers**
3. **Push to Docker registry**
4. **Deployment to production environment**

### Environment Variables

#### Development
```bash
# Server
JWT_SECRET=yourSuperSecretKeyForJWTs
APP_PORT=3001
DYNAMODB_ENDPOINT_OVERRIDE=http://dynamodb-local:8000
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
AWS_REGION=localhost
```

#### Production
```bash
# Server
JWT_SECRET=<secure-production-secret>
AWS_REGION=us-east-1
# AWS credentials via IAM roles (no hardcoded keys)
```

## Database

### DynamoDB Single-Table Design

The application uses DynamoDB with a single-table design pattern:

- **Primary Key**: Composite PK/SK pattern
- **GSI Indexes**: Support various access patterns
  - GSI1: User recipes (`USER#<id>`)
  - GSI2: Public recipes (`PUBLIC#TRUE`)
  - GSI3: Category queries (`CATEGORY#<name>`)

### Data Models

- **User**: Authentication and profile data
- **Recipe**: Recipe content with rich text instructions
- **RecipeCollection**: User-created recipe collections
- **MealPlan**: Calendar-based meal planning

## LLM Recipe Parsing Workflow

1. User clicks "Copy LLM Formatting Instructions"
2. App generates JSON schema prompt and copies to clipboard
3. User pastes prompt + recipe text into external LLM
4. User copies LLM's JSON output back to app
5. App parses JSON and populates form fields

## Troubleshooting

### Common Issues

1. **DynamoDB Connection Issues**
   - Ensure DynamoDB Local is running on port 8000
   - Check AWS credentials configuration
   - Verify `DYNAMODB_ENDPOINT_OVERRIDE` environment variable

2. **Docker Permission Issues**
   - Run the permissions fix script: `./scripts/fix-dynamodb-permissions.sh`
   - Ensure Docker has proper file system permissions

3. **Frontend Build Issues**
   - Clear node_modules and reinstall dependencies
   - Check Node.js version compatibility (16+)

4. **Backend API Issues**
   - Verify environment variables are set correctly
   - Check DynamoDB table initialization
   - Review server logs for authentication errors

### Health Checks

- Backend health: `GET /health`
- Frontend build: Check console for compilation errors
- DynamoDB: Verify tables exist with AWS CLI or DynamoDB Local admin

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the existing code style
4. Test locally with Docker Compose
5. Submit a pull request

## License

[Add your license information here]