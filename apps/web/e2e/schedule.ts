import type { Page } from '@playwright/test'
import { createVisit, type OwnBusiness } from './business'

// The cabinet's day: the board, a visit's card on it, a visit of the business's one master ahead.
const board = (page: Page) => page.locator('[data-schedule-board]')

const visitCard = (page: Page, name: string) =>
  board(page).getByRole('button', { name: new RegExp(`, ${name}, `) })

const book = (business: OwnBusiness, name: string) =>
  createVisit({
    slug: business.slug,
    serviceId: business.service.id,
    specialistId: business.master.id,
    name,
  })

export { board, book, visitCard }
