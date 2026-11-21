import { createVerify, generateKeyPairSync } from 'node:crypto'
import type { ConfigService } from '@nestjs/config'
import type { BookingView } from '../bookings/booking-shared.js'
import type { Env } from '../config/env.js'
import { WalletService } from './wallet.service.js'

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})

const createService = (values: Partial<Env>) =>
  new WalletService({
    get: (key: keyof Env) =>
      ({ AUTH_SECRET: 'test-secret-test-secret-test-secret', ...values })[key],
  } as unknown as ConfigService<Env, true>)

const booking: BookingView = {
  id: '6f1c2d3e-0000-4000-8000-000000000001',
  status: 'confirmed',
  serviceId: 's1',
  serviceName: 'Мужская стрижка',
  price: 900,
  durationMinutes: 45,
  specialistId: 'm1',
  specialistName: 'Тимур',
  date: '2026-11-10',
  time: '14:30',
  startsAt: '2026-11-10T08:30:00.000Z',
  endsAt: '2026-11-10T09:15:00.000Z',
  review: null,
  isNoShow: false,
  isBySubscription: false,
  payment: null,
  discount: null,
  customerName: 'Данияр',
  business: {
    slug: 'awaisa-studio',
    name: 'Awaisa Studio',
    address: 'Токтогула 1',
    phone: '',
    mapUrl: '',
  },
}

describe('WalletService', () => {
  it('is off until certificates are configured', () => {
    const service = createService({})
    expect(service.isAppleEnabled).toBe(false)
    expect(service.isGoogleEnabled).toBe(false)
    expect(service.createLinks(booking.id, '/api')).toEqual({ apple: null })
    expect(service.createGoogleLink(booking, 'https://awaisa.kg')).toBeNull()
  })

  it('signs short-lived Apple links and rejects tampered ones', () => {
    const service = createService({
      WALLET_PASS_TYPE_ID: 'pass.kg.awaisa',
      WALLET_TEAM_ID: 'TEAM',
      WALLET_CERT_PEM: 'cert',
      WALLET_KEY_PEM: 'key',
      WALLET_WWDR_PEM: 'wwdr',
    })
    const { apple } = service.createLinks(booking.id, '/api')
    const url = new URL(apple ?? '', 'https://awaisa.kg')
    const expires = url.searchParams.get('expires') ?? ''
    const signature = url.searchParams.get('signature') ?? ''

    expect(url.pathname).toBe(`/api/wallet/apple/${booking.id}`)
    expect(() => service.verifyLink(booking.id, expires, signature)).not.toThrow()
    expect(() => service.verifyLink(booking.id, String(Number(expires) + 1), signature)).toThrow()
    expect(() => service.verifyLink('other-id', expires, signature)).toThrow()
  })

  it('builds a Google Wallet link signed by the service account', () => {
    const service = createService({
      GOOGLE_WALLET_ISSUER_ID: '3388000000000000000',
      GOOGLE_WALLET_SERVICE_ACCOUNT: JSON.stringify({
        client_email: 'wallet@awaisa.iam.gserviceaccount.com',
        private_key: privateKey,
      }),
    })
    const link = service.createGoogleLink(booking, 'https://awaisa.kg') ?? ''
    const [header = '', payload = '', signature = ''] = link
      .replace('https://pay.google.com/gp/v/save/', '')
      .split('.')
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString())

    expect(claims).toMatchObject({
      aud: 'google',
      typ: 'savetowallet',
      origins: ['https://awaisa.kg'],
    })
    expect(claims.payload.genericObjects[0]).toMatchObject({
      classId: '3388000000000000000.awaisa_booking',
      state: 'ACTIVE',
    })
    expect(
      createVerify('RSA-SHA256')
        .update(`${header}.${payload}`)
        .verify(publicKey, Buffer.from(signature, 'base64url')),
    ).toBe(true)
  })
})
