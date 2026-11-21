import { createHmac } from 'node:crypto'
import { failedDeliveries, isValidSignature } from './whatsapp-webhook.js'

describe('whatsapp webhook', () => {
  const body = Buffer.from('{"object":"whatsapp_business_account"}')
  const sign = (secret: string) =>
    `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`

  it('accepts only the app secret signature', () => {
    expect(isValidSignature(body, sign('secret'), 'secret')).toBe(true)
    expect(isValidSignature(body, sign('other'), 'secret')).toBe(false)
    expect(isValidSignature(body, undefined, 'secret')).toBe(false)
    expect(isValidSignature(body, 'sha256=abc', 'secret')).toBe(false)
  })

  it('lists failed deliveries with their reason and skips the rest', () => {
    expect(
      failedDeliveries({
        entry: [
          {
            changes: [
              {
                value: {
                  statuses: [
                    { id: 'wamid.1', status: 'delivered', recipient_id: '996555000001' },
                    {
                      id: 'wamid.2',
                      status: 'failed',
                      recipient_id: '996555000002',
                      errors: [{ code: 131026, title: 'Message undeliverable' }],
                    },
                  ],
                },
              },
            ],
          },
        ],
      }),
    ).toEqual([
      { messageId: 'wamid.2', recipient: '996555000002', reason: '131026 Message undeliverable' },
    ])
    expect(failedDeliveries({})).toEqual([])
  })
})
