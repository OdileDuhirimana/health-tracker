import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { PatientEnrollment } from './patient-enrollment.entity';
import { Dispensation } from './dispensation.entity';
import { Attendance } from './attendance.entity';

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other',
}

export enum PatientStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({ type: 'date' })
  dateOfBirth: Date;

  @Column({
    type: 'enum',
    enum: Gender,
  })
  gender: Gender;

  @Column({ nullable: true })
  @Index()
  contactNumber: string;

  @Column({ nullable: true })
  @Index()
  email: string;

  @Column('text', { nullable: true })
  address: string;

  @Column({ nullable: true })
  emergencyContact: string;

  @Column('text', { nullable: true })
  medicalNotes: string;

  @Column({
    type: 'enum',
    enum: PatientStatus,
    default: PatientStatus.ACTIVE,
  })
  @Index()
  status: PatientStatus;

  @Column({ unique: true })
  @Index()
  patientId: string; // Auto-generated like P-1001

  @OneToMany(() => PatientEnrollment, (enrollment) => enrollment.patient)
  enrollments: PatientEnrollment[];

  @OneToMany(() => Dispensation, (dispensation) => dispensation.patient)
  dispensations: Dispensation[];

  @OneToMany(() => Attendance, (attendance) => attendance.patient)
  attendances: Attendance[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

