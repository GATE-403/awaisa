import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Service } from '../catalog/service.entity.js'
import { Specialist } from '../catalog/specialist.entity.js'

type BookingStatus = 'confirmed' | 'cancelled'

@Entity({ name: 'bookings' })
@Index('bookings_specialist_starts_at_idx', ['specialistId', 'startsAt'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'service_id', type: 'varchar', length: 64 })
  serviceId: string

  @ManyToOne(() => Service, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_id' })
  service?: Service

  @Column({ name: 'specialist_id', type: 'varchar', length: 64 })
  specialistId: string

  @ManyToOne(() => Specialist, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'specialist_id' })
  specialist?: Specialist

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date

  @Column({ name: 'customer_name', type: 'varchar', length: 120 })
  customerName: string

  @Column({ name: 'customer_phone', type: 'varchar', length: 32 })
  customerPhone: string

  @Column({ type: 'text', default: '' })
  comment: string

  @Column({ type: 'varchar', length: 16, default: 'confirmed' })
  status: BookingStatus

  @Column({ name: 'cancel_token_hash', type: 'varchar', length: 64 })
  cancelTokenHash: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}

export type { BookingStatus }
