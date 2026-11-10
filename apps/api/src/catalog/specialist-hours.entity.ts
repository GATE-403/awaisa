import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity({ name: 'specialist_hours' })
export class SpecialistHours {
  @PrimaryColumn({ name: 'specialist_id', type: 'varchar', length: 64 })
  specialistId: string

  // 0 = Monday, like working_hours.
  @PrimaryColumn({ type: 'smallint' })
  weekday: number

  @Column({ name: 'opens_minutes', type: 'int' })
  opensMinutes: number

  @Column({ name: 'closes_minutes', type: 'int' })
  closesMinutes: number
}
