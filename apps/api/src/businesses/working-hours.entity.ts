import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm'
import { Business } from './business.entity.js'

@Entity({ name: 'working_hours' })
export class WorkingHours {
  @PrimaryColumn({ name: 'business_id', type: 'uuid' })
  businessId: string

  @PrimaryColumn({ type: 'smallint' })
  weekday: number

  @Column({ name: 'opens_minutes', type: 'int' })
  opensMinutes: number

  @Column({ name: 'closes_minutes', type: 'int' })
  closesMinutes: number

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business?: Relation<Business>
}
