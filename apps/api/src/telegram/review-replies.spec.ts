import { parseReviewCallback, repliedText, reviewKeyboard } from './review-replies.js'

const ID = '6f1c2d3e-0000-4000-8000-000000000001'

describe('review replies from Telegram', () => {
  it('puts a button per quick reply, «Write my own» and the https cabinet', () => {
    const keyboard = reviewKeyboard(
      ID,
      ['Thank you, Asel!', 'X'.repeat(60)],
      'https://awaisa.kg/manage/a',
    )
    expect(keyboard.inline_keyboard).toEqual([
      [{ text: 'Thank you, Asel!', callback_data: `rq:${ID}:0` }],
      [{ text: `${'X'.repeat(39)}…`, callback_data: `rq:${ID}:1` }],
      [{ text: '✍️ Write my own', callback_data: `rw:${ID}` }],
      [{ text: 'Open in the dashboard', url: 'https://awaisa.kg/manage/a' }],
    ])
  })

  it('leaves the cabinet out when its address is not https', () => {
    const keyboard = reviewKeyboard(ID, [], 'http://localhost:3000/manage/a')
    expect(keyboard.inline_keyboard).toEqual([
      [{ text: '✍️ Write my own', callback_data: `rw:${ID}` }],
    ])
  })

  it('keeps button data under Telegram’s 64 bytes', () => {
    const [[button]] = reviewKeyboard(ID, ['a'], null).inline_keyboard as {
      callback_data: string
    }[][]
    expect(Buffer.byteLength(button?.callback_data ?? '')).toBeLessThanOrEqual(64)
  })

  it('reads button data back and refuses anything else', () => {
    expect(parseReviewCallback(`rq:${ID}:2`)).toEqual({ kind: 'quick', reviewId: ID, index: 2 })
    expect(parseReviewCallback(`rw:${ID}`)).toEqual({ kind: 'own', reviewId: ID })
    expect(parseReviewCallback(`rq:${ID}`)).toBeNull()
    expect(parseReviewCallback(`rq:not-an-id:1`)).toBeNull()
    expect(parseReviewCallback(`rq:${ID}:12`)).toBeNull()
    expect(parseReviewCallback(undefined)).toBeNull()
  })

  it('escapes the reply it echoes', () => {
    expect(repliedText('<b>Thanks</b>')).toContain('&lt;b&gt;Thanks&lt;/b&gt;')
  })
})
