import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Patient } from './patient.entity';
import { Program } from './program.entity';
import { User } from './user.entity';

@Entity('patient_enrollments')
export class PatientEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Patient, (patient) => patient.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column()
  @Index()
  patientId: string;

  @ManyToOne(() => Program, (program) => program.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'programId' })
  program: Program;

  @Column()
  @Index()
  programId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedStaffId' })
  assignedStaff: User;

  @Column({ nullable: true })
  @Index()
  assignedStaffId: string;

  @Column({ type: 'date' })
  enrollmentDate: Date;

  // End date computed from program duration or explicitly set
  @Column({ type: 'date', nullable: true })
  endDate: Date;

  // Completion date: enrollmentDate + program.durationInDays
  @Column({ type: 'date', nullable: true })
  completedDate: Date;

  // Progress metrics
  @Column({ type: 'float', nullable: true })
  adherenceRate: number;

  @Column({ type: 'float', nullable: true })
  attendanceRate: number;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ nullable: true })
  completionNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

