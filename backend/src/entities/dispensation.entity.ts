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
import { Medication } from './medication.entity';
import { Program } from './program.entity';
import { User } from './user.entity';

@Entity('dispensations')
@Unique('uq_dispensation_bucket', ['patientId', 'medicationId', 'bucketType', 'bucketStart'])
export class Dispensation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Patient, (patient) => patient.dispensations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column()
  @Index()
  patientId: string;

  @ManyToOne(() => Medication, (medication) => medication.dispensations)
  @JoinColumn({ name: 'medicationId' })
  medication: Medication;

  @Column()
  @Index()
  medicationId: string;

  @ManyToOne(() => Program)
  @JoinColumn({ name: 'programId' })
  program: Program;

  @Column()
  @Index()
  programId: string;

  @Column({ type: 'timestamp' })
  @Index()
  dispensedAt: Date;

  // Expected vs actual tracking
  @Column({ type: 'timestamp', nullable: true })
  nextDueDate?: Date;

  @Column({ default: false })
  missed?: boolean;

  @Column({ default: false })
  duplicateAttempt?: boolean;

  @Column({ nullable: true })
  notes: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'dispensedById' })
  dispensedBy: User;

  @Column()
  @Index()
  dispensedById: string;

  // Duplicate-prevention bucketting
  // bucketType: 'DAY' | 'MONTH'
  @Column({ type: 'varchar', length: 10, nullable: true })
  @Index()
  bucketType: 'DAY' | 'MONTH';

  // bucketStart: start of day/month in UTC to enforce uniqueness per window
  @Column({ type: 'timestamp', nullable: true })
  @Index()
  bucketStart: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

