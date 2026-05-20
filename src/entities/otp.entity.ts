import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'email', referencedColumnName: 'email' })
  user: User;

  @Column()
  code: string;

  @Column()
  purpose: string; // 'EMAIL_VERIFICATION' or 'PASSWORD_RESET'

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
