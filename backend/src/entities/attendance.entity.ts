import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Patient } from './patient.entity';
import { Program } from './program.entity';
import { User } from './user.entity';

export enum AttendanceStatus {
  PRESENT = 'Present',  // attended
  ABSENT = 'Absent',   // missed
  LATE = 'Late',
  EXCUSED = 'Excused',
  CANCELED = 'Canceled', // canceled with reason in notes
}

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Patient, (patient) => patient.attendances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column()
  @Index()
  patientId: string;

  @ManyToOne(() => Program, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'programId' })
  program: Program;

  @Column({ nullable: true })
  @Index()
  programId: string;

  @Column({ type: 'date', nullable: true })
  @Index()
  attendanceDate: Date;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.ABSENT,
  })
  status: AttendanceStatus;

  // Computed helpers
  @Column({ type: 'int', nullable: true })
  sessionNumber?: number;

  @Column({ default: false })
  isMissed?: boolean;

  @Column({ type: 'timestamp', nullable: true })
  checkInTime: Date;

  @Column({ nullable: true })
  notes: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'markedById' })
  markedBy: User;

  @Column()
  @Index()
  markedById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

