[README.md](https://github.com/user-attachments/files/31861671/README.md)
# 🩸 University Blood Management System (UBMS)

A full-stack web application designed to simplify blood donor management, blood requests, and communication between donors, users, and administrators.

## 🌐 Live Demo

**Live Website:**  
https://ubms-university-blood-management-system.onrender.com

## 💻 Source Code

**GitHub Repository:**  
https://github.com/prashant-sulakhe/UBMS-University-Blood-Management-System

---

## 📌 Project Overview

The **University Blood Management System (UBMS)** provides a centralized digital platform for managing blood donors and blood requests.

The system allows users to register, manage donor information, search for suitable donors, submit blood requests, and receive notifications. It also provides administrative functionality for managing users, donors, blood requests, and donation-related information.

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
- Manage donation-related information

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
```

---

## 🔐 Authentication

UBMS uses **JWT-based authentication** to secure access to protected application features.

Passwords are protected using **bcrypt hashing** rather than storing plain-text passwords.

Authentication-related configuration is handled through environment variables.

---

## 🗄️ Database

The project uses **MySQL-compatible database technology**, with the deployed application connected to **TiDB Cloud**.

The backend initializes and manages the required database schema when the application starts.

The database stores information related to:
- Users
- Donors
- Blood requests
- Donations
- Notifications
- Direct requests

---

## ⚡ Real-Time Notifications

UBMS uses **Socket.IO** to provide real-time communication between the frontend and backend.

This allows notification-related updates to be delivered without requiring users to repeatedly refresh the page.

---

## 📂 Project Structure

```text
UBMS/
├── backend/
│   ├── db.js
│   └── server.js
├── src/
│   ├── components/
│   ├── context/
│   ├── pages/
│   ├── services/
│   └── ...
├── public/
├── .gitignore
├── package.json
├── vite.config.js
└── README.md
```

---

## 🚀 Running the Project Locally

### 1. Clone the repository

```bash
git clone https://github.com/prashant-sulakhe/UBMS-University-Blood-Management-System.git
```

### 2. Navigate to the project directory

```bash
cd UBMS-University-Blood-Management-System
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=5000

DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
DB_PORT=your_database_port

JWT_SECRET=your_jwt_secret

ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_admin_password

EMAIL_USER=your_email
EMAIL_PASS=your_email_password

VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=your_vapid_email
```

> **Important:** Never commit `.env` or expose database credentials, passwords, JWT secrets, email credentials, or private keys.

### 5. Start the development environment

```bash
npm run dev:all
```

---

## 🏭 Production Build

Create a production build:

```bash
npm run build
```

Start the application:

```bash
npm start
```

---

## ☁️ Deployment

The application is deployed using **Render**.

```text
GitHub Repository
        ↓
      Render
        ↓
React Production Build
        ↓
Node.js + Express Server
        ↓
TiDB Cloud Database
```

### Production Build Command

```bash
npm install --include=dev && npm run build
```

### Production Start Command

```bash
npm start
```

---

## 🔒 Environment Variables

The application requires:

```text
NODE_ENV
PORT
DB_HOST
DB_USER
DB_PASSWORD
DB_NAME
DB_PORT
JWT_SECRET
ADMIN_EMAIL
ADMIN_PASSWORD
EMAIL_USER
EMAIL_PASS
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_EMAIL
```

Sensitive values should be stored using environment variables and should never be committed to GitHub.

---

## 🎯 Project Objectives

- Provide a centralized blood donor management platform.
- Make donor searching easier.
- Simplify blood request management.
- Allow donors to manage their availability.
- Provide administrators with management tools.
- Improve communication using real-time notifications.
- Maintain secure user authentication.
- Provide a full-stack web application with a production deployment.

---

## 🔮 Future Enhancements

- SMS notifications for urgent blood requests
- Location-based donor search
- Advanced donor matching
- Blood inventory management
- Analytics and reporting dashboard
- Mobile application
- Hospital/organization integration
- Automated donor reminders

---

## 👨‍💻 Developer

**Prashant Sulakhe**

BCA Graduate

### Skills Used in This Project

- React.js
- JavaScript
- Node.js
- Express.js
- MySQL / TiDB Cloud
- JWT
- bcrypt
- Socket.IO
- Nodemailer
- Git & GitHub
- Render

---

## 🔗 Project Links

🌐 **Live Demo:**  
https://ubms-university-blood-management-system.onrender.com

💻 **GitHub Repository:**  
https://github.com/prashant-sulakhe/UBMS-University-Blood-Management-System

---

## 📄 License

This project was developed as an academic/final-year project.
