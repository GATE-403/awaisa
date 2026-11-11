import { createHash } from 'node:crypto'
import {
  freedomPayReply,
  isFreedomPaySignature,
  parseFreedomPayXml,
  signFreedomPay,
} from './freedompay.js'

const md5 = (value: string) => createHash('md5').update(value).digest('hex')

describe('Freedom Pay signature', () => {
  it('matches the documented example: script; values by key; secret', () => {
    const params = {
      pg_order_id: '23',
      pg_merchant_id: 'MERCHANT',
      pg_amount: '25',
      pg_description: 'test',
      pg_salt: 'molbulak',
    }
    expect(signFreedomPay('init_payment.php', params, 'SECRET')).toBe(
      md5('init_payment.php;25;test;MERCHANT;23;molbulak;SECRET'),
    )
  })

  it('ignores pg_sig itself and rejects a changed amount', () => {
    const params = { pg_order_id: '1', pg_amount: '500', pg_salt: 'x' }
    const signed = { ...params, pg_sig: signFreedomPay('result', params, 'S') }
    expect(isFreedomPaySignature('result', signed, 'S')).toBe(true)
    expect(isFreedomPaySignature('result', { ...signed, pg_amount: '1' }, 'S')).toBe(false)
  })

  it('parses flat XML responses', () => {
    expect(
      parseFreedomPayXml(
        '<?xml version="1.0"?><response><pg_status>ok</pg_status><pg_payment_id>4567</pg_payment_id><pg_redirect_url>https://x.kg/pay?a=1</pg_redirect_url></response>',
      ),
    ).toEqual({ pg_status: 'ok', pg_payment_id: '4567', pg_redirect_url: 'https://x.kg/pay?a=1' })
  })

  it('signs its reply to the result URL', () => {
    const reply = parseFreedomPayXml(freedomPayReply('result', 'ok', 'Оплачено', 'S'))
    expect(reply.pg_status).toBe('ok')
    expect(isFreedomPaySignature('result', reply, 'S')).toBe(true)
  })
})
