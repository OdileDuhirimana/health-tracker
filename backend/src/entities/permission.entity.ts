import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany } from 'typeorm';
import { Role } from './role.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) key: string; // e.g., 'program.create', 'attendance.mark'
  @Column({ nullable: true }) description?: string;

  @ManyToMany(() => Role, (r) => r.permissions)
  roles: Role[];

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}


