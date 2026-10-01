# 🚛 TruckSathi

### Roadside assistance, built for the road.

TruckSathi is a backend-powered roadside assistance platform designed to connect **truck drivers with nearby mechanics** when they need help on the road.

Instead of searching for a mechanic manually, drivers can discover available mechanics based on location, request assistance, and track the service request through its lifecycle.

> **Built with Node.js, Express.js, MongoDB and JWT — with a layered backend architecture designed for scalability and maintainability.**

---

## 🛣️ The Problem

A truck breakdown can mean:

- ⏱️ Lost time
- 💰 Lost income
- 📍 Difficulty finding a nearby mechanic
- 📞 Multiple calls to find someone available
- 🚚 Delays in delivering cargo

TruckSathi focuses on solving the **mechanic discovery and service coordination** part of this problem.

---

## ⚙️ How TruckSathi Works

```text
        🚛 DRIVER
            │
            │ Creates assistance request
            ▼
     ┌─────────────────┐
     │    TruckSathi   │
     │     Backend     │
     └────────┬────────┘
              │
              │ Finds nearby
              │ available mechanics
              ▼
        🔧 MECHANIC
              │
              │ Accepts request
              ▼
        🛠️ ASSISTANCE
              │
              ▼
          ✅ COMPLETED
Service Request Lifecycle
PENDING
   │
   ├──→ ACCEPTED
   │       │
   │       └──→ IN_PROGRESS
   │                │
   │                └──→ COMPLETED
   │
   ├──→ REJECTED
   │
   └──→ CANCELLED

The backend controls these transitions and prevents invalid state changes.

🧠 What I Built

This project goes beyond basic CRUD APIs.

🔐 Authentication & Authorization
Driver registration/login
Mechanic registration/login
Admin authentication
JWT-based authentication
Role-based access control
Password hashing with bcrypt
📍 Location-Based Mechanic Discovery

Drivers can search for nearby mechanics using MongoDB's geospatial capabilities.

The system uses:

2dsphere indexes
MongoDB $geoNear
Radius-based searching
Mechanic availability status

This allows the backend to find mechanics based on their geographic location.

🔄 Service Request Management

A complete request lifecycle is implemented:

Driver creates request
        ↓
Pending
        ↓
Mechanic accepts
        ↓
Accepted
        ↓
Mechanic starts assistance
        ↓
In Progress
        ↓
Service completed

Requests can also be rejected or cancelled according to the implemented rules.

🛡️ Security

The backend includes:

JWT Bearer authentication
Role-based authorization
Joi input validation
Password hashing
Ownership checks
Centralized error handling
Production error masking
📊 Admin & Analytics

The backend also provides administrative capabilities including:

User management
Driver statistics
Mechanic statistics
Service request statistics
Dashboard metrics
Visitor analytics
7-day traffic trends
🏗️ Backend Architecture

TruckSathi follows a layered architecture:

                    CLIENT
                      │
                      ▼
                 ┌─────────┐
                 │  ROUTES │
                 └────┬────┘
                      │
                      ▼
               ┌────────────┐
               │ MIDDLEWARE │
               └─────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │ CONTROLLERS │
              └──────┬──────┘
                     │
                     ▼
               ┌──────────┐
               │ SERVICES │
               └────┬─────┘
                    │
                    ▼
             ┌──────────────┐
             │ REPOSITORIES │
             └───────┬──────┘
                     │
                     ▼
                ┌─────────┐
                │ MODELS  │
                └────┬────┘
                     │
                     ▼
                  MongoDB
Layer Responsibilities
Layer	Responsibility
Routes	Define API endpoints
Middleware	Authentication, authorization & error handling
Controllers	Handle HTTP requests and responses
Services	Business logic
Repositories	Database operations
Models	MongoDB schemas
Validators	Request validation
Utils	Reusable backend utilities
Config	Environment and application configuration
📂 Project Structure
trucksathi-backend/
│
├── src/
│   ├── config/
│   │   ├── constants.config.js
│   │   ├── db.config.js
│   │   ├── env.config.js
│   │   └── seedAdmin.config.js
│   │
│   ├── controllers/
│   │   ├── admin.Controller.js
│   │   ├── analytics.Controller.js
│   │   ├── auth.Controller.js
│   │   ├── driver.Controller.js
│   │   ├── mechanic.Controller.js
│   │   └── request.Controller.js
│   │
│   ├── middleware/
│   │   ├── auth.Middleware.js
│   │   ├── authorize.Middleware.js
│   │   └── errorHandler.Middleware.js
│   │
│   ├── models/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── validators/
│
├── tests/
├── server.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── README.md
🛠️ Tech Stack
Technology	Purpose
Node.js	Backend runtime
Express.js	REST API framework
MongoDB	Database
Mongoose	MongoDB ODM
JWT	Authentication
bcrypt	Password hashing
Joi	Request validation
dotenv	Environment configuration
CORS	Cross-origin requests
🔌 API Overview

All APIs are prefixed with:

/api
🔐 Authentication
POST /api/auth/driver/register
POST /api/auth/driver/login

POST /api/auth/mechanic/register
POST /api/auth/mechanic/login

POST /api/admin/login
🚛 Driver
GET /api/driver/profile
PUT /api/update/driver/profile
🔧 Mechanic
GET   /api/mechanic/profile
PUT   /api/update/mechanic/profile
PATCH /api/mechanic/availability
GET   /api/nearby
🛠️ Service Requests
POST  /api/requests
GET   /api/requests/driver
GET   /api/requests/mechanic
GET   /api/requests/:requestId

PATCH /api/requests/:requestId/accept
PATCH /api/requests/:requestId/reject
PATCH /api/requests/:requestId/start
PATCH /api/requests/:requestId/complete
PATCH /api/requests/:requestId/cancel
📊 Administration
GET /api/admin/dashboard
GET /api/admin/users
GET /api/admin/drivers
GET /api/admin/mechanics
GET /api/admin/requests
GET /api/admin/analytics
📈 Analytics
POST /api/analytics/visit
🔒 Security Architecture

TruckSathi implements multiple layers of backend protection:

Request
   │
   ▼
JWT Authentication
   │
   ▼
Role Authorization
   │
   ▼
Joi Validation
   │
   ▼
Controller
   │
   ▼
Business Logic
   │
   ▼
Ownership Verification
   │
   ▼
Database

The backend also uses centralized error handling so API errors follow a consistent response structure.

🧪 Testing

The project contains tests covering:

Service layer
Controllers
Routes and middleware
Security
Error handling
Driver experience
Request lifecycle
Rejection flow
Completion flow
End-to-end behaviour

Run the complete test suite:

npm run test:all

Individual test suites can also be executed through the scripts defined in package.json.

🚀 Getting Started
1. Clone the repository
git clone https://github.com/Dipanshudk46/trucksathi-backend.git
cd trucksathi-backend
2. Install dependencies
npm install
3. Configure environment variables

Create a .env file using .env.example:

PORT=3000
NODE_ENV=development

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

ADMIN_EMAIL=admin@trucksathi.com
ADMIN_PASSWORD=your_admin_password
4. Start development server
npm run dev
5. Start production server
npm start
📌 Engineering Highlights

This project demonstrates practical backend engineering concepts including:

REST API design
Layered backend architecture
JWT authentication
Role-based access control
MongoDB geospatial queries
2dsphere indexing
Service request state management
Repository pattern
Centralized error handling
Joi input validation
Ownership authorization
Password hashing
Admin analytics
Automated testing
Environment-based configuration
🗺️ Project Flow
        🚛 DRIVER
            │
            ▼
   Mechanic Discovery
            │
            ▼
    Service Request
            │
            ▼
       🔧 MECHANIC
            │
            ▼
       Assistance
            │
            ▼
        Completion
            │
            ▼
     📊 Analytics
👨‍💻 Developer

Dipanshu

BCA Graduate · Backend Developer

Focus
Node.js
Express.js
MongoDB
REST APIs
Backend Architecture
Authentication
Database Design
🚛 TruckSathi
Helping keep trucks moving.
