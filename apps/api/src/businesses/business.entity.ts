import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm'
import { WorkingHours } from './working-hours.entity.js'

type BusinessKind = 'beauty' | 'barber' | 'nails' | 'spa' | 'health' | 'other'

@Entity({ name: 'businesses' })
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 48, unique: true })
  slug: string

  @Column({ type: 'varchar', length: 120 })
  name: string

  @Column({ type: 'varchar', length: 32, default: 'beauty' })
  kind: BusinessKind

  @Column({ type: 'text', default: '' })
  description: string

  @Column({ type: 'varchar', length: 80, default: 'Бишкек' })
  city: string

  @Column({ type: 'varchar', length: 200, default: '' })
  address: string

  @Column({ type: 'varchar', length: 16, default: '' })
  phone: string

  @Column({ type: 'varchar', length: 16, default: '' })
  whatsapp: string

  @Column({ name: 'map_url', type: 'varchar', length: 500, default: '' })
  mapUrl: string

  @Column({ name: 'slot_minutes', type: 'int', default: 30 })
  slotMinutes: number

  @Column({ name: 'is_published', type: 'boolean', default: true })
  isPublished: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @OneToMany(
    () => WorkingHours,
    (hours) => hours.business,
  )
  hours?: Relation<WorkingHours[]>
}

export type { BusinessKind }
