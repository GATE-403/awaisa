import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Branch } from '../businesses/branch.entity.js'
import { Business } from '../businesses/business.entity.js'
import { Service } from '../catalog/service.entity.js'
import { Specialist } from '../catalog/specialist.entity.js'
import { Customer } from '../customers/customer.entity.js'

type BookingStatus = 'confirmed' | 'cancelled'

@Entity({ name: 'bookings' })
@Index('bookings_specialist_starts_at_idx', ['specialistId', 'startsAt'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business?: Business

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

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null

  @ManyToOne(() => Customer, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null

  @ManyToOne(() => Branch, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch | null

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null

  @Column({ name: 'sms_confirmation', type: 'boolean', default: true })
  smsConfirmation: boolean

  /** null = the client asked not to be reminded. */
  @Column({ name: 'reminder_minutes', type: 'int', nullable: true, default: 120 })
  reminderMinutes: number | null

  @Column({ name: 'reminder_sent_at', type: 'timestamptz', nullable: true })
  reminderSentAt: Date | null

  @Column({ type: 'varchar', length: 16, nullable: true })
  outcome: 'arrived' | 'no_show' | null

  @Column({ name: 'paid_amount', type: 'int', nullable: true })
  paidAmount: number | null

  @Column({ name: 'payment_method', type: 'varchar', length: 16, nullable: true })
  paymentMethod: 'cash' | 'card' | 'transfer' | 'subscription' | 'certificate' | null

  @Column({ name: 'outcome_at', type: 'timestamptz', nullable: true })
  outcomeAt: Date | null

  /** Filled by the view query (left join), not a column. */
  review?: { rating: number; comment: string; reply: string | null }

  @Column({ name: 'review_requested_at', type: 'timestamptz', nullable: true })
  reviewRequestedAt: Date | null

  /** The promotion the visit was booked with; the amount and title are kept as they were. */
  @Column({ name: 'promotion_id', type: 'uuid', nullable: true })
  promotionId: string | null

  @Column({ name: 'discount_amount', type: 'int', nullable: true })
  discountAmount: number | null

  @Column({ name: 'discount_title', type: 'varchar', length: 80, nullable: true })
  discountTitle: string | null

  /** When «пора прийти снова» went out for this visit. */
  @Column({ name: 'rebook_reminded_at', type: 'timestamptz', nullable: true })
  rebookRemindedAt: Date | null

  /** The deposit asked for when booked online (сом); null = none. */
  @Column({ name: 'deposit_amount', type: 'int', nullable: true })
  depositAmount: number | null

  /**
   * pending: the slot is held while the client pays · paid · refunded (cancelled early or by the
   * salon) · kept (cancelled late) · expired (never paid, the booking was released).
   */
  @Column({ name: 'payment_status', type: 'varchar', length: 16, nullable: true })
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'kept' | 'expired' | null

  @Column({ name: 'payment_due_at', type: 'timestamptz', nullable: true })
  paymentDueAt: Date | null

  @Column({ name: 'cancelled_by', type: 'varchar', length: 8, nullable: true })
  cancelledBy: 'client' | 'salon' | null

  /** Where it was booked: `online` (the site), `staff` (the cabinet) or `import`. */
  @Column({ type: 'varchar', length: 8, default: 'online' })
  source: 'online' | 'staff' | 'import'

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}

export type { BookingStatus }
