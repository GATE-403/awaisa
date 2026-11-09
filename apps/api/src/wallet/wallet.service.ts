import { createHmac, createSign, timingSafeEqual } from 'node:crypto'
import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PKPass } from 'passkit-generator'
import sharp from 'sharp'
import type { BookingView } from '../bookings/bookings.service.js'
import type { Env } from '../config/env.js'

const LINK_TTL_MS = 10 * 60_000
const BRAND_BLUE = 'rgb(0, 113, 227)'

type GoogleServiceAccount = { client_email: string; private_key: string }

const base64url = (value: Buffer | string) => Buffer.from(value).toString('base64url')

// A plain rounded "A" in the brand blue: Wallet needs an icon, we don't ship image assets.
const ICON_SVG = (size: number) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#0071e3"/><text x="50" y="69" font-family="Helvetica, Arial, sans-serif" font-size="58" font-weight="700" fill="#fff" text-anchor="middle">A</text></svg>`,
  )

@Injectable()
export class WalletService {
  private icons: Promise<Record<string, Buffer>> | null = null

  constructor(private readonly config: ConfigService<Env, true>) {}

  get isAppleEnabled() {
    return Boolean(
      this.get('WALLET_PASS_TYPE_ID') &&
        this.get('WALLET_TEAM_ID') &&
        this.get('WALLET_CERT_PEM') &&
        this.get('WALLET_KEY_PEM') &&
        this.get('WALLET_WWDR_PEM'),
    )
  }

  get isGoogleEnabled() {
    return Boolean(this.get('GOOGLE_WALLET_ISSUER_ID') && this.googleAccount())
  }

  /**
   * Short-lived links: the booking token never goes into a URL, only an HMAC over the booking id
   * and an expiry, checked when the pass is downloaded.
   */
  createLinks(bookingId: string, apiBase: string) {
    const expires = Date.now() + LINK_TTL_MS
    const signature = this.sign(`${bookingId}.${expires}`)

    return {
      apple: this.isAppleEnabled
        ? `${apiBase}/wallet/apple/${bookingId}?${new URLSearchParams({ expires: String(expires), signature })}`
        : null,
    }
  }

  verifyLink(bookingId: string, expires: string, signature: string) {
    const expected = Buffer.from(this.sign(`${bookingId}.${expires}`))
    const given = Buffer.from(signature)
    const isValid =
      expected.length === given.length &&
      timingSafeEqual(expected, given) &&
      Number(expires) > Date.now()
    if (!isValid) throw new NotFoundException('Ссылка устарела — откройте запись ещё раз')
  }

  async createApplePass(booking: BookingView) {
    if (!this.isAppleEnabled) throw new NotFoundException('Apple Wallet не настроен')

    const pass = new PKPass(
      {
        ...(await this.loadIcons()),
        'pass.json': Buffer.from(
          JSON.stringify({
            formatVersion: 1,
            passTypeIdentifier: this.get('WALLET_PASS_TYPE_ID'),
            teamIdentifier: this.get('WALLET_TEAM_ID'),
            serialNumber: booking.id,
            organizationName: booking.business.name,
            description: `${booking.serviceName} — ${booking.business.name}`,
            logoText: booking.business.name,
            foregroundColor: 'rgb(255, 255, 255)',
            labelColor: 'rgb(214, 230, 255)',
            backgroundColor: BRAND_BLUE,
            // Wallet shows the pass on the lock screen around this time.
            relevantDate: booking.startsAt,
            expirationDate: new Date(
              new Date(booking.startsAt).getTime() + booking.durationMinutes * 60_000,
            ).toISOString(),
            voided: booking.status === 'cancelled',
            eventTicket: {
              primaryFields: [{ key: 'service', label: 'УСЛУГА', value: booking.serviceName }],
              secondaryFields: [
                {
                  key: 'date',
                  label: 'КОГДА',
                  value: booking.startsAt,
                  dateStyle: 'PKDateStyleMedium',
                  timeStyle: 'PKDateStyleShort',
                },
                { key: 'master', label: 'МАСТЕР', value: booking.specialistName },
              ],
              auxiliaryFields: [
                { key: 'client', label: 'КЛИЕНТ', value: booking.customerName },
                { key: 'code', label: 'НОМЕР', value: booking.id.slice(0, 8).toUpperCase() },
              ],
              backFields: [
                { key: 'address', label: 'Адрес', value: booking.business.address || '—' },
                { key: 'phone', label: 'Телефон', value: booking.business.phone || '—' },
              ],
            },
            barcodes: [
              {
                format: 'PKBarcodeFormatQR',
                message: booking.id,
                messageEncoding: 'iso-8859-1',
                altText: booking.id.slice(0, 8).toUpperCase(),
              },
            ],
          }),
        ),
      },
      {
        wwdr: this.get('WALLET_WWDR_PEM') ?? '',
        signerCert: this.get('WALLET_CERT_PEM') ?? '',
        signerKey: this.get('WALLET_KEY_PEM') ?? '',
        signerKeyPassphrase: this.get('WALLET_KEY_PASSPHRASE'),
      },
    )

    return pass.getAsBuffer()
  }

