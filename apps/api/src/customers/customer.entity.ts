import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'customers' })
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 16, unique: true })
  phone: string

  @Column({ type: 'varchar', length: 120, default: '' })
  name: string

  @Column({ name: 'avatar_url', type: 'varchar', length: 512, nullable: true })
  avatarUrl: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
