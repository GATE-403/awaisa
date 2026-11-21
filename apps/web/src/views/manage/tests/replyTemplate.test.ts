import { describe, expect, it } from 'vitest'
// The automatic reply is filled on the server; quick replies in the field are filled here. The
// owner sees both, so the two must give the same words.
import {
  fillReplyTemplate as fillOnServer,
  MAX_QUICK_REPLIES as SERVER_MAX_QUICK_REPLIES,
} from '../../../../../api/src/reviews/review-reply-text'
import { fillReplyTemplate, MAX_QUICK_REPLIES, SAMPLE_REVIEW } from '../lib/replyTemplate'

const CASES: { template: string; context: Parameters<typeof fillReplyTemplate>[1] }[] = [
  { template: 'Спасибо, {имя}! Ждём вас снова', context: SAMPLE_REVIEW },
  {
    template: 'Передадим мастеру {Мастер}, {услуга} удалась',
    context: { authorName: 'Тимур', specialistName: 'Эрлан Асанов', serviceName: ' Борода ' },
  },
  {
    template: 'Спасибо, {имя} !  Ждём  у {мастер}',
    context: { authorName: '', specialistName: '', serviceName: '' },
  },
  {
    template: '{ИМЯ}, {услуга}?',
    context: { authorName: '  Асель  Т.', specialistName: 'М', serviceName: 'МАНИКЮР' },
  },
]

describe('fillReplyTemplate', () => {
  it('puts in the first names and the service in lower case', () => {
    expect(fillReplyTemplate('Спасибо, {имя}! {мастер} рад. {услуга}', SAMPLE_REVIEW)).toBe(
      'Спасибо, Асель! Мээрим рад. маникюр',
    )
  })

  it('reads well when a value is unknown', () => {
    expect(
      fillReplyTemplate('Спасибо, {имя}! Передадим {мастер}, {услуга}', {
        authorName: ' ',
        specialistName: '',
        serviceName: '',
      }),
    ).toBe('Спасибо, гость! Передадим мастера, услуга')
  })

  it('tidies the spaces the pill editor leaves', () => {
    expect(fillReplyTemplate('  Спасибо,   {имя} !  ', SAMPLE_REVIEW)).toBe('Спасибо, Асель!')
  })

  it('gives the same words as the server for every template', () => {
    for (const { template, context } of CASES) {
      expect(fillReplyTemplate(template, context), template).toBe(fillOnServer(template, context))
    }
    expect(MAX_QUICK_REPLIES).toBe(SERVER_MAX_QUICK_REPLIES)
  })
})
