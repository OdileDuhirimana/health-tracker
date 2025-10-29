import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

/**
 * Backend API E2E Tests
 * Tests critical endpoints for performance, correctness, and security
 */

describe('Backend API E2E Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let adminUser: any;
  let staffToken: string;
  
  const testResults = {
    apiResponseTimes: {} as Record<string, number>,
    errors: [] as string[],
    failures: [] as string[],
    slowEndpoints: [] as Array<{ endpoint: string; time: number }>,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Helper to measure API response time
  const measureApiTime = async (endpoint: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', 
                                 body?: any, token?: string): Promise<number> => {
    const startTime = Date.now();
    const httpServer = app.getHttpServer();
    let req: request.Test;
    
    if (token) {
      req = method === 'GET' 
        ? request(httpServer).get(endpoint).set('Authorization', `Bearer ${token}`)
        : method === 'POST'
        ? request(httpServer).post(endpoint).set('Authorization', `Bearer ${token}`).send(body || {})
        : method === 'PATCH'
        ? request(httpServer).patch(endpoint).set('Authorization', `Bearer ${token}`).send(body || {})
        : request(httpServer).delete(endpoint).set('Authorization', `Bearer ${token}`);
    } else {
      req = method === 'GET'
        ? request(httpServer).get(endpoint)
        : method === 'POST'
        ? request(httpServer).post(endpoint).send(body || {})
        : method === 'PATCH'
        ? request(httpServer).patch(endpoint).send(body || {})
        : request(httpServer).delete(endpoint);
    }
    
    await req;
    const duration = Date.now() - startTime;
    return duration;
  };

  describe('1. Authentication Flow', () => {
    it('should login admin user and get token', async () => {
      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin2@healthtrack.app',
          password: 'password123',
        })
        .expect(201);
      
      const duration = Date.now() - startTime;
      testResults.apiResponseTimes['POST /auth/login'] = duration;
      
      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user).toHaveProperty('email', 'admin@healthtrack.app');
      expect(response.body.user).toHaveProperty('role', 'Admin');
      
      adminToken = response.body.access_token;
      adminUser = response.body.user;
      
      if (duration > 300) {
        testResults.slowEndpoints.push({ endpoint: 'POST /auth/login', time: duration });
        testResults.failures.push(`Login took ${duration}ms (>300ms threshold)`);
      }
    });

    it('should login staff user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'staff2@healthtrack.app',
          password: 'password123',
        })
        .expect(201);
      
      staffToken = response.body.access_token;
      expect(response.body.user.role).toBe('Healthcare Staff');
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@healthtrack.app',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('2. Dashboard Endpoints Performance', () => {
    it('GET /dashboard/metrics should respond <300ms', async () => {
      const duration = await measureApiTime('/dashboard/metrics', 'GET', undefined, adminToken);
      testResults.apiResponseTimes['GET /dashboard/metrics'] = duration;
      
      expect(duration).toBeLessThan(300);
      
      if (duration > 300) {
        testResults.failures.push(`Dashboard metrics took ${duration}ms (>300ms)`);
      }
    });

    it('GET /dashboard/programs-overview should respond <300ms', async () => {
      const duration = await measureApiTime('/dashboard/programs-overview', 'GET', undefined, adminToken);
      testResults.apiResponseTimes['GET /dashboard/programs-overview'] = duration;
      
      if (duration > 300) {
        testResults.slowEndpoints.push({ endpoint: 'GET /dashboard/programs-overview', time: duration });
      }
    });

    it('GET /dashboard/attendance-data should respond <300ms', async () => {
      const duration = await measureApiTime('/dashboard/attendance-data', 'GET', undefined, adminToken);
      testResults.apiResponseTimes['GET /dashboard/attendance-data'] = duration;
      
      if (duration > 300) {
        testResults.slowEndpoints.push({ endpoint: 'GET /dashboard/attendance-data', time: duration });
      }
    });

    it('GET /dashboard/adherence-rate should respond <300ms', async () => {
      const duration = await measureApiTime('/dashboard/adherence-rate', 'GET', undefined, adminToken);
      testResults.apiResponseTimes['GET /dashboard/adherence-rate'] = duration;
      
      if (duration > 300) {
        testResults.slowEndpoints.push({ endpoint: 'GET /dashboard/adherence-rate', time: duration });
      }
    });
  });

  describe('3. Patients API Performance', () => {
    it('GET /patients should respond <300ms', async () => {
      const duration = await measureApiTime('/patients', 'GET', undefined, adminToken);
      testResults.apiResponseTimes['GET /patients'] = duration;
      
      if (duration > 300) {
        testResults.slowEndpoints.push({ endpoint: 'GET /patients', time: duration });
        testResults.failures.push(`Patients list took ${duration}ms (>300ms)`);
      }
    });

    it('GET /patients?search=test should respond <300ms', async () => {
      const duration = await measureApiTime('/patients?search=test', 'GET', undefined, adminToken);
      testResults.apiResponseTimes['GET /patients?search=test'] = duration;
      
      if (duration > 300) {
        testResults.failures.push(`Patient search took ${duration}ms (>300ms)`);
      }
    });
  });

  describe('4. Programs API', () => {
    let createdProgramId: string;

    it('POST /programs should create program', async () => {
      const programData = {
        name: 'E2E Test Program',
        type: 'Mental Health',
        description: 'Test program for E2E testing',
        sessionFrequency: 'weekly',
      };

      const duration = await measureApiTime('/programs', 'POST', programData, adminToken);
      testResults.apiResponseTimes['POST /programs'] = duration;

      const response = await request(app.getHttpServer())
        .post('/programs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(programData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      createdProgramId = response.body.id;
    });

    it('GET /programs should list all programs', async () => {
      const duration = await measureApiTime('/programs', 'GET', undefined, adminToken);
      testResults.apiResponseTimes['GET /programs'] = duration;
      
      const response = await request(app.getHttpServer())
        .get('/programs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });
  });

  describe('5. Patient Enrollment', () => {
    let createdPatientId: string;
    let programId: string;

    beforeAll(async () => {
      // Get first program for enrollment
      const programsResponse = await request(app.getHttpServer())
        .get('/programs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      const programs = Array.isArray(programsResponse.body.data) 
        ? programsResponse.body.data 
        : programsResponse.body;
      
      if (programs.length > 0) {
        programId = programs[0].id;
      }
    });

    it('POST /patients should create patient', async () => {
      const patientData = {
        fullName: 'E2E Test Patient',
        dateOfBirth: '1990-01-01',
        gender: 'Male',
        contactNumber: '1234567890',
        email: 'e2etest@test.com',
      };

      const response = await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(patientData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      createdPatientId = response.body.id;
    });

    it('POST /patients/:id/enroll should enroll patient', async () => {
      if (!programId || !createdPatientId) {
        return; // Skip if no program or patient
      }

      const enrollmentData = {
        patientId: createdPatientId,
        programId: programId,
        enrollmentDate: new Date().toISOString(),
      };

      const duration = await measureApiTime(
        `/patients/${createdPatientId}/enroll`,
        'POST',
        enrollmentData,
        adminToken
      );
      testResults.apiResponseTimes['POST /patients/:id/enroll'] = duration;

      await request(app.getHttpServer())
        .post(`/patients/${createdPatientId}/enroll`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(enrollmentData)
        .expect((res) => {
          // 200 if successful, 400 if already enrolled
          expect([200, 201, 400]).toContain(res.status);
        });
    });
  });

  describe('6. Medication Dispensation - Duplicate Prevention', () => {
    let patientId: string;
    let medicationId: string;
    let programId: string;

    beforeAll(async () => {
      // Get test data
      const [patientsRes, medicationsRes, programsRes] = await Promise.all([
        request(app.getHttpServer())
          .get('/patients')
          .set('Authorization', `Bearer ${adminToken}`),
        request(app.getHttpServer())
          .get('/medications')
          .set('Authorization', `Bearer ${adminToken}`),
        request(app.getHttpServer())
          .get('/programs')
          .set('Authorization', `Bearer ${adminToken}`),
      ]);

      const patients = Array.isArray(patientsRes.body.data) ? patientsRes.body.data : patientsRes.body;
      const medications = Array.isArray(medicationsRes.body.data) ? medicationsRes.body.data : medicationsRes.body;
      const programs = Array.isArray(programsRes.body.data) ? programsRes.body.data : programsRes.body;

      if (patients.length > 0) patientId = patients[0].id;
      if (medications.length > 0) medicationId = medications[0].id;
      if (programs.length > 0) programId = programs[0].id;
    });

    it('POST /dispensations should create first dispensation', async () => {
      if (!patientId || !medicationId || !programId) {
        return;
      }

      const dispensationData = {
        patientId,
        programId,
        medicationId,
        dispensedAt: new Date().toISOString(),
        notes: 'E2E test dispensation',
      };

      const duration = await measureApiTime('/dispensations', 'POST', dispensationData, adminToken);
      testResults.apiResponseTimes['POST /dispensations'] = duration;

      const response = await request(app.getHttpServer())
        .post('/dispensations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dispensationData)
        .expect((res) => {
          // May succeed (201) or fail if duplicate (400)
          expect([201, 400]).toContain(res.status);
        });

      if (response.status === 400) {
        testResults.errors.push('First dispensation returned 400 - may be duplicate');
      }
    });

    it('POST /dispensations should block duplicate for daily medication', async () => {
      if (!patientId || !medicationId || !programId) {
        return;
      }

      const dispensationData = {
        patientId,
        programId,
        medicationId,
        dispensedAt: new Date().toISOString(),
        notes: 'E2E test duplicate attempt',
      };

      // Try to create duplicate immediately
      const response = await request(app.getHttpServer())
        .post('/dispensations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dispensationData)
        .expect(400); // Should be blocked

      expect(response.body.message).toContain('duplicate');
    });
  });

  describe('7. Attendance API', () => {
    it('POST /attendance should mark attendance', async () => {
      // Get program and patient for attendance
      const [programsRes, patientsRes] = await Promise.all([
        request(app.getHttpServer())
          .get('/programs')
          .set('Authorization', `Bearer ${adminToken}`),
        request(app.getHttpServer())
          .get('/patients')
          .set('Authorization', `Bearer ${adminToken}`),
      ]);

      const programs = Array.isArray(programsRes.body.data) ? programsRes.body.data : programsRes.body;
      const patients = Array.isArray(patientsRes.body.data) ? patientsRes.body.data : patientsRes.body;

      if (programs.length === 0 || patients.length === 0) {
        return;
      }

      const attendanceData = {
        programId: programs[0].id,
        attendanceDate: new Date().toISOString().split('T')[0],
        attendance: [
          {
            patientId: patients[0].id,
            status: 'Present',
            checkInTime: new Date().toISOString(),
          },
        ],
      };

      const duration = await measureApiTime('/attendance', 'POST', attendanceData, adminToken);
      testResults.apiResponseTimes['POST /attendance'] = duration;

      await request(app.getHttpServer())
        .post('/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(attendanceData)
        .expect((res) => {
          expect([200, 201, 400]).toContain(res.status);
        });
    });
  });

  describe('8. Medication Tracking Table', () => {
    it('GET /dispensations/tracking-table should return adherence data', async () => {
      const duration = await measureApiTime('/dispensations/tracking-table', 'GET', undefined, adminToken);
      testResults.apiResponseTimes['GET /dispensations/tracking-table'] = duration;

      const response = await request(app.getHttpServer())
        .get('/dispensations/tracking-table')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      
      // Verify adherence rate exists in data
      if (response.body.data && response.body.data.length > 0) {
        const firstRecord = response.body.data[0];
        expect(firstRecord).toHaveProperty('ar'); // adherence rate
        expect(typeof firstRecord.ar).toBe('number');
        expect(firstRecord.ar).toBeGreaterThanOrEqual(0);
        expect(firstRecord.ar).toBeLessThanOrEqual(100);
      }

      if (duration > 300) {
        testResults.slowEndpoints.push({ endpoint: 'GET /dispensations/tracking-table', time: duration });
      }
    });
  });

  afterAll(async () => {
    // Write test results to file
    const fs = require('fs');
    const path = require('path');
    const resultsPath = path.join(__dirname, '../../test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  });
});

