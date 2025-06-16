# Kasina Meditation App

## Overview

Kasina is a meditation application that provides immersive visual kasina meditation experiences through 3D environments. The application combines a React frontend with a Node.js backend, featuring user authentication, meditation session tracking, and administrative functionality. The project is designed as a full-stack web application with modern technologies for both development and production deployment.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **3D Graphics**: Three.js via @react-three/fiber and @react-three/drei
- **UI Components**: Custom components built with Radix UI primitives
- **Styling**: Tailwind CSS with custom color schemes
- **State Management**: Zustand for client-side state
- **Data Fetching**: TanStack React Query for server state management
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Express-session with PostgreSQL session store
- **Authentication**: Session-based authentication with email-based user identification
- **File Upload**: Multer for handling file uploads (CSV imports)

### Database Schema
- **Users Table**: Stores user information including email, name, subscription type, and timestamps
- **Sessions Table**: Tracks meditation sessions with user email, kasina type, duration, and timestamps
- **Kasina Breakdowns Table**: Detailed breakdown data for meditation sessions

## Key Components

### Meditation System
- **Visual Kasinas**: Earth, Water, Fire, Air, Space, Light, and custom color variations
- **Musical Kasina**: Admin-only Spotify-integrated music-synchronized meditation
- 3D rendering with custom shaders for immersive visual experiences
- Session timer with configurable durations
- Session persistence and analytics

### Musical Kasina Features
- Breath Mode toggle: orb expands/contracts with breath or remains steady
- Real-time Spotify integration with Web Playbook SDK
- Audio analysis with beat detection and section change monitoring
- Music-driven background visuals responding to valence and energy
- Enhanced color transitions based on musical sections
- Audio analysis caching for rate limiting optimization
- Playlist selection interface for seamless music control
- Session management with automatic ending when music stops

### User Management
- Email-based user identification
- Subscription tiers: freemium, premium, admin
- CSV-based user import system for bulk user management
- Whitelist functionality for access control

### Administrative Dashboard
- Real-time user statistics and session analytics
- Bulk user import capabilities
- Practice time tracking and reporting
- Community video management

### 3D Visualization
- Custom Three.js scenes for each kasina type
- Shader-based visual effects for realistic representations
- Responsive design for various screen sizes
- Performance optimizations for smooth meditation experiences

## Data Flow

1. **User Authentication**: Users are identified by email and stored in sessions
2. **Meditation Flow**: User selects kasina type → 3D scene loads → Timer tracks session → Data persists to database
3. **Admin Operations**: Administrators can view analytics, import users, and manage content
4. **Database Persistence**: All user actions and meditation data are stored in PostgreSQL

## External Dependencies

### Production Services
- **Database**: PostgreSQL (currently using Render PostgreSQL)
- **Deployment**: Configured for Render platform deployment
- **Session Storage**: PostgreSQL-backed session management

### Third-Party Libraries
- **@react-three/fiber**: React renderer for Three.js
- **@radix-ui/***: Accessible UI component primitives
- **@tanstack/react-query**: Server state management
- **drizzle-orm**: Type-safe database operations
- **pg**: PostgreSQL client for Node.js

### Development Tools
- **TypeScript**: Type safety across frontend and backend
- **Vite**: Modern build tooling
- **ESBuild**: Fast JavaScript bundling
- **Tailwind CSS**: Utility-first CSS framework

## Deployment Strategy

### Build Process
- Frontend builds to `dist/` directory via Vite
- Backend bundles to `dist/index.js` via ESBuild
- Static assets served through Express in production

### Environment Configuration
- Development uses local PostgreSQL or Replit database
- Production uses Render PostgreSQL with SSL connections
- Environment variables manage database URLs and session secrets

### Platform Deployment
- Configured for Render platform deployment
- Auto-deployment from Git repository
- Health checks via administrative endpoints

## Changelog

Changelog:
- June 15, 2025: Updated Breath Kasina page design to match Musical Kasina styling with centered card layout and feature icons
- June 15, 2025: Implemented full-screen meditation interface for Musical Kasina Visual and Breath modes with immersive UI
- June 15, 2025: Enhanced Musical Kasina with full-screen immersive landing page and mode selection interface
- June 15, 2025: Restructured Musical Kasina UX flow to match Breath Kasina pattern (landing → connection → mode selection → meditation)
- June 15, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.