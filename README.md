# 🩸 University Blood Management System (UBMS)

A full-stack web application designed to simplify blood donor management, blood requests, and communication between donors, users, and administrators.

UBMS provides a centralized platform where users can register, manage donor information, search for suitable donors, submit blood requests, and receive notifications. The system also provides administrative functionality for managing users, donors, blood requests, and donation-related information.

## 🌐 Live Demo

**Live Website:**  
https://ubms-university-blood-management-system.onrender.com

---

## 📌 Project Overview

Finding suitable blood donors quickly can be challenging when information is scattered across different sources.

The **University Blood Management System (UBMS)** provides a centralized digital platform to manage blood donor information and blood requests.

The system connects users and donors while providing administrators with tools to manage the platform efficiently.

---

## ✨ Key Features

### 👤 User Management
- User registration and login
- Secure authentication
- User profile management
- JWT-based authentication
- Password hashing using bcrypt

### 🩸 Blood Donor Management
- Donor registration
- Donor profile management
- Search for donors based on blood requirements
- Donor availability management
- Donation tracking

### 📋 Blood Request Management
- Create blood requests
- Manage submitted requests
- Track blood request status
- Direct blood requests
- Request management for administrators

### 🔔 Notifications
- Application notifications
- Real-time notification updates
- Socket.IO-based communication

### 👨‍💼 Admin Management
- Administrative dashboard
- Manage donors
- Manage blood requests
- View user/donor information
- Monitor donation-related information

### 📧 Email Services
- Email-based communication
- OTP/email functionality
- Nodemailer integration

---

## 🛠️ Technologies Used

### Frontend
- React.js
- Vite
- JavaScript
- HTML5
- CSS3

### Backend
- Node.js
- Express.js

### Database
- MySQL
- TiDB Cloud

### Authentication & Security
- JSON Web Tokens (JWT)
- bcrypt

### Real-Time Communication
- Socket.IO

### Email
- Nodemailer

### Deployment
- Render

### Version Control
- Git
- GitHub

---

## 🏗️ System Architecture

The application follows a full-stack architecture:

```text
                ┌──────────────────────┐
                │      User / Admin    │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │   React.js Frontend  │
                │       + Vite         │
                └──────────┬───────────┘
                           │
                    HTTP / WebSocket
                           │
                           ▼
                ┌──────────────────────┐
                │ Node.js + Express.js │
                │       Backend        │
                └───────┬───────┬──────┘
                        │       │
              ┌─────────┘       └──────────┐
              ▼                            ▼
      ┌───────────────┐            ┌───────────────┐
      │ TiDB Cloud /  │            │   Socket.IO   │
      │ MySQL Database│            │  Real-Time    │
      └───────────────┘            │ Communication │
                                   └───────────────┘
