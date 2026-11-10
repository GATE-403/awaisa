import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'telegram_chats' })
export class TelegramChat {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null

  // Telegram chat ids exceed 2³¹; bigint comes back as a string, which is what the API takes.
  @Column({ name: 'chat_id', type: 'bigint' })
  chatId: string

  @Column({ type: 'varchar', length: 64, default: '' })
  username: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
