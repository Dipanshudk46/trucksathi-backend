# TruckSathi Backend

TruckSathi is a roadside assistance platform connecting truck drivers with mechanics. The backend handles user authentication, nearby mechanic discovery, service request lifecycles, and admin operations.

---

## Tech Stack

* **Runtime**: Node.js (v18+)
* **Framework**: Express.js (v5)
* **Database**: MongoDB with Mongoose ODM (v9)
* **Authentication**: JSON Web Token (`jsonwebtoken`)
* **Password Hashing**: `bcrypt`
* **Validation**: `joi`
* **Configuration**: `dotenv`
* **CORS**: `cors`

---

## Architecture

The codebase follows a layered architecture:

```text
HTTP Request
    ↓
Routes (/src/routes)
    ↓
Middleware (/src/middleware)
    ↓
Controllers (/src/controllers)
    ↓
Services (/src/services)
    ↓
Repositories (/src/repositories)
    ↓
Models (/src/models)
    ↓
MongoDB
```

### Error Handling

All errors (operational AppErrors, validation failures, database errors, and unexpected exceptions) pass through the centralized error middleware:

```text
Error
  ↓
Error Middleware (/src/middleware/errorHandler.Middleware.js)
  ↓
Standard JSON Response ({ success: false, message, code })
```

---

## Project Structure

```text
trucksathi-backend/
├── src/
│   ├── config/          # Environment, constants, database connection, seed script
│   ├── controllers/     # HTTP request handling and response formatting
│   ├── middleware/      # Auth, role authorization, and centralized error handling
│   ├── models/          # Mongoose schemas (Driver, Mechanic, Admin, ServiceRequest, Visit)
│   ├── repositories/    # Database queries and persistence logic
│   ├── routes/          # Express route definitions
│   ├── services/        # Business logic and lifecycle state transitions
│   ├── utils/           # Helper utilities (AppError, apiResponse, jwt, password)
│   └── validators/      # Joi schemas and validation middleware
├── tests/               # Unit, integration, security, and lifecycle tests
├── .env.example         # Environment template
├── .gitignore           # Git ignore rules
├── package.json         # Dependencies and npm scripts
├── README.md            # Documentation
└── server.js            # Application entry point
```

---

## Environment Setup

1. Copy `.env.example` to create your local `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure the required environment variables:
   ```env
   # Server
   PORT=3000
   NODE_ENV=development

   # Database
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/trucksathi?retryWrites=true&w=majority

   # Authentication
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=7d

   # Default Admin Seeding
   ADMIN_EMAIL=admin@trucksathi.com
   ADMIN_PASSWORD=your_admin_password
   ```

---

## Getting Started

### Install Dependencies
```bash
npm install
```

### Run the Server
```bash
# Start in development mode with nodemon
npm run dev

# Start in production mode
npm start
```

---

## Testing

The test suite covers service logic, controllers, routes, error handling, security, and the complete service request lifecycle:

```bash
# Run unit and integration suites (services, controllers, routes, security, errors)
npm run test:services
npm run test:controllers
npm run test:routes
npm run test:security
npm run test:error

# Run end-to-end tests (requires server running on port 3000)
npm run test:lifecycle
npm run test:driver
npm run test:e2e

# Run all test suites
npm run test:all
```

---

## API Reference

All routes are prefixed with `/api`.

### 1. Authentication (`/api/auth` and `/api/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/driver/register` | Public | Register new driver |
| `POST` | `/api/auth/driver/login` | Public | Driver login (returns JWT and profile) |
| `POST` | `/api/auth/mechanic/register` | Public | Register mechanic with services and coordinates |
| `POST` | `/api/auth/mechanic/login` | Public | Mechanic login (returns JWT and profile) |
| `POST` | `/api/admin/login` | Public | Administrator login |

### 2. Driver Profile (`/api`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/driver/profile` | Driver | Get authenticated driver profile |
| `PUT` | `/api/update/driver/profile` | Driver | Update driver name or phone |

### 3. Mechanic Workshop & Discovery (`/api`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/mechanic/profile` | Mechanic | Get authenticated mechanic profile |
| `PUT` | `/api/update/mechanic/profile` | Mechanic | Update mechanic workshop details, services, phone, location |
| `PATCH`| `/api/mechanic/availability` | Mechanic | Toggle online/offline status |
| `GET` | `/api/nearby` | Driver, Mechanic | Find online mechanics within radius using 2dsphere search |

### 4. Service Requests (`/api`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/requests` | Driver | Create roadside assistance request |
| `GET` | `/api/requests/driver` | Driver | List all requests for authenticated driver |
| `GET` | `/api/requests/mechanic` | Mechanic | List incoming requests for authenticated mechanic |
| `GET` | `/api/requests/:requestId` | Driver, Mechanic | Get single request details (with ownership check) |
| `PATCH/POST` | `/api/requests/:requestId/accept` | Mechanic | Accept pending request (`pending` → `accepted`) |
| `PATCH/POST` | `/api/requests/:requestId/reject` | Mechanic | Reject pending request (`pending` → `rejected`) |
| `PATCH/POST` | `/api/requests/:requestId/start` | Mechanic | Start assistance (`accepted` → `in_progress`) |
| `PATCH/POST` | `/api/requests/:requestId/complete` | Mechanic | Mark assistance completed (`in_progress` → `completed`) |
| `PATCH/POST` | `/api/requests/:requestId/cancel` | Driver, Mechanic | Cancel request (`pending`/`accepted`/`in_progress` → `cancelled`) |

### 5. Administration (`/api/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/admin/login` | Public | Admin login |
| `GET` | `/api/admin/dashboard` | Admin | Metrics (user counts, request stats, visits) |
| `GET` | `/api/admin/users` | Admin | User directory with search and role filters |
| `GET` | `/api/admin/drivers` | Admin | List registered drivers with request counts |
| `GET` | `/api/admin/mechanics` | Admin | List registered mechanics with request counts |
| `GET` | `/api/admin/requests` | Admin | List platform requests with status filters |
| `GET` | `/api/admin/analytics` | Admin | Visitor traffic summary and 7-day trend |

### 6. Visitor Analytics (`/api/analytics`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/analytics/visit` | Public | Record visitor session beacon (with 15-minute cooldown) |

---

## Security

* **Authentication**: JWT verification via Bearer token in the `Authorization` header.
* **Role-Based Access Control**: Route-level role enforcement (`driver`, `mechanic`, `admin`) via `authorize()` middleware.
* **Input Validation**: Joi validation on incoming body, params, and query parameters before reaching controllers.
* **Password Hashing**: `bcrypt` with 10 salt rounds. Passwords are never returned in responses.
* **Ownership Checks**: Drivers and mechanics can only view and update requests associated with their account.
* **Error Masking**: In production, unhandled 500 errors return generic messages to avoid leaking internal system details.
