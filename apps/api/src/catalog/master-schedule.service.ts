import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm'
import type { BusyInterval, OpeningWindow } from '../bookings/availability.js'
import { businessDateTimeToUtc, toBusinessParts, weekdayOf } from '../common/business-time.js'
import { type MasterDay, offHoursAsBusy } from './master-hours.js'
import { Specialist } from './specialist.entity.js'
import { SpecialistHours } from './specialist-hours.entity.js'
import { SpecialistLeave } from './specialist-leave.entity.js'

type HoursInput = {
  hasOwnHours: boolean
  days: { weekday: number; opensMinutes: number; closesMinutes: number }[]
}

type LeaveInput = { startsOn: string; endsOn: string; reason: string }

const toLeaveView = (leave: SpecialistLeave) => ({
  id: leave.id,
  startsOn: leave.startsOn,
  endsOn: leave.endsOn,
  reason: leave.reason,
})

// Personal weeks and days away of masters, and what they mean for one date.
@Injectable()
export class MasterScheduleService {
  constructor(
    @InjectRepository(Specialist) private readonly specialists: Repository<Specialist>,
    @InjectRepository(SpecialistHours) private readonly hours: Repository<SpecialistHours>,
    @InjectRepository(SpecialistLeave) private readonly leaves: Repository<SpecialistLeave>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async getSchedule(businessId: string, specialistId: string) {
    const specialist = await this.owned(businessId, specialistId)
    const today = toBusinessParts(new Date()).dateKey
    const [hours, leaves] = await Promise.all([
      this.hours.find({ where: { specialistId }, order: { weekday: 'ASC' } }),
      this.leaves.find({
        where: { specialistId, endsOn: MoreThanOrEqual(today) },
        order: { startsOn: 'ASC' },
      }),
    ])

    return {
      hasOwnHours: specialist.hasOwnHours,
      hours: hours.map(({ weekday, opensMinutes, closesMinutes }) => ({
        weekday,
        opensMinutes,
        closesMinutes,
      })),
      leaves: leaves.map(toLeaveView),
    }
  }

  async setHours(businessId: string, specialistId: string, input: HoursInput) {
    await this.owned(businessId, specialistId)
    const weekdays = new Set(input.days.map((day) => day.weekday))
    if (weekdays.size !== input.days.length) throw new BadRequestException('Дни повторяются')
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Specialist, { id: specialistId }, { hasOwnHours: input.hasOwnHours })
      await manager.delete(SpecialistHours, { specialistId })
      if (input.hasOwnHours && input.days.length > 0) {
        await manager.insert(
          SpecialistHours,
          input.days.map((day) => ({ specialistId, ...day })),
        )
      }
    })

    return this.getSchedule(businessId, specialistId)
  }

  async addLeave(businessId: string, specialistId: string, input: LeaveInput) {
    await this.owned(businessId, specialistId)
    const leave = await this.leaves.save(this.leaves.create({ specialistId, ...input }))
    // Bookings already made for those days stay; staff move or cancel them.
    const [row] = (await this.dataSource.query(
      `SELECT COUNT(*)::int AS "count" FROM "bookings"
       WHERE "specialist_id" = $1 AND "status" = 'confirmed' AND "starts_at" >= $2 AND "starts_at" < $3`,
      [
        specialistId,
        businessDateTimeToUtc(input.startsOn, 0),
        businessDateTimeToUtc(input.endsOn, 24 * 60),
      ],
    )) as { count: number }[]

    return { leave: toLeaveView(leave), conflictingBookings: row?.count ?? 0 }
  }

  async removeLeave(businessId: string, specialistId: string, leaveId: string) {
    await this.owned(businessId, specialistId)
    await this.leaves.delete({ id: leaveId, specialistId })
  }

  /** Each master's day on `dateKey` (null = off), before clamping to the business window. */
  async daysFor(specialistIds: string[], dateKey: string, window: OpeningWindow | null) {
    const days = new Map<string, MasterDay>()
    if (specialistIds.length === 0) return days
    const [specialists, hours, leaves] = await Promise.all([
      this.specialists.find({
        where: { id: In(specialistIds) },
        select: { id: true, hasOwnHours: true },
      }),
      this.hours.findBy({ specialistId: In(specialistIds), weekday: weekdayOf(dateKey) }),
      this.leaves.findBy({
        specialistId: In(specialistIds),
        startsOn: LessThanOrEqual(dateKey),
        endsOn: MoreThanOrEqual(dateKey),
      }),
    ])
    const onLeave = new Set(leaves.map((leave) => leave.specialistId))
    for (const specialist of specialists) {
      const own = hours.find((row) => row.specialistId === specialist.id)
      days.set(
        specialist.id,
        onLeave.has(specialist.id)
          ? null
          : specialist.hasOwnHours
            ? own
              ? { opensMinutes: own.opensMinutes, closesMinutes: own.closesMinutes }
              : null
            : window,
      )
    }

    return days
  }

  /** Leaves on `dateKey`, so the schedule can say why a column is empty. */
  async leavesOn(specialistIds: string[], dateKey: string) {
    if (specialistIds.length === 0) return []
    const leaves = await this.leaves.findBy({
      specialistId: In(specialistIds),
      startsOn: LessThanOrEqual(dateKey),
      endsOn: MoreThanOrEqual(dateKey),
    })

    return leaves.map((leave) => ({ specialistId: leave.specialistId, ...toLeaveView(leave) }))
  }

  async offHoursBusy(specialistIds: string[], dateKey: string, window: OpeningWindow | null) {
    if (!window) return []
    const days = await this.daysFor(specialistIds, dateKey, window)

    return [...days.entries()].flatMap(([id, day]) => offHoursAsBusy(id, dateKey, window, day))
  }

  private async owned(businessId: string, specialistId: string) {
    const specialist = await this.specialists.findOneBy({ id: specialistId, businessId })
    if (!specialist) throw new NotFoundException('Мастер не найден')
    return specialist
  }
}

export type { HoursInput, LeaveInput }
