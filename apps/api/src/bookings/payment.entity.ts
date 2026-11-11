import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

// One attempt to pay a booking's deposit through the configured acquirer.
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string

  @Column({ type: 'int' })
  amount: number

  @Column({ type: 'varchar', length: 32 })
  provider: string

  /** The acquirer's id for this payment, once it has one. */
  @Column({ name: 'provider_ref', type: 'varchar', length: 128, nullable: true })
  providerRef: string | null

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null

  @Column({ name: 'refunded_at', type: 'timestamptz', nullable: true })
  refundedAt: Date | null
}
