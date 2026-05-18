import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  code: string;

  @Column()
  purpose: string; // 'EMAIL_VERIFICATION' or 'PASSWORD_RESET'

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
