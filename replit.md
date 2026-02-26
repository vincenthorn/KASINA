# KASINA Meditation Platform

## Overview

KASINA is a full-stack meditation application providing immersive kasina meditation experiences with 3D visualizations, user management, and detailed session tracking. It aims to offer unique meditation journeys through interactive features and a comprehensive admin dashboard for platform oversight.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application uses a monorepo structure with a client-server architecture.

**Frontend:**
- Built with React and TypeScript using Vite.
- Features 3D meditation environments powered by Three.js and React Three Fiber.
- UI components are built with Radix UI and styled with Tailwind CSS for an accessible and modern interface.
- State management is handled by Zustand for client-side and TanStack Query for server-side state.

**Backend:**
- Developed with Node.js and Express.js.
- Utilizes PostgreSQL for the database, accessed via Drizzle ORM for type-safe operations.
- Implements custom session-based authentication with support for subscription tiers.
- Handles file uploads and CSV processing using Multer.

**Database Schema:**
- Includes tables for users (with email, subscription types: freemium, premium, admin), meditation sessions (tracking duration and kasina type), and detailed kasina breakdowns.

**Deployment:**
- Configured for auto-deployment on Render.com.

**Key Features:**
- Real-time session tracking with 3D visualization.
- Admin dashboard for user analytics, subscription management, and CSV import/export.
- Magic Link authentication system with email-based sign-in and 6-digit codes.
- Integration with Vernier GDX Respiration Belt for breath-guided meditation, including post-session breath analytics.
- Persistent Vernier device connections to reduce re-pairing.
- Comprehensive breath analytics suite for sessions, including BPM zone analysis, settling time, time-in-zone percentages, breath rate variability, session phase detection, and respiratory pause detection.
- Longitudinal breath trend analysis across multiple sessions.
- Support for various kasina types, including elemental and Vajrayana, with specific scaling and rendering logic for each.

## External Dependencies

- **Database:** PostgreSQL (Neon.tech for development, Render PostgreSQL for production).
- **3D Rendering:** Three.js ecosystem (`@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`).
- **UI Framework:** Radix UI with Tailwind CSS.
- **Development Tools:** TypeScript, Vite, ESBuild.
- **Email Service:** Resend for authentication emails.
- **Icons:** Lucide React.
- **Font Loading:** Fontsource (Inter and Nunito).
- **Membership Sync:** Jhana.community membership integration.
- **Vernier Integration:** `@vernier/godirect` for GDX Respiration Belt.