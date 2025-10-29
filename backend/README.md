# HealthTrack Backend API

A comprehensive NestJS backend API for the Health Program & Medicine Tracker system. This backend provides all the necessary endpoints to support the Next.js frontend application.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (Admin, Healthcare Staff, Guest)
- **User Management**: Complete CRUD operations for user management (Admin only)
- **Program Management**: Create and manage health programs with medication assignments
- **Patient Management**: Patient enrollment, tracking, and program assignments
- **Session Management**: Schedule and manage program sessions (daily/weekly/monthly)
- **Medication Management**: Medication CRUD and program assignments
- **Medication Dispensation**: Record medication dispensations with duplicate prevention logic
- **Attendance Tracking**: Track patient attendance for sessions with bulk operations
- **Activity Logs**: Complete audit trail of all system activities
- **Dashboard**: Metrics and statistics endpoints
- **Reports**: CSV export functionality for various reports

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository and navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   DB_DATABASE=healthtrack
   
   JWT_SECRET=your-secret-key-change-in-production
   JWT_EXPIRES_IN=7d
   
   PORT=3001
   NODE_ENV=development
   
   FRONTEND_URL=http://localhost:3000
   ```

4. **Create PostgreSQL database:**
   ```bash
   createdb healthtrack
   ```

5. **Run database migrations:**
   The database will auto-sync in development mode. For production, use migrations.

6. **Seed the database (optional):**
   You can create a seed script or manually insert test data. Seed data includes:
   - Admin user: `admin@healthtrack.app` / `admin123`
   - Staff user: `staff@healthtrack.app` / `staff123`
   - Guest user: `guest@healthtrack.app` / `guest123`
   - Sample programs and medications

## 🏃 Running the Application

**Development mode:**
```bash
npm run start:dev
```

**Production mode:**
```bash
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3001`

## 📚 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/profile` - Get current user profile (requires authentication)

### Users (Admin only)
- `GET /users` - List all users
- `GET /users/:id` - Get user details
- `POST /users` - Create new user
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Programs
- `GET /programs` - List all programs (with filters)
- `GET /programs/:id` - Get program details
- `POST /programs` - Create program (Admin only)
- `PATCH /programs/:id` - Update program (Admin only)
- `DELETE /programs/:id` - Delete program (Admin only)

### Patients
- `GET /patients` - List all patients (with filters)
- `GET /patients/:id` - Get patient details
- `GET /patients/:id/stats` - Get patient statistics
- `POST /patients` - Create new patient
- `POST /patients/:id/enroll` - Enroll patient in program
- `PATCH /patients/:id` - Update patient

### Medications
- `GET /medications` - List all medications
- `GET /medications/:id` - Get medication details
- `POST /medications` - Create medication (Admin only)
- `PATCH /medications/:id` - Update medication (Admin only)
- `DELETE /medications/:id` - Delete medication (Admin only)

### Medication Dispensations
- `GET /dispensations` - List all dispensations (with filters)
- `GET /dispensations/:id` - Get dispensation details
- `GET /dispensations/patient/:patientId/history` - Get patient medication history
- `GET /dispensations/pending` - Get pending dispensations
- `GET /dispensations/overdue/count` - Get count of overdue medications
- `POST /dispensations` - Record medication dispensation (with duplicate prevention)

### Sessions
- `GET /sessions` - List all sessions (with filters)
- `GET /sessions/:id` - Get session details
- `POST /sessions` - Schedule new session
- `PATCH /sessions/:id` - Update session
- `DELETE /sessions/:id` - Delete session

### Attendance
- `GET /attendance` - List all attendance records (with filters)
- `GET /attendance/statistics` - Get attendance statistics
- `POST /attendance` - Mark attendance for session
- `POST /attendance/bulk` - Bulk update attendance
- `PATCH /attendance/:id` - Update attendance record

### Activity Logs
- `GET /activity-logs` - List all activity logs (with filters)

### Dashboard
- `GET /dashboard/metrics` - Get dashboard metrics
- `GET /dashboard/programs-overview` - Get programs overview
- `GET /dashboard/attendance-data` - Get attendance data
- `GET /dashboard/adherence-rate` - Get adherence rate data

### Reports (Admin only)
- `GET /reports/patient` - Generate patient progress report
- `GET /reports/program` - Generate program performance report
- `GET /reports/medication` - Generate medication tracking report
- `GET /reports/attendance` - Generate attendance summary report
- `GET /reports/user` - Generate user activity report

## 🔐 Authentication

All endpoints except `/auth/login` and `/auth/register` require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🎯 Role-Based Access Control

- **Admin**: Full access to all endpoints
- **Healthcare Staff**: Can manage patients, record dispensations, mark attendance
- **Guest**: Limited read-only access to public health programs

## 💊 Duplicate Prevention Logic

The medication dispensation system implements duplicate prevention:
- **Daily medications**: Cannot be dispensed more than once per day
- **Monthly medications**: Cannot be dispensed more than once per month
- **Weekly medications**: Prevents duplicate within 7-day window

When attempting to duplicate, the API returns a `400 Bad Request` with details about the previous dispensation.

## 📊 Database Schema

### Key Entities:
- **Users**: System users with roles (Admin, Healthcare Staff, Guest)
- **Programs**: Health programs with assigned medications and staff
- **Patients**: Patient information and enrollment records
- **Medications**: Medication catalog with frequencies
- **Sessions**: Program sessions scheduled at intervals
- **Dispensations**: Medication dispensation records with duplicate prevention
- **Attendance**: Patient attendance tracking for sessions
- **ActivityLogs**: System-wide audit trail

## 🧪 Testing

Run tests:
```bash
npm test
```

## 📝 Database Migrations

Generate migration:
```bash
npm run migration:generate -- -n MigrationName
```

Run migrations:
```bash
npm run migration:run
```

Revert migration:
```bash
npm run migration:revert
```

## 🐛 Troubleshooting

1. **Database connection issues**: Ensure PostgreSQL is running and credentials are correct
2. **JWT errors**: Verify `JWT_SECRET` is set in `.env`
3. **CORS issues**: Update `FRONTEND_URL` in `.env` to match your frontend URL

## 📄 License

This project is part of a full-stack internship assessment.

## 👥 Author

Created for HealthTrack - Health Program & Medicine Tracker System

