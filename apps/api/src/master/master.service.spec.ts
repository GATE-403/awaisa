import type { DataSource } from 'typeorm'
import type { OutcomeBody } from '../admin/admin.schemas.js'
import type { BookingsService } from '../bookings/bookings.service.js'
import type { SalonBookingsService } from '../bookings/salon-bookings.service.js'
import type { BusinessesService } from '../businesses/businesses.service.js'
import type { MasterScheduleService } from '../catalog/master-schedule.service.js'
import type { Specialist } from '../catalog/specialist.entity.js'
import type { FollowsService } from '../follows/follows.service.js'
import type { PayrollService } from '../payroll/payroll.service.js'
import { MasterService } from './master.service.js'

const master = { id: 'master-1', name: 'Эрлан' } as Specialist

const setup = (booking: { specialistId: string } | null) => {
  const bookings = { findById: vi.fn(async () => booking) }
  const salonBookings = { setOutcome: vi.fn(async () => ({ id: 'booking-1' })) }
  const service = new MasterService(
    { query: vi.fn() } as unknown as DataSource,
    bookings as unknown as BookingsService,
    salonBookings as unknown as SalonBookingsService,
    {} as BusinessesService,
    {} as MasterScheduleService,
    {} as PayrollService,
    {} as FollowsService,
  )
  return { service, salonBookings }
}

const body = { outcome: 'arrived' } as OutcomeBody

describe('MasterService.setOutcome', () => {
  it('marks the master’s own visit', async () => {
    const { service, salonBookings } = setup({ specialistId: 'master-1' })

    await service.setOutcome('biz-1', master, 'booking-1', body)

    expect(salonBookings.setOutcome).toHaveBeenCalledWith('biz-1', 'booking-1', body)
  })

  it('refuses a colleague’s visit or one that does not exist', async () => {
    for (const booking of [{ specialistId: 'master-2' }, null]) {
      const { service, salonBookings } = setup(booking)

      await expect(service.setOutcome('biz-1', master, 'booking-1', body)).rejects.toThrow(
        'This booking belongs to another specialist',
      )
      expect(salonBookings.setOutcome).not.toHaveBeenCalled()
    }
  })
})
