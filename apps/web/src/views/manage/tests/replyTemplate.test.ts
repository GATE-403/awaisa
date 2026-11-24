import { describe, expect, it } from 'vitest'
// The automatic reply is filled on the server; quick replies in the field are filled here. The
// owner sees both, so the two must give the same words.
import {
  fillReplyTemplate as fillOnServer,
  MAX_QUICK_REPLIES as SERVER_MAX_QUICK_REPLIES,
} from '../../../../../api/src/reviews/review-reply-text'
import { fillReplyTemplate, MAX_QUICK_REPLIES, SAMPLE_REVIEW } from '../lib/replyTemplate'

const CASES: { template: string; context: Parameters<typeof fillReplyTemplate>[1] }[] = [
  { template: 'Thank you, {name}! See you again', context: SAMPLE_REVIEW },
  {
    template: "We'll tell {Specialist}, glad the {service} went well",
    context: { authorName: 'Timur', specialistName: 'Erlan Asanov', serviceName: ' Beard ' },
  },
  {
    template: 'Thank you, {name} !  See you  with {specialist}',
    context: { authorName: '', specialistName: '', serviceName: '' },
  },
  {
    template: '{ИМЯ}, {услуга}?',
    context: { authorName: '  Asel  T.', specialistName: 'M', serviceName: 'MANICURE' },
  },
]

describe('fillReplyTemplate', () => {
  it('puts in the first names and the service in lower case', () => {
    expect(
      fillReplyTemplate('Thank you, {name}! {specialist} is glad. {service}', SAMPLE_REVIEW),
    ).toBe('Thank you, Asel! Meerim is glad. manicure')
  })

  it('still fills the Russian keys of templates saved earlier', () => {
    expect(fillReplyTemplate('Thank you, {имя}! {мастер}, {услуга}', SAMPLE_REVIEW)).toBe(
      'Thank you, Asel! Meerim, manicure',
    )
  })

  it('reads well when a value is unknown', () => {
    expect(
      fillReplyTemplate('Thank you, {name}! We will tell {specialist} about {service}', {
        authorName: ' ',
        specialistName: '',
        serviceName: '',
      }),
    ).toBe('Thank you, there! We will tell your specialist about the service')
  })

  it('tidies the spaces the pill editor leaves', () => {
    expect(fillReplyTemplate('  Thank you,   {name} !  ', SAMPLE_REVIEW)).toBe('Thank you, Asel!')
  })

  it('gives the same words as the server for every template', () => {
    for (const { template, context } of CASES) {
      expect(fillReplyTemplate(template, context), template).toBe(fillOnServer(template, context))
    }
    expect(MAX_QUICK_REPLIES).toBe(SERVER_MAX_QUICK_REPLIES)
  })
})
