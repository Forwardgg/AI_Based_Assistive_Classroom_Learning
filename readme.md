# AIBACLS – Smart Classroom AI System

## Project Overview

AIBACLS (AI-Based Automated Classroom Learning System) is a smart classroom platform designed to enhance teaching and learning using AI-driven automation.

The system integrates a frontend interface with a backend API to provide:

- Classroom management
- AI-powered assistance
- Secure backend architecture
- Scalable project structure for future enhancements

---

# Sprint 1 Completion

Sprint 1 focused on building the foundation of the system:

- Project initialization (Frontend + Backend)
- Git repository setup
- Base folder structure creation
- Backend server configuration
- Frontend application setup
- Initial API connectivity
- Basic documentation

Sprint 1 establishes the core development environment for future feature expansion.

---

# Project Structure

```
AIBACLS/
│
├── frontend/              # Frontend application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── backend/               # Backend server
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── server.js
│   └── ...
│
├── .gitignore
├── README.md
└── package.json (if root-based)
```

---

# Tech Stack

## Frontend
- React.js
- HTML5
- CSS3
- JavaScript (ES6+)

## Backend
- Node.js
- Express.js

## Version Control
- Git
- GitHub

---

# Installation & Setup

## 1. Clone the Repository

```bash
git clone <your-repository-url>
cd AIBACLS
```

---

## 2. Backend Setup

```bash
cd backend
npm install
npm start
```

Backend will run on:

```
http://localhost:5000
```

---

## 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend will run on:

```
http://localhost:3000
```

---

# Environment Variables (Backend)

Create a `.env` file inside the `backend` folder:

```
PORT=5000
MONGO_URI=your_database_url
JWT_SECRET=your_secret_key
```

---

# Testing the Application

1. Start backend server  
2. Start frontend server  
3. Verify API connection  
4. Check browser console for errors  
5. Ensure endpoints respond correctly  

---

# Git Workflow

Common Git commands used in this project:

```bash
git status
git add .
git commit -m "Your commit message"
git push origin main
```

---

# Future Improvements (Sprint 2+)

- User Authentication (JWT)
- MongoDB Database Integration
- AI Model Integration
- Role-Based Access (Teacher / Student / Admin)
- Deployment (Render / Vercel / AWS)
- Analytics Dashboard

---

# Author

Rohit Roy  
Project: AIBACLS – Smart Classroom AI System  
Tezpur University  

---

# License

This project is developed for academic and educational purposes.

---

# Contribution

Currently under active development. Contributions and improvements will be added in future sprints.
