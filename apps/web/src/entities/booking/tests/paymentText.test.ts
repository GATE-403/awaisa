import { describe, expect, it } from 'vitest'
import type { BookingPayment } from '@/shared/api/types'
import { describeDeposit } from '../lib/paymentText'

const deposit = (status: BookingPayment['status']) =>
  // Only the amount and the status are read.
  ({ amount: 1500, status }) as BookingPayment

describe('describeDeposit', () => {
  it('says the deposit and what happened to it, one wording everywhere', () => {
    expect(describeDeposit(deposit('pending'))).toBe('Предоплата 1\u00a0500\u00a0сом ждёт оплаты')
    expect(describeDeposit(deposit('paid'))).toBe('Предоплата 1\u00a0500\u00a0сом внесена')
    expect(describeDeposit(deposit('refunded'))).toBe('Предоплата 1\u00a0500\u00a0сом возвращена')
    expect(describeDeposit(deposit('kept'))).toBe('Предоплата 1\u00a0500\u00a0сом удержана')
    expect(describeDeposit(deposit('expired'))).toBe('Предоплата 1\u00a0500\u00a0сом не оплачена')
  })
})
