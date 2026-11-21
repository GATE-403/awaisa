import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

type PushKind = 'web' | 'expo'

@Entity({ name: 'push_subscriptions' })
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string

  // `web` is a browser's Web Push subscription, `expo` the app's Expo push token.
  @Column({ type: 'varchar', length: 8, default: 'web' })
  kind: PushKind

  // The push service's address for this browser, or the app's Expo token; one device is one row
  // whoever signed in last.
  @Column({ type: 'text', unique: true })
  endpoint: string

  // Web Push encryption keys; an Expo token has none.
  @Column({ type: 'varchar', length: 128, nullable: true })
  p256dh: string | null

  @Column({ type: 'varchar', length: 64, nullable: true })
  auth: string | null

  @Column({ name: 'user_agent', type: 'varchar', length: 256, default: '' })
  userAgent: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'last_success_at', type: 'timestamptz', nullable: true })
  lastSuccessAt: Date | null
}

export type { PushKind }
