import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'
import type { PromotionKind } from './pricing.js'

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string

  @Column({ type: 'varchar', length: 80 })
  title: string

  @Column({ type: 'varchar', length: 16 })
  kind: PromotionKind

  @Column({ type: 'smallint' })
  percent: number

  @Column({ type: 'varchar', length: 40, nullable: true })
  code: string | null

  @Column({ type: 'smallint', array: true, nullable: true })
  weekdays: number[] | null

  @Column({ name: 'from_minutes', type: 'smallint', nullable: true })
  fromMinutes: number | null

  @Column({ name: 'to_minutes', type: 'smallint', nullable: true })
  toMinutes: number | null

  @Column({ name: 'service_ids', type: 'varchar', length: 64, array: true, nullable: true })
  serviceIds: string[] | null

  @Column({ name: 'starts_on', type: 'date', nullable: true })
  startsOn: string | null

  @Column({ name: 'ends_on', type: 'date', nullable: true })
  endsOn: string | null

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
