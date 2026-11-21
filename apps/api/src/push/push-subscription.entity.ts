import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'push_subscriptions' })
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string

  // The push service's address for this browser; one browser is one row whoever signed in last.
  @Column({ type: 'text', unique: true })
  endpoint: string

  @Column({ type: 'varchar', length: 128 })
  p256dh: string

  @Column({ type: 'varchar', length: 64 })
  auth: string

  @Column({ name: 'user_agent', type: 'varchar', length: 256, default: '' })
  userAgent: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'last_success_at', type: 'timestamptz', nullable: true })
  lastSuccessAt: Date | null
}
