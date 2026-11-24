import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseSection, toDayKey } from './updates-from-pr.mjs'

const meta = { number: 80, date: '2026-11-20' }

test('reads entries with audience, title, text and an optional link', () => {
  const body = `## Что изменилось
- всякое

## Что нового
<!-- comment -->
- Для бизнеса: Склад считает расход - Материалы списываются, когда визит отмечен. [Открыть склад](/manage)
- Для клиентов: Отзывы с фото – До трёх фото к отзыву.

## Проверка
- Для всех: Не отсюда - это другой раздел.`
  assert.deepEqual(parseSection(body, meta), [
    {
      id: 'pr80-1',
      date: '2026-11-20',
      audience: 'business',
      title: 'Склад считает расход',
      text: 'Материалы списываются, когда визит отмечен.',
      link: { href: '/manage', label: 'Открыть склад' },
    },
    {
      id: 'pr80-2',
      date: '2026-11-20',
      audience: 'clients',
      title: 'Отзывы с фото',
      text: 'До трёх фото к отзыву.',
    },
  ])
})

test('nothing for «нет», no section or links off the site', () => {
  assert.deepEqual(parseSection('## Что нового\n- нет', meta), [])
  assert.deepEqual(parseSection('## Что изменилось\n- Для всех: А - б', meta), [])
  const [entry] = parseSection('## Что нового\n- Для всех: А - б [x](https://evil.example)', meta)
  assert.equal(entry.link, undefined)
  assert.equal(entry.text, 'б [x](https://evil.example)')
})

test('dates follow Bishkek', () => {
  assert.equal(toDayKey('2026-11-19T20:30:00Z'), '2026-11-20')
  assert.equal(toDayKey('2026-11-19T10:00:00Z'), '2026-11-19')
})
