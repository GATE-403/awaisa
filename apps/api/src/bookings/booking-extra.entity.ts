import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { Service } from '../catalog/service.entity.js'

/** A service done in the same visit after the booking's first one (`bookings.service_id`). */
@Entity({ name: 'booking_extras' })
export class BookingExtra {
  @PrimaryColumn({ name: 'booking_id', type: 'uuid' })
  bookingId: string

  /** 1, 2, …: the order the services are done in (the booking's own service is 0). */
  @PrimaryColumn({ type: 'smallint' })
  position: number

  @Column({ name: 'service_id', type: 'varchar', length: 64 })
  serviceId: string

  @ManyToOne(() => Service, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'service_id' })
  service?: Service
}
