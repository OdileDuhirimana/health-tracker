import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Program } from './program.entity';
import { PatientEnrollment } from './patient-enrollment.entity';

export enum UserRole {
  ADMIN = 'Admin',
  HEALTHCARE_STAFF = 'Healthcare Staff',
  GUEST = 'Guest',
}

export enum UserStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  // `select: false` is the actual enforcement mechanism against password-hash
  // leakage — not the ad hoc `const { password: _, ...result } = user`
  // destructuring scattered across services. That pattern only protects the
  // *direct* User row a service happens to remember to strip; it does
  // nothing for a User loaded transitively via a relation (e.g. a
  // Dispensation's `dispensedBy`, an Attendance's `markedBy`, or a Program's
  // `assignedStaff`), which serialized straight into API responses with the
  // bcrypt hash included — a real, previously-undetected vulnerability found
  // via direct API verification. With `select: false`, TypeORM omits this
  // column from every query by default, including relations, unless a call
  // site explicitly opts back in (see AuthService.validateUser and
  // AuthService.updateProfile, the only two places that legitimately need
  // the hash to run bcrypt.compare against it).
  @Column({ select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.HEALTHCARE_STAFF,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @ManyToMany(() => Program, (program) => program.assignedStaff)
  @JoinTable({ name: 'user_programs' })
  assignedPrograms: Program[];

  @OneToMany(() => PatientEnrollment, (enrollment) => enrollment.assignedStaff)
  assignedPatients: PatientEnrollment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

