# 🚚 TruckSathi Backend

A **backend-focused roadside assistance platform** built with **Node.js, Express.js, and MongoDB** to help truck drivers find nearby mechanics during breakdown emergencies.

TruckSathi focuses on secure authentication, role-based access control, and location-aware mechanic discovery.

## 🚀 Features

* 🔐 **JWT Authentication** — Secure registration and login
* 🔑 **RBAC** — Separate permissions for Drivers and Mechanics
* 🔒 **bcrypt** — Secure password hashing
* 👤 **Profile Management** — Protected user profile APIs
* 📍 **Geospatial Search** — Find nearby mechanics using GeoJSON, `2dsphere` and `$geoNear`
* 🛡️ **Protected Routes** — Authentication and authorization middleware
* ⚠️ **Error Handling** — Meaningful HTTP status codes and API error responses
* 🗄️ **MongoDB + Mongoose** — Document-based data management

## 🏗️ Architecture

```text
Client
  ↓
Express Routes
  ↓
Auth Middleware
  ↓
RBAC Middleware
  ↓
Controllers
  ↓
Mongoose
  ↓
MongoDB
```

## 🛠️ Tech Stack

**Backend:** Node.js, Express.js
**Database:** MongoDB, Mongoose
**Authentication:** JWT, bcrypt
**Location:** GeoJSON, MongoDB Geospatial Queries

## 📌 API

### Authentication

```http
POST /api/auth/driver/register
POST /api/auth/driver/login
```

### Profile

```http
GET /api/profile
PUT /api/profile
```

### Mechanic Discovery

Location-based APIs for finding nearby mechanics using MongoDB geospatial queries.

## 📈 Future Improvements

* Google Maps integration
* Real-time location tracking
* Mechanic services & availability
* Notifications
* Automated testing
* Rate limiting & production monitoring
* Redis-based optimization where required

## 👨‍💻 Author

**Dipanshu**
Backend Developer | Node.js | Express.js | MongoDB

> **TruckSathi — Connecting truck drivers with nearby roadside assistance. 🚚**
