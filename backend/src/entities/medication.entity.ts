import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  OneToMany,
  Index,
} from 'typeorm';
import { Program } from './program.entity';
import { Dispensation } from './dispensation.entity';

export enum MedicationFrequency {
  DAILY = 'Daily',
  TWICE_DAILY = 'Twice Daily',
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly',
}

export enum MedicationStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

@Entity('medications')
export class Medication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column()
  dosage: string;

  @Column({
    type: 'enum',
    enum: MedicationFrequency,
    default: MedicationFrequency.DAILY,
  })
  frequency: MedicationFrequency;

  @Column({
    type: 'enum',
    enum: MedicationStatus,
    default: MedicationStatus.ACTIVE,
  })
  @Index()
  status: MedicationStatus;

  @Column({ nullable: true })
  @Index()
  programType?: string; // Program type category (Mental Health, Vaccination, Diabetes...)

  @ManyToMany(() => Program, (program) => program.medications)
  programs: Program[];

  @OneToMany(() => Dispensation, (dispensation) => dispensation.medication)
  dispensations: Dispensation[];

  // Default supply duration to compute next due date
  @Column({ type: 'int', default: 30 })
  supplyDurationDays: number;

  @Column({ unique: true })
  medicationId: string; 

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

