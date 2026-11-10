import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity({ name: 'telegram_link_codes' })
export class TelegramLinkCode {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  code: string

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date
}
