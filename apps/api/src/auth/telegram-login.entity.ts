import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

type TelegramLoginStatus = 'pending' | 'confirmed' | 'used'

// One «Войти через Telegram» attempt: the page's token (hashed), the chat that opened it, and
// the number the person shared there.
@Entity({ name: 'telegram_logins' })
export class TelegramLogin {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  tokenHash: string

  @Column({ name: 'chat_id', type: 'varchar', length: 32, nullable: true })
  chatId: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null

  @Column({ type: 'varchar', length: 12, default: 'pending' })
  status: TelegramLoginStatus

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}

export type { TelegramLoginStatus }
