# 🚚 TruckSathi Backend (Work in Progress 🚧)

A scalable backend system built using **Node.js, Express, and MongoDB** to solve real-world problems faced by truck drivers — like finding nearby mechanics and essential services.

This project is actively being developed with a focus on **real-world backend architecture, security, and scalability**.

---

## ⚙️ Tech Stack

* Node.js
* Express.js
* MongoDB (Mongoose)
* bcrypt (password hashing)
* JSON Web Token (JWT)

---

## 📁 Project Structure

```
backend/
│── config/
│── controllers/
│── models/
│── routes/
│── middleware/
│── server.js
```

---

## 🚀 Current Features

### 🔐 Authentication System

* Driver Registration API
* Driver Login API
* Password hashing using bcrypt
* Secure login with JWT

---

### 🛡️ Authorization (Security)

* Protected routes using middleware
* Token verification (JWT)
* Secure access to private APIs

---

### 👤 Driver Profile System

* Get logged-in driver profile
* Update driver details (name, phone)
* Secure data handling (password hidden)

---

### ✅ Validations & Error Handling

* Input validation (email, phone, password)
* Duplicate checks (email & phone)
* Proper status codes and error responses
* Try-catch based error handling

---

## 📌 API Endpoints

### 🔐 Auth Routes

```
POST /api/auth/driver/register
POST /api/auth/driver/login
```

### 👤 Driver Routes (Protected)

```
GET /api/profile
PUT /api/profile
```

---

## 🧠 What I'm Learning

* Backend architecture (MVC pattern)
* Authentication & authorization (JWT)
* Middleware design and flow
* MongoDB queries and data handling
* Debugging real-world backend issues
* Writing scalable and clean backend code

---

## 📈 Upcoming Features

* 📍 Location-based services (nearby mechanics)
* 🧰 Mechanic module (registration + services)
* 📊 Role-based access (driver / mechanic)
* 🗺️ Google Maps integration
* 📱 Frontend integration

---

## 👨‍💻 Author

**Dipanshu**
Backend Developer in Progress 🚀

---
