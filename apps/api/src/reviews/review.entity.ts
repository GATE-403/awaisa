import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'reviews' })
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string

  @Column({ name: 'specialist_id', type: 'varchar', length: 64 })
  specialistId: string

  @Column({ name: 'service_id', type: 'varchar', length: 64 })
  serviceId: string

  @Column({ type: 'smallint' })
  rating: number

  @Column({ type: 'text', default: '' })
  comment: string

  @Column({ name: 'author_name', type: 'varchar', length: 120 })
  authorName: string

  @Column({ type: 'text', nullable: true })
  reply: string | null

  @Column({ name: 'replied_at', type: 'timestamptz', nullable: true })
  repliedAt: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
