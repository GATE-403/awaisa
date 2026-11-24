import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { Category } from './category.entity.js'

@Entity({ name: 'services' })
export class Service {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string

  @Column({ name: 'category_id', type: 'varchar', length: 64 })
  categoryId: string

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category?: Category

  @Column({ type: 'varchar', length: 160 })
  name: string

  @Column({ type: 'text', default: '' })
  description: string

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number

  @Column({ type: 'int' })
  price: number

  /** Days after a visit to remind the client to come again; null = never. */
  @Column({ name: 'rebook_days', type: 'smallint', nullable: true })
  rebookDays: number | null

  /** Asked when booked online (som); null = no prepayment. */
  @Column({ type: 'int', nullable: true })
  deposit: number | null

  @Column({ name: 'is_popular', type: 'boolean', default: false })
  isPopular: boolean

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean

  @Column({ type: 'int', default: 0 })
  position: number
}
