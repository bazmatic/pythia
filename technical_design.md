# Technical Design Document: RV Investor

## Project Overview
RV Investor is a Next.js-based web application that implements an investment decision-making system with AI-powered judgment capabilities. The application uses a modern tech stack with TypeScript, React, and various AI/ML services.

## Architecture

### Technology Stack
- **Frontend Framework**: Next.js 14.2.5
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (via Supabase)
- **AI Services**: 
  - Anthropic Claude
  - OpenAI
- **Dependency Injection**: Inversify
- **Blockchain Integration**: Ethers.js, Uniswap SDK
- **API Documentation**: Swagger/OpenAPI

### Core Components

#### 1. Session Management
- Handles user interaction flow through various states (New → Unjudged → Judged → Investing → Resolved)
- Manages image-based decision making
- Tracks user choices and investment outcomes

#### 2. Investment System
- Supports multiple investment strategies
- Integrates with external investment providers
- Tracks investment status (Pending → Active → Completed)
- Handles investment execution and resolution

#### 3. AI Judgment System
- Implements judgment providers for decision-making
- Uses Claude AI for image comparison and decision validation
- Provides feedback on investment choices

#### 4. Database Layer
- PostgreSQL database with Supabase integration
- Implements repository pattern for data access
- Supports CRUD operations for sessions and investments

### Key Interfaces

#### Database Service (`IDbService`)
```typescript
interface IDbService {
    getItem<T extends Identifiable>(collectionName: CollectionName, id: string): Promise<T | null>;
    getAllItems<T extends Identifiable>(collectionName: CollectionName): Promise<T[]>;
    query<T extends Identifiable>(collectionName: CollectionName, query: Partial<T>): Promise<T[]>;
    deleteItem(collectionName: CollectionName, id: string): Promise<void>;
    saveItem<T extends Identifiable>(collectionName: CollectionName, item: T): Promise<void>;   
}
```

#### Session Service (`ISessionService`)
```typescript
interface ISessionService {
    createSession(): Promise<Session>;
    activateSession(sessionId: string, impressionText: string): Promise<void>;
    judgeSession(sessionId: string): Promise<void>;
    executeInvestment(sessionId: string): Promise<void>;
    resolveInvestment(sessionId: string): Promise<void>;
    shownFeedback(sessionId: string): Promise<void>;
    getSession(sessionId: string): Promise<Session>;
    getSessions(): Promise<Session[]>;
}
```

### Data Models

#### Session
- Represents a user interaction session
- Tracks images, choices, and investment decisions
- Maintains state through `SessionStatus` enum

#### Investment
- Represents an investment decision
- Contains multiple strategies
- Tracks status through `InvestmentStatus` enum

## Development Guidelines

### Type Safety
- Strict TypeScript configuration
- Explicit type definitions for all interfaces and models
- Use of generics for type-safe database operations

### Dependency Injection
- Uses Inversify for dependency management
- Service tokens defined in `INVERSIFY_TOKENS`
- Promotes loose coupling and testability

### State Management
- Session-based state tracking
- Clear state transitions through `SessionStatus` enum
- Investment state management through `InvestmentStatus` enum

## Deployment
- Run DB via `docker-compose.yml`
- Environment configuration through `.env` files
- Port: 4318

## Security Considerations
- Environment variable management
- API key handling for AI services
- Database access control through Supabase

## Monitoring and Maintenance
- Swagger documentation for API endpoints
- Logging of investment decisions and AI judgments
- Session statistics tracking

## Future Considerations
- Make this multi-user
- Join investment system
- Make decisions based on weighting successful RV-ers
- Join as an investor or RV-er
- Receive dividends based on your contribution, smart-contract based?
