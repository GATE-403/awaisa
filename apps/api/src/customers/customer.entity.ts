import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'customers' })
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 16, unique: true })
  phone: string

  @Column({ type: 'varchar', length: 120, default: '' })
  name: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
