# Vitals CareOps (Health Program & Medication Tracker)

A full-stack healthcare management application for tracking patient enrollments, session attendance, and medication dispensation with comprehensive role-based access control.

## Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Setup Instructions](#setup-instructions)
- [Deployment](#deployment)
- [User Guide](#user-guide)
- [RBAC Implementation](#rbac-implementation)
- [Database Schema](#database-schema)
- [Implementation Details](#implementation-details)
- [Bonus Features](#bonus-features)

## Overview

This system addresses the challenge of manual tracking in healthcare settings by providing a digital platform to:
- Manage patient enrollments in health programs
- Track session attendance (one-on-one, group discussions, consultations)
- Monitor medication dispensation with duplicate prevention
- Generate progress reports and analytics
- Maintain audit trails for all activities

**Problem Solved**: Prevents missed sessions, duplicate medication dispensation, and incomplete treatment records through automated tracking and validation.

## Tech Stack

**Frontend:** Next.js 16 with TypeScript, TanStack Query, Tailwind CSS, Recharts

**Backend:** NestJS with TypeORM, PostgreSQL, JWT Authentication, Swagger API Documentation

**Database:** PostgreSQL 14+


## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### Backend Setup

1. Navigate to backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Create `.env` file with:
   - Database credentials (host, port, username, password, database name)
   - JWT secret and expiration
   - Application port (3001)
4. Create PostgreSQL database: `CREATE DATABASE healthtrackdb;`
5. Run migrations: `npm run migration:run`
6. Seed database (optional): `npm run seed`
7. Start server: `npm run start:dev`

Backend will run on: `http://localhost:3001`

API Documentation (Swagger): `http://localhost:3001/api`

### Frontend Setup

1. Navigate to frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Create `.env.local` file (or copy from template) with: `NEXT_PUBLIC_API_URL=http://localhost:3001`
4. Start development server: `npm run dev`

Frontend will run on: `http://localhost:3000`

## Deployment

### Option 1: Docker Compose (Recommended)

1. Copy environment template:
   - `cp .env.example .env`
2. Update `.env`:
   - Set a strong `JWT_SECRET`
   - Set production URLs for `FRONTEND_URL`, `CORS_ORIGIN`, and `NEXT_PUBLIC_API_URL`
3. Start the full stack:
   - `docker compose up -d --build`
4. Verify services:
   - Frontend: `http://localhost:3000`
   - Backend health: `http://localhost:3001/health`
   - Swagger (if `ENABLE_SWAGGER=true`): `http://localhost:3001/api`

### Option 2: Separate Deployments

Backend:
1. Copy env template: `cp backend/.env.example backend/.env`
2. Set production values in `backend/.env`
3. Install/build:
   - `cd backend`
   - `npm ci`
   - `npm run build`
4. Run migrations and start:
   - `npm run start:prod:migrate`

Frontend:
1. Copy env template: `cp frontend/.env.example frontend/.env.local`
2. Set API URL in `frontend/.env.local`
3. Install/build/start:
   - `cd frontend`
   - `npm ci`
   - `npm run build`
   - `npm run start`

### Default Login Credentials

After running seed (`npm run seed`):
- **Admin**: `admin1@healthtrack.app` / `password123`
- **Healthcare Staff**: `staff1@healthtrack.app` / `password123`
- **Guest**: `guest1@healthtrack.app` / `password123`

**Seed Data Created:**
- 5 Admin users
- 20 Healthcare Staff
- 3 Guest users
- 120 Patients with various statuses
- 14 Health Programs
- 20 Medications with different frequencies
- Patient enrollments, attendance records, and dispensations spanning 6 months

## User Guide

### For Admin Users

**Dashboard**: View system-wide metrics, charts, and recent activities

**Programs Management**: Create and manage health programs, assign medications, set session frequencies, assign healthcare staff

**Patient Management**: Register patients, enroll in programs, assign to healthcare staff, view progress

**Medications**: Create medications, set dosages and frequencies (Daily, Twice Daily, Weekly, Monthly)

**Users**: Manage user accounts, assign roles, assign staff to programs

**Reports**: Generate and export reports for patients, programs, medications, and attendance

**Activity Logs**: View complete audit trail of all system activities

### For Healthcare Staff

**Dashboard**: View metrics for assigned patients and programs

**My Patients**: View and manage only assigned patients

**Attendance**: Record session attendance (Present, Absent, Late, Excused, Canceled)

**Dispensations**: Dispense medications to assigned patients (with duplicate prevention)

**Reports**: Generate reports for assigned patients

**Notifications**: Receive alerts for overdue medications and missed sessions

### For Guest Users

**Programs**: View public program information only

**Read-Only Access**: Cannot access patient data, attendance, or dispensations

## RBAC Implementation

### Role-Based Access Control (RBAC)

The system implements a comprehensive role-based access control system with three roles:

#### 1. Admin Role
**Full System Access**
- ✅ Manage users (create, update, delete)
- ✅ Manage programs (full CRUD)
- ✅ Manage patients (full CRUD)
- ✅ Manage medications (full CRUD)
- ✅ Assign staff to programs
- ✅ View all data across the system
- ✅ Generate system-wide reports
- ✅ Access activity logs
- ✅ Access dashboard with all metrics

#### 2. Healthcare Staff Role
**Program & Patient Management**
- ✅ View assigned programs only
- ✅ Manage assigned patients
- ✅ Record session attendance
- ✅ Dispense medications to assigned patients
- ✅ View assigned patient data
- ✅ View medications for assigned programs
- ✅ Generate reports for assigned patients
- ❌ Cannot manage users
- ❌ Cannot create programs
- ❌ Cannot access unassigned patient data

#### 3. Guest Role
**Read-Only Public Access**
- ✅ View public program information
- ✅ View program types and schedules
- ❌ Cannot access patient data
- ❌ Cannot record attendance
- ❌ Cannot dispense medications
- ❌ Cannot manage any entities

### How RBAC Works

**Authentication Layer:**
- JWT tokens protect all routes
- Users must be authenticated to access the system
- Tokens expire after 24 hours for security

**Authorization Layer:**
- Role guards check user permissions before allowing access
- Data is filtered automatically based on user role
- Healthcare Staff see only their assigned patients and programs
- Frontend routes are protected based on user role

**Data Filtering:**
- Admin: Full access to all system data
- Healthcare Staff: Only assigned patients, programs, and related data
- Guest: Public program information only

**Audit Trail:**
- All actions are logged with user attribution
- Dispensations track which staff member performed the action
- Activity logs maintain complete history

### Security Features

**Password Security:** Bcrypt hashing, minimum password requirements

**Token Management:** JWT with expiration, automatic logout, token refresh

**Input Validation:** All inputs validated, TypeScript type checking, SQL injection prevention

**Authorization:** Role validation on every request, resource ownership verification

## Database Schema

### Core Entities

**User**: Stores user accounts with UUID, name, unique email, hashed password, role (Admin/Healthcare Staff/Guest), status, assigned programs, and timestamps.

**Program**: Health programs with auto-generated ID (PROG-001), name, type (Mental Health, Vaccination, Diabetes, etc.), session frequency (Daily/Weekly/Monthly), status, assigned medications and staff.

**Patient**: Patient records with auto-generated ID (P-1001), full name, date of birth, gender, contact information, address, status, and enrollment history.

**PatientEnrollment**: Links patients to programs with enrollment date, assigned healthcare staff, completion status, and end date.

**Medication**: Medications with auto-generated ID (M-001), name, dosage, frequency (Daily/Twice Daily/Weekly/Monthly), program type, status, and assigned programs.

**Dispensation**: Tracks medication dispensation with patient, medication, program, dispensed-by user, timestamp, quantity, notes, and duplicate prevention fields (bucketType, bucketStart). **UNIQUE constraint prevents duplicate collections.**

**Attendance**: Records session attendance with patient, program, date, status (Present/Absent/Late/Excused/Canceled), check-in time, and notes.

**Notification**: User notifications with type (Medication/Session/Alert/Info), title, message, read status, and optional link.

**ActivityLog**: Audit trail with user, activity type (Patient/Program/Medication/Attendance/User), description, metadata JSON, and timestamp.

### Entity Relationships

- Users have many activity logs, notifications, and dispensations
- Users and Programs have many-to-many relationship (staff assignments)
- Programs have many medications (many-to-many), enrollments, and attendance records
- Patients have many enrollments, dispensations, and attendance records
- Medications have many dispensations
- Enrollments link patients to programs with assigned staff

### Key Constraints & Indexes

**Unique Constraints:** User email, Dispensation (patientId + medicationId + bucketType + bucketStart)

**Indexes:** Created on frequently queried fields (email, role, patientId, programId, status, dates)

**Data Integrity:** Entities use soft delete to prevent accidental data loss

## Implementation Details

### Duplicate Prevention Logic

**Challenge:** Prevent duplicate medication collection based on frequency (daily, weekly, monthly).

**Solution:** Bucket-based duplicate prevention system:
- Each dispensation is assigned to a time bucket (DAY or MONTH)
- Bucket start time calculated based on medication frequency
- Database UNIQUE constraint on (patientId + medicationId + bucketType + bucketStart)
- Daily medications: Can only be collected once per day
- Weekly medications: Can only be collected once per week
- Monthly medications: Can only be collected once per month
- Twice-daily medications: Maximum 2 collections per day with additional validation

### Progress Tracking & Adherence Calculations

**Attendance Rate:** Calculated as (completed sessions / expected sessions) × 100, where expected sessions are based on program frequency and enrollment period.

**Medication Adherence Rate:** Calculated as (dispensed medications / expected medications) × 100, where expected medications are based on each medication's frequency and enrollment period.

### Assumptions & Design Decisions

**Program Enrollment:** Patients can be enrolled in multiple programs simultaneously. Enrollment requires healthcare staff assignment. Dates can be backdated for historical tracking.

**Medication Dispensation:** Medications are program-specific. Each dispensation records who dispensed it (accountability). Quantity tracked as string to support various units (tablets, ml, doses). Historical dispensations preserved for audit trail.

**Attendance Tracking:** Recorded per program session with multiple statuses (Present, Absent, Late, Excused, Canceled). Check-in time optional. Past attendance can be updated.

**User Management:** Admin accounts cannot self-register (security). Healthcare staff assigned to programs, patient access derived from program assignments. 


## Bonus Features Implemented

✅ **Status Badges**: Color-coded indicators for programs (Active/Inactive/Completed), patients, medications, and attendance statuses throughout the UI.

✅ **Alerts & Notifications**: Real-time notification system with medication due alerts, missed session notifications, notification bell with unread count, and mark as read/unread functionality.

✅ **Export Reports (CSV)**: Generate and download patient progress, program enrollment, medication dispensation, and attendance reports as CSV files with customizable date ranges.

✅ **Activity Logs / Audit Trail**: Complete searchable audit trail tracking all user actions (Patient, Program, Medication, Attendance, User operations) with timestamps, user attribution, and metadata..

✅ **Progress Tracking Charts**: Interactive data visualizations including Program Distribution (Pie Chart), Attendance Trends (Line Chart), and real-time dashboard metrics.


## Author

**Odile Duhirimana**
- GitHub: [@OdileDuhirimana](https://github.com/OdileDuhirimana)
- Email: odileduhirimana@gmail.com

---

**Submission Date**: November 3, 2025  
**Assessment**: Full-Stack Internship - Health Program & Medication Tracker
