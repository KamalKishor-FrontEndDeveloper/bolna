# Bolna.ai Dashboard

## Overview

This is a web-based dashboard for managing Bolna.ai voice agents. The application allows users to create, configure, and manage AI voice agents, initiate outbound phone calls, and view execution history. It serves as a frontend interface that proxies requests to the Bolna.ai API, with API key management stored in a PostgreSQL database.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for page transitions
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite with path aliases (@/ for client/src, @shared/ for shared)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Design**: RESTful endpoints with Zod schema validation
- **Pattern**: The server acts as a proxy to the Bolna.ai external API, storing API keys securely in the database

### Project Structure
```
├── client/           # React frontend
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Route pages (Dashboard, Agents, Calls, etc.)
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Utilities and query client
├── server/           # Express backend
│   ├── lib/          # Service classes (Bolna API wrapper)
│   └── routes.ts     # API route definitions
├── shared/           # Shared code between client/server
│   ├── schema.ts     # Drizzle schema + Zod types
│   └── routes.ts     # API route contracts
└── migrations/       # Database migrations
```

### Key Design Decisions
1. **Proxy Pattern**: The backend proxies all Bolna API calls rather than exposing API keys to the frontend
2. **Shared Types**: Schema definitions in `shared/` ensure type safety across frontend and backend
3. **Component Library**: Uses shadcn/ui components for consistent, accessible UI elements
4. **API Key Storage**: Keys are stored encrypted in PostgreSQL, never exposed to the client

## External Dependencies

### Database
- **PostgreSQL**: Primary data store (connection via DATABASE_URL environment variable)
- **Drizzle ORM**: Type-safe database operations with push migrations (`npm run db:push`)

### Third-Party APIs
- **Bolna.ai API** (https://api.bolna.ai): Voice agent management and phone call initiation
  - Requires BOLNA_API_KEY stored in the database
  - Endpoints: Agent CRUD, phone calls, execution history

### Key npm Packages
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema validation
- `express`: HTTP server framework
- `framer-motion`: Animation library
- `react-hook-form`: Form state management
- `zod`: Runtime type validation
- `wouter`: Client-side routing
- Full shadcn/ui component suite (@radix-ui primitives)