import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

type OtpChannel = 'telegram' | 'sms'

@Entity({ name: 'otp_codes' })
@Index('otp_codes_phone_created_at_idx', ['phone', 'createdAt'])
export class OtpCode {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 16 })
  phone: string

  @Column({ name: 'code_hash', type: 'varchar', length: 64 })
  codeHash: string

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date

  @Column({ type: 'int', default: 0 })
  attempts: number

  @Column({ type: 'varchar', length: 16, default: 'sms' })
  channel: OtpChannel

  @Column({ name: 'provider_request_id', type: 'varchar', length: 64, nullable: true })
  providerRequestId: string | null

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}

export type { OtpChannel }
