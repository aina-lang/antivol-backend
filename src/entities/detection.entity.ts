import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('detections')
export class Detection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bleId: string;

  @Column({ type: 'double' })
  latitude: number;

  @Column({ type: 'double' })
  longitude: number;

  @Column({ type: 'float' })
  accuracy: number;

  @Column({ type: 'bigint' })
  timestamp: string; // Stored as string to handle JavaScript number/bigint serialization cleanly in TypeORM

  @CreateDateColumn()
  createdAt: Date;
}
