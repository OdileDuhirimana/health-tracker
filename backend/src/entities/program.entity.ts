import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  OneToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Medication } from './medication.entity';
import { PatientEnrollment } from './patient-enrollment.entity';

export enum ProgramType {
  MENTAL_HEALTH = 'Mental Health',
  VACCINATION = 'Vaccination',
  DIABETES = 'Diabetes',
  OTHER = 'Other',
}

export enum ProgramStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export enum SessionFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum DurationUnit {
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
}

@Entity('programs')
export class Program {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column({
    type: 'enum',
    enum: ProgramType,
  })
  @Index()
  type: ProgramType;

  @Column('text', { nullable: true })
  description: string;

  // Duration & metrics
  @Column({ type: 'int', nullable: true })
  duration: number;

  @Column({
    type: 'enum',
    enum: DurationUnit,
    nullable: true,
  })
  durationUnit: DurationUnit;

  // Computed field: duration converted to days
  @Column({ type: 'int', default: 90 })
  durationInDays: number;

  @Column({ type: 'int', nullable: true })
  totalSessions?: number;

  @Column({
    type: 'enum',
    enum: ProgramStatus,
    default: ProgramStatus.ACTIVE,
  })
  @Index()
  status: ProgramStatus;

  @Column({
    type: 'enum',
    enum: SessionFrequency,
    default: SessionFrequency.WEEKLY,
  })
  sessionFrequency: SessionFrequency;

  @Column('json', { nullable: true })
  components?: Array<{
    type: 'session' | 'consultation' | 'group_discussion';
    name: string;
    description?: string;
  }>;

  @ManyToMany(() => Medication, (medication) => medication.programs)
  @JoinTable({ name: 'program_medications' })
  medications: Medication[];

  @ManyToMany(() => User, (user) => user.assignedPrograms)
  assignedStaff: User[];

  @OneToMany(() => PatientEnrollment, (enrollment) => enrollment.program)
  enrollments: PatientEnrollment[];


  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

