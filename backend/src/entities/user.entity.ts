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
import { Role } from './role.entity';

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

  @Column()
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

  // Relational RBAC: optional until fully switched from enum role
  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({ name: 'user_roles' })
  roles: Role[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

