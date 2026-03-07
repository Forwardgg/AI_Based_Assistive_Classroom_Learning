# AIBACLS – AI-Based Adaptive Classroom Lecture System

## Project Overview

AIBACLS (AI-Based Adaptive Classroom Lecture System) is a full-stack web application designed to enhance classroom lectures using AI-assisted analysis and automation.

The system allows professors to manage courses, conduct structured lecture sessions, and eventually generate intelligent learning insights based on classroom interactions.

The long-term objective of the system is to create an adaptive classroom intelligence pipeline:

Lecture Audio → Transcript → Cleaned Text → AI Quiz → Student Answers → Analytics → Weak Topic Detection → Lecture Summary → PDF Report

The system is currently developed using a **Waterfall development methodology**, where each phase builds upon the stable completion of the previous phase.

---

# Development Methodology

This project follows the **Waterfall Software Development Model**.

Each phase is implemented sequentially to ensure system stability before introducing AI components.

Development Phases:

1. System Foundation & Database
2. Classroom Session Architecture
3. Speech-to-Text Pipeline
4. AI Processing Layer
5. Real-Time Student Interaction
6. Analytics & Intelligence
7. Testing & Optimization
8. Documentation & Submission

---

# Completed Phases

## Phase 1 – System Foundation & Database

This phase established the core backend and frontend architecture.

Implemented components:

* Flask backend initialization
* React frontend setup
* PostgreSQL database integration
* SQLAlchemy ORM configuration
* JWT-based authentication system
* User registration and login
* Role-based user model (Professor / Student)

### Core Models Implemented

* User
* Course
* Enrollment

### Features

Professors can:

* Create courses
* Generate unique class codes

Students can:

* Join courses using class codes

This phase establishes the foundational classroom management system.

---

## Phase 2 – Session & Partition System

This phase introduced the classroom lecture session architecture.

The system models a lecture as a structured session divided into time partitions.

### Core Models Added

* Session
* SessionPartition

### Features Implemented

Professors can:

* Start lecture sessions
* Configure session duration
* Define lecture partitions
* Control session flow

The system tracks session state and partition progress, preparing the architecture for real-time classroom interaction and AI processing.

---

# Project Structure

```
AIBACLS
├── ProjectContext.md
├── README.md
├── recordings
├── whisper_env
├── backend
│   ├── app
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── models
│   │   │   ├── user.py
│   │   │   ├── course.py
│   │   │   ├── enrollment.py
│   │   │   ├── session.py
│   │   │   └── session_partition.py
│   │   ├── routes
│   │   │   ├── auth_routes.py
│   │   │   ├── course_routes.py
│   │   │   ├── session_routes.py
│   │   │   └── user_routes.py
│   │   ├── services
│   │   └── sockets
│   ├── requirements.txt
│   └── run.py
│
├── frontend
│   ├── public
│   ├── src
│   │   ├── app
│   │   │   └── App.jsx
│   │   ├── components
│   │   │   ├── DashboardLayout.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── PrivateRoute.jsx
│   │   ├── features
│   │   │   ├── auth
│   │   │   ├── courses
│   │   │   ├── dashboard
│   │   │   ├── lectures
│   │   │   └── users
│   │   ├── services
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   └── main.jsx
│   └── vite.config.js
```

The system uses a **modular backend architecture** and **feature-based frontend structure** to maintain scalability and separation of concerns.

---

# Technology Stack

## Frontend

* React (Vite)
* JavaScript (ES6+)
* HTML5
* CSS3
* Axios
* React Router

## Backend

* Python
* Flask
* Flask-JWT-Extended
* Flask-CORS
* SQLAlchemy

## Database

* PostgreSQL

## Real-Time Communication

* Socket.IO

## AI Components (Planned)

* Whisper (Speech-to-Text)
* LLM APIs for transcript processing
* AI-generated quizzes
* Learning analytics

## Version Control

* Git
* GitHub

---

# Installation & Setup

## 1. Clone Repository

```bash
git clone <repository-url>
cd AIBACLS
```

---

## 2. Backend Setup

Create a virtual environment and install dependencies.

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

Backend runs on:

```
http://localhost:5000
```

---

## 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```
http://localhost:5173
```

---

# Environment Variables

Create a `.env` file inside the backend folder.

Example:

```
DATABASE_URL=postgresql://user:password@localhost/aibacls
JWT_SECRET_KEY=your_secret_key
JWT_ACCESS_TOKEN_EXPIRES=3600
```

---

# Current System Capabilities

The system currently supports:

* User authentication
* Role-based access control
* Course creation
* Course enrollment
* Lecture session creation
* Lecture partition management

The architecture is now ready for **Phase 3 – Speech-to-Text integration**.

---

# Future Phases

## Phase 3 – Speech-to-Text Pipeline

* MediaRecorder audio capture
* Whisper integration
* Transcript segment storage
* Partition-based transcript generation

## Phase 4 – AI Processing Layer

* Transcript cleaning
* Lecture summary generation
* AI quiz generation

## Phase 5 – Real-Time Quiz System

* Live quiz distribution
* Student answer collection
* Immediate evaluation

## Phase 6 – Analytics Dashboard

* Class performance analytics
* Weak topic detection
* Student learning insights

---

# Author

Rohit Roy
Tezpur University

Project: **AIBACLS – AI-Based Adaptive Classroom Lecture System**

---

# License

This project is developed for **academic and research purposes**.
