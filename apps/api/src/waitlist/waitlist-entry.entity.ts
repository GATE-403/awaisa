import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

type WaitlistStatus = 'waiting' | 'notified' | 'cancelled' | 'expired'

@Entity('waitlist_entries')
export class WaitlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string

  @Column({ name: 'service_id', type: 'varchar', length: 64 })
  serviceId: string

  /** The services after the first in the same visit, in order (empty for one service). */
  @Column({
    name: 'extra_service_ids',
    type: 'varchar',
    length: 64,
    array: true,
    default: () => "'{}'",
  })
  extraServiceIds: string[]

  /** null = any master. */
  @Column({ name: 'specialist_id', type: 'varchar', length: 64, nullable: true })
  specialistId: string | null

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null

  @Column({ type: 'date' })
  date: string

  @Column({ name: 'customer_name', type: 'varchar', length: 120 })
  customerName: string

  @Column({ name: 'customer_phone', type: 'varchar', length: 32 })
  customerPhone: string

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null

  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash: string

  @Column({ type: 'varchar', length: 16, default: 'waiting' })
  status: WaitlistStatus

  /** The time that was free when the SMS went out. */
  @Column({ name: 'notified_time', type: 'varchar', length: 5, nullable: true })
  notifiedTime: string | null

  @Column({ name: 'notified_at', type: 'timestamptz', nullable: true })
  notifiedAt: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}

export type { WaitlistStatus }
