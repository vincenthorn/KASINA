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
- June 26, 2025: Updated admin interface to support Friend user type in CSV uploads. Added Friend Users option to upload section and display cards. Fixed phong@phong.com and nathan@nathanvansynder.com as Friend users in development database (7 total Friend users). Production database requires manual CSV upload via admin interface with properly formatted CSV file.
- June 25, 2025: Attempted to add nathan@nathanvansynder.com as Friend user. Successfully added to development database but production database at start.kasina.app requires manual admin interface addition due to separate database instances. Fixed Space and Light kasina shaders to render as perfect spheres by removing all lighting effects causing warped appearance. Resolved elemental kasina background color issue by removing immersion background spheres and fixing Three.js clear color overrides.
- June 24, 2025: Successfully imported 1,364 new freemium subscribers from CSV to production database (start.kasina.app). Production database now contains 2,808 freemium users, 20 premium users, and 1 admin user (2,834 total). Import process authenticated as admin and uploaded CSV via production API, handling duplicate detection automatically. All valid email addresses now have freemium subscription access to the KASINA platform.
- June 20, 2025: Finalized Vajrayana kasina background colors with exact outer ring HEX code matches. All six kasinas now have perfectly seamless backgrounds: AH/OM/HUM (#000000), White A (#0000ff), Clear Light (#0055ff), Rainbow (#1F00CC). Extracted precise colors directly from kasina component definitions for perfect visual integration.
- June 20, 2025: Extended Breath mode to include Vajrayana kasinas while preserving Color kasina functionality. Fixed kasina scaling issues where Vajrayana kasinas appeared tiny (0.019x scale). Added proper kasina type detection and scaling logic for vajrayana kasinas (0.8x multiplier). Updated kasina selection interface formatting to match Visual mode with line breaks between "Color" and "Kasinas", "Vajrayana" and "Kasinas". Completed Breath mode expansion with all Vajrayana kasinas (White A, Om, Ah, Hum, Rainbow, Clear Light) now working with breath animation
- June 20, 2025: Completed and ready for deployment - New Breath Kasina interface with purple gradient design, circular feature icons (Visual Biofeedback, Auto-calibration, Force detection, Bluetooth connection), top-aligned layout, centered device icon, and Premium/Friend access controls. Fixed cancel button in kasina selection to navigate back instead of starting session. Updated chart titles: "Practice Breakdown" → "Practice Modes", "Kasina Breakdown" → "Kasina Usage". Made Practice Modes chart non-clickable with hover tooltips showing detailed breakdowns without grey background effects. Fixed Visual Mode custom color smart backgrounds, changed basic kasinas to black backgrounds in Breath mode, updated multiple users in production database with new subscription roles
- June 19, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.