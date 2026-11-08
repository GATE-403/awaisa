import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity({ name: 'categories' })
export class Category {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string

  @Column({ type: 'varchar', length: 120 })
  name: string

  @Column({ type: 'int', default: 0 })
  position: number
}
