AIBACLS — AI-Based Adaptive Classroom Lecture System
1. Project Overview

AIBACLS (AI-Based Adaptive Classroom Lecture System) is a full-stack web application designed to digitize and intelligently enhance classroom lectures.

The system enables:

Professors to create and manage courses

Students to enroll via secure class codes

JWT-based authentication with role control

Role-based dashboards

A scalable architecture prepared for AI integration

The long-term objective is to implement an adaptive classroom intelligence pipeline:

Lecture Audio → Transcript → Cleaned Text → AI Quiz → Analytics → Weak Topic Detection → Summary → PDF Report

Currently, the system implements Sprint 1: Foundation & Database Integration.

2. Tech Stack
Backend

Flask (App Factory Pattern)

PostgreSQL

SQLAlchemy (ORM)

Flask-JWT-Extended

Flask-CORS

Frontend

React (Vite)

React Router

Axios

JWT-based Auth Context

Feature-based architecture

3. System Architecture
Backend Architecture

Initialization Flow:

run.py → create_app()
  → load config
  → init CORS
  → init SQLAlchemy
  → init JWT
  → register blueprints
  → test DB connection

Design Principles:

Modular blueprint structure

App Factory Pattern

Environment-based configuration

Role-based access control

Stateless authentication

Frontend Architecture

Design Principles:

Feature-based structure

Centralized API service layer

Global AuthContext for session handling

Role-based route protection

PublicRoute and PrivateRoute separation

4. Project Folder Structure
C:.
│   README.md
│   tree.txt
│
├── backend
│   │   .env
│   │   requirements.txt
│   │   run.py
│   │
│   └── app
│       │   config.py
│       │   __init__.py
│       │
│       ├── models
│       │   │   course.py
│       │   │   enrollment.py
│       │   │   user.py
│       │
│       ├── routes
│       │   │   auth_routes.py
│       │   │   course_routes.py
│       │   │   user_routes.py
│
├── frontend
│   │   .env
│   │   package.json
│   │   vite.config.js
│   │
│   ├── public
│   │
│   └── src
│       │   main.jsx
│       │
│       ├── app
│       │       App.jsx
│       │
│       ├── components
│       │       DashboardLayout.jsx
│       │       Navbar.jsx
│       │       PrivateRoute.jsx
│       │
│       ├── features
│       │   ├── auth
│       │   ├── courses
│       │   ├── dashboard
│       │   ├── lectures
│       │   └── users
│       │
│       └── services
│               api.js
5. Naming Conventions
Backend

Models: Singular PascalCase (User, Course, Enrollment)

Tables: Plural snake_case (users, courses, enrollments)

Routes: <feature>_routes.py

Blueprints: <feature>_bp

Enum values: lowercase strings

Frontend

Components: PascalCase (PrivateRoute.jsx)

Contexts: PascalCase (AuthContext.jsx)

API files: camelCase with suffix (authAPI.js)

Feature-based folder structure

Pages grouped under feature modules

This ensures maintainability and clarity.

6. Main System Entities
Current Core Entities

User (Professor / Student)

Course

Enrollment

Planned Future Entities

Session

SessionPartition

TranscriptSegment

Transcript

Quiz

Question

StudentAnswer

LectureNote

Report

These entities will power the adaptive classroom intelligence pipeline.

7. Database Design
User

id

name

email (unique)

role (professor | student)

password_hash

created_at

Course

id

course_name

year

semester (spring | autumn)

class_code (unique)

professor_id (FK → users)

Enrollment

id

student_id (FK → users)

course_id (FK → courses)

roll_no

Unique constraint on (student_id, course_id)

Relationship Model

Professor → One-to-Many → Courses

Student → Many-to-Many → Courses (via Enrollment)

Cascading deletes ensure referential integrity.

8. Authentication Architecture
Backend (JWT)

Token created using user.id as identity

Additional claims include role and email

Token expiration configurable via environment variables

Custom error handlers for:

Expired tokens

Invalid tokens

Missing tokens

Frontend (AuthContext)

Login Flow:

User submits credentials

Backend returns JWT

Token stored in localStorage

JWT decoded

User stored in context

Auto-logout scheduled

Automatic Logout:

Token expiration checked using jwtDecode

Timeout scheduled until expiry

Logout clears state and redirects

Axios Integration:

Automatically attaches Authorization header

Handles global 401 responses

Clears token on invalid session

9. API Structure
Auth Routes

POST /api/auth/login

POST /api/auth/signup

Course Routes

POST /api/courses (Professor only)

POST /api/courses/join (Student only)

GET /api/courses (Role-based retrieval)

Authorization enforced via @jwt_required().

10. Current Sprint Status

Sprint 1 — Completed

Database schema finalized

PostgreSQL integrated

Authentication implemented

Course creation working

Enrollment system working

Role-based dashboards functional

JWT lifecycle handling complete

Clean modular architecture established

System is stable and ready for expansion.

11. Future Roadmap
Sprint 2

Session model

Partition model

Real-time classroom engine (SocketIO)

Sprint 3

Whisper (local STT)

Transcript storage

Incremental audio chunk processing

Sprint 4

LLM integration

Transcript cleaning

Quiz generation

Sprint 5

Live quiz push

Student answer evaluation

Sprint 6

Analytics dashboard

Weak topic detection

PDF generation

12. Deployment Considerations

Current Setup:

Local PostgreSQL

Environment-based secrets

CORS configured for dev environment

Adjustable JWT expiration

Future Deployment:

VPS or cloud hosting

Containerization (optional)

Cloud STT and LLM APIs

Production environment variable management

13. Architectural Philosophy

The system follows:

Clear separation of concerns

Stateless authentication

Role-based access control

Modular backend design

Feature-based frontend architecture

AI separated from core logic

Deterministic analytics where possible

AI integration is staged only after foundational stability.

14. Summary

AIBACLS is a structured, scalable adaptive classroom platform.

It is not a simple CRUD system.
It is designed to evolve into a real-time, AI-powered classroom intelligence engine.

Foundation is stable.
Security is structured.
Architecture is modular.
AI integration is planned methodically.

The system is now ready to transition into Sprint 2: Session and Real-Time Architecture.