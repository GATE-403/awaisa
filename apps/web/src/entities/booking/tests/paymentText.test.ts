import { describe, expect, it } from 'vitest'
import type { BookingPayment } from '@/shared/api/types'
import { describeDeposit } from '../lib/paymentText'

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
})
