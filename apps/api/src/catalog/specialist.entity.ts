import { Column, Entity, JoinTable, ManyToMany, PrimaryColumn } from 'typeorm'
import { Service } from './service.entity.js'

const ratingTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
}

@Entity({ name: 'specialists' })
export class Specialist {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string

  @Column({ type: 'varchar', length: 160 })
  name: string

  @Column({ type: 'varchar', length: 120 })
  role: string

  @Column({
    type: 'numeric',
    precision: 2,
    scale: 1,
    nullable: true,
    transformer: ratingTransformer,
  })
  rating: number | null

  /** null = works at every branch. */
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null

  @Column({ name: 'photo_url', type: 'varchar', length: 512, nullable: true })
  photoUrl: string | null

  /** E.164; the master signs in with it to see their own day (`/master/<slug>`). */
  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null

  /** false = works the business hours; true = `specialist_hours` rows (no row = day off). */
  @Column({ name: 'has_own_hours', type: 'boolean', default: false })
  hasOwnHours: boolean

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean

  @Column({ type: 'int', default: 0 })
  position: number

  @ManyToMany(() => Service)
  @JoinTable({
    name: 'specialist_services',
    joinColumn: { name: 'specialist_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'service_id', referencedColumnName: 'id' },
  })
  services?: Service[]
}
