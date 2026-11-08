import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Specialist } from '../catalog/specialist.entity.js'

@Entity({ name: 'time_off' })
@Index('time_off_specialist_starts_at_idx', ['specialistId', 'startsAt'])
export class TimeOff {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'specialist_id', type: 'varchar', length: 64 })
  specialistId: string

  @ManyToOne(() => Specialist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'specialist_id' })
  specialist?: Specialist

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date

  @Column({ type: 'varchar', length: 160, default: '' })
  reason: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
