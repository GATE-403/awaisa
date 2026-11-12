import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'client_records' })
export class ClientRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string

  @Column({ type: 'varchar', length: 32 })
  phone: string

  /** Set by an import; clients who booked here take their name from the latest booking. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  name: string | null

  @Column({ type: 'text', default: '' })
  note: string

  @Column({ type: 'date', nullable: true })
  birthday: string | null

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
