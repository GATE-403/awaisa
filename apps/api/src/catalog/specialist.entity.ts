import { Column, Entity, JoinTable, ManyToMany, PrimaryColumn } from 'typeorm'
import { Service } from './service.entity.js'

const ratingTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
}

@Entity({ name: 'specialists' })
export class Specialist {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string

  @Column({ type: 'varchar', length: 160 })
  name: string

  @Column({ type: 'varchar', length: 120 })
  role: string

  @Column({ type: 'numeric', precision: 2, scale: 1, default: 5, transformer: ratingTransformer })
  rating: number

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
