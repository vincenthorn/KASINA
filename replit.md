# KASINA Meditation Platform

## Overview

KASINA is a full-stack meditation application focused on kasina meditation practices with 3D visualization, user management, and session tracking. The platform features immersive meditation experiences, admin dashboard functionality, and user subscription management.

## System Architecture

The application follows a monorepo structure with a client-server architecture:

- **Frontend**: React application built with Vite, featuring 3D meditation environments using Three.js
- **Backend**: Express.js server with PostgreSQL database integration
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Deployment**: Configured for Render.com with auto-deployment capabilities

## Key Components

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **3D Graphics**: Three.js with React Three Fiber for immersive meditation environments
- **UI Components**: Radix UI with Tailwind CSS for modern, accessible interface
- **State Management**: Zustand for client-side state management
- **Query Management**: TanStack Query for server state management

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database ORM**: Drizzle for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL store
- **Authentication**: Custom session-based authentication with subscription tiers
- **File Handling**: Multer for file uploads and CSV processing

### Database Schema
- **Users Table**: Email-based user management with subscription types (freemium, premium, admin)
- **Sessions Table**: Meditation session tracking with duration and kasina type
- **Kasina Breakdowns**: Detailed meditation practice analytics

## Data Flow

1. **User Authentication**: Session-based authentication with subscription validation
2. **Meditation Sessions**: Real-time session tracking with 3D visualization
3. **Data Persistence**: Meditation sessions stored with user association and practice analytics
4. **Admin Dashboard**: Real-time user analytics and subscription management
5. **CSV Import/Export**: Bulk user management capabilities for admin operations

## External Dependencies

### Core Dependencies
- **Database**: PostgreSQL (Neon.tech for development, Render PostgreSQL for production)
- **3D Rendering**: Three.js ecosystem (@react-three/fiber, @react-three/drei, @react-three/postprocessing)
- **UI Framework**: Radix UI components with Tailwind CSS styling
- **Development**: TypeScript, Vite, ESBuild for fast development and builds

### Third-Party Integrations
- **Font Loading**: Fontsource for Inter and Nunito fonts
- **Icons**: Lucide React for consistent iconography
- **Utilities**: Various utility libraries for date handling, validation, and formatting

## Deployment Strategy

### Development Environment
- **Platform**: Replit with live development server
- **Database**: Neon.tech PostgreSQL instance
- **Hot Reload**: Vite development server with fast refresh

### Production Environment
- **Platform**: Render.com with auto-deployment from GitHub
- **Database**: Render PostgreSQL with SSL connections
- **Build Process**: Automated builds triggered by git commits
- **Session Storage**: PostgreSQL-backed session store for scalability

### Build Configuration
- **Client Build**: Vite optimized build with code splitting and asset optimization
- **Server Build**: ESBuild compilation with external package handling
- **Static Assets**: Efficient serving of built assets through Express

## Changelog

Changelog:
- June 19, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.