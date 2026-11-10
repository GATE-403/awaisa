import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'specialist_leaves' })
export class SpecialistLeave {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'specialist_id', type: 'varchar', length: 64 })
  specialistId: string

  @Column({ name: 'starts_on', type: 'date' })
  startsOn: string

  @Column({ name: 'ends_on', type: 'date' })
  endsOn: string

  @Column({ type: 'varchar', length: 160, default: '' })
  reason: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