  /** «Save to Google Wallet» link: a JWT signed with the service account carries class and object. */
  createGoogleLink(booking: BookingView, origin: string) {
    const account = this.googleAccount()
    const issuerId = this.get('GOOGLE_WALLET_ISSUER_ID')
    if (!account || !issuerId) return null

    const classId = `${issuerId}.awaisa_booking`
    const claims = {
      iss: account.client_email,
      aud: 'google',
      typ: 'savetowallet',
      origins: [origin],
      payload: {
        genericClasses: [{ id: classId }],
        genericObjects: [
          {
            id: `${issuerId}.${booking.id.replace(/-/g, '')}`,
            classId,
            state: booking.status === 'cancelled' ? 'INACTIVE' : 'ACTIVE',
            hexBackgroundColor: '#0071e3',
            cardTitle: { defaultValue: { language: 'ru', value: booking.business.name } },
            header: { defaultValue: { language: 'ru', value: booking.serviceName } },
            subheader: { defaultValue: { language: 'ru', value: booking.specialistName } },
            textModulesData: [
              { id: 'when', header: 'Когда', body: `${booking.date} ${booking.time}` },
              { id: 'address', header: 'Адрес', body: booking.business.address || '—' },
            ],
            barcode: {
              type: 'QR_CODE',
              value: booking.id,
              alternateText: booking.id.slice(0, 8).toUpperCase(),
            },
            validTimeInterval: { start: { date: booking.startsAt } },
          },
        ],
      },
    }
    const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(JSON.stringify(claims))}`
    const signature = createSign('RSA-SHA256').update(unsigned).sign(account.private_key)

    return `https://pay.google.com/gp/v/save/${unsigned}.${base64url(signature)}`
  }

  private googleAccount(): GoogleServiceAccount | null {
    const raw = this.get('GOOGLE_WALLET_SERVICE_ACCOUNT')
    if (!raw) return null
    try {
      const account = JSON.parse(raw) as Partial<GoogleServiceAccount>
      return account.client_email && account.private_key
        ? { client_email: account.client_email, private_key: account.private_key }
        : null
    } catch {
      return null
    }
  }

  private loadIcons() {
    this.icons ??= Promise.all(
      [
        ['icon.png', 29],
        ['icon@2x.png', 58],
        ['icon@3x.png', 87],
      ].map(
        async ([name, size]) =>
          [
            name,
            await sharp(ICON_SVG(Number(size)))
              .png()
              .toBuffer(),
          ] as const,
      ),
    ).then(Object.fromEntries)

    return this.icons
  }

  private sign(value: string) {
    return createHmac('sha256', this.get('AUTH_SECRET') ?? '')
      .update(`wallet:${value}`)
      .digest('base64url')
  }

  private get<Key extends keyof Env>(key: Key) {
    return this.config.get(key, { infer: true }) as Env[Key]
  }
}
