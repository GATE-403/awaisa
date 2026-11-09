import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

const coordinateTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
}

@Entity({ name: 'branches' })
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string

  @Column({ type: 'varchar', length: 120 })
  name: string

  @Column({ type: 'varchar', length: 200, default: '' })
  address: string

  @Column({ type: 'varchar', length: 32, default: '' })
  phone: string

  @Column({ type: 'double precision', nullable: true, transformer: coordinateTransformer })
  latitude: number | null

  @Column({ type: 'double precision', nullable: true, transformer: coordinateTransformer })
  longitude: number | null

  @Column({ type: 'int', default: 0 })
  position: number

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}

type BranchView = Pick<Branch, 'id' | 'name' | 'address' | 'phone' | 'latitude' | 'longitude'> & {
  isActive?: boolean
}

const toBranchView = (branch: Branch, includeInactive = false): BranchView => ({
  id: branch.id,
  name: branch.name,
  address: branch.address,
  phone: branch.phone,
  latitude: branch.latitude,
  longitude: branch.longitude,
  ...(includeInactive ? { isActive: branch.isActive } : {}),
})

export type { BranchView }
export { toBranchView }
