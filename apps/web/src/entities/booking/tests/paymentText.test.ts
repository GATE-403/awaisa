import { setupI18n } from '@lingui/core'
import { describe, expect, it } from 'vitest'
import type { BookingPayment } from '@/shared/api/types'
import { makeFormat } from '@/shared/i18n/format'
import { describeDeposit as describeIn } from '../lib/paymentText'

const i18n = setupI18n({ locale: 'en', messages: { en: {} } })
const describeDeposit = (payment: BookingPayment) =>
  describeIn(payment, i18n._.bind(i18n), makeFormat(i18n))

const deposit = (status: BookingPayment['status']) =>
  // Only the amount and the status are read.
  ({ amount: 1500, status }) as BookingPayment

describe('describeDeposit', () => {
  it('says the deposit and what happened to it, one wording everywhere', () => {
    expect(describeDeposit(deposit('pending'))).toBe('Deposit 1,500\u00a0som awaiting payment')
    expect(describeDeposit(deposit('paid'))).toBe('Deposit 1,500\u00a0som paid')
    expect(describeDeposit(deposit('refunded'))).toBe('Deposit 1,500\u00a0som refunded')
    expect(describeDeposit(deposit('kept'))).toBe('Deposit 1,500\u00a0som kept')
    expect(describeDeposit(deposit('expired'))).toBe('Deposit 1,500\u00a0som not paid')
  })

  it('writes the amount in the page language', () => {
    const russian = setupI18n({ locale: 'ru', messages: { ru: {} } })
    expect(describeIn(deposit('paid'), russian._.bind(russian), makeFormat(russian))).toBe(
      'Deposit 1\u00a0500\u00a0сом paid',
    )
  })
})
