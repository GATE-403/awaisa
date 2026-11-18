import type { Item, StatedPreferences, User } from '../types.ts'

// The clients from docs/ux-testing/personas.md (Нурлан is an owner there, not a client) as
// recommendation cases: who they are, what they would book, and a made-up visit history. All of
// it is invented — this is the only material the LLM judge ever sees.

const DAY_MS = 86_400_000

type PastVisit = { service: string; kind: string; daysAgo: number }

type Persona = {
  id: string
  name: string
  /** For the judge: who this is and what they want, in plain words. */
  portrait: string
  stated: StatedPreferences | null
  history: PastVisit[]
}

const GALINA = `Галина Петровна, 68 лет, пенсионерка, Бишкек. Слабое зрение, онлайн записывается впервые.
Красит корни и стрижётся у «своего» мастера примерно раз в 6 недель, бюджет до 2 500 сом.
Модные процедуры, тату и барбершопы ей не нужны; иногда думает о лечебном массаже спины.`

const SERGEY = `Сергей, 46 лет, офисный работник. Стрижётся и ровняет бороду раз в 3–4 недели в обед рядом
с офисом, до 1 000 сом за визит. Сравнивает места по цене и отзывам, женские услуги ему не нужны.`

const AIPERI = `Айпери, 21 год, студентка, только телефон. Маникюр с покрытием каждые 3 недели, брови и
ресницы — раз в 1–2 месяца. Бюджет до 1 000 сом, хочет записаться сегодня или завтра.`

const PERSONAS: Persona[] = [
  {
    id: 'galina',
    name: 'Галина Петровна (постоянный клиент)',
    portrait: GALINA,
    stated: { interests: ['coloring', 'haircut'], gender: 'female', budget: 2500 },
    history: [
      { service: 'Окрашивание корней', kind: 'beauty', daysAgo: 40 },
      { service: 'Женская стрижка', kind: 'beauty', daysAgo: 40 },
      { service: 'Окрашивание корней', kind: 'beauty', daysAgo: 84 },
    ],
  },
  {
    id: 'galina-new',
    name: 'Галина Петровна (первый раз, без анкеты)',
    portrait: GALINA,
    stated: null,
    history: [],
  },
  {
    id: 'sergey',
    name: 'Сергей (постоянный клиент)',
    portrait: SERGEY,
    stated: { interests: ['haircut', 'beard'], gender: 'male', budget: 1000 },
    history: [
      { service: 'Стрижка + борода', kind: 'barber', daysAgo: 24 },
      { service: 'Стрижка + борода', kind: 'barber', daysAgo: 51 },
      { service: 'Оформление бороды', kind: 'barber', daysAgo: 12 },
    ],
  },
  {
    id: 'sergey-new',
    name: 'Сергей (первый раз, ответил анкету)',
    portrait: SERGEY,
    stated: { interests: ['haircut', 'beard'], gender: 'male', budget: 1000 },
    history: [],
  },
  {
    id: 'aiperi',
    name: 'Айпери (постоянный клиент)',
    portrait: AIPERI,
    stated: { interests: ['nails', 'brows'], gender: 'female', budget: 1000 },
    history: [
      { service: 'Маникюр с покрытием', kind: 'nails', daysAgo: 20 },
      { service: 'Маникюр с покрытием', kind: 'nails', daysAgo: 41 },
      { service: 'Ламинирование бровей', kind: 'beauty', daysAgo: 50 },
    ],
  },
  {
    id: 'aiperi-new',
    name: 'Айпери (первый раз, без анкеты)',
    portrait: AIPERI,
    stated: null,
    history: [],
  },
]

/** A persona as a client of this catalog: each past visit at the first place that has it. */
const toUser = (persona: Persona, items: Item[], now: number): User => ({
  client: `persona-${persona.id}`,
  stated: persona.stated,
  history: persona.history
    .flatMap((visit) => {
      const item =
        items.find((entry) => entry.name === visit.service && entry.kind === visit.kind) ??
        items.find((entry) => entry.name === visit.service)
      return item ? [{ serviceId: item.serviceId, time: now - visit.daysAgo * DAY_MS }] : []
    })
    .sort((first, second) => second.time - first.time),
})

export type { Persona }
export { PERSONAS, toUser }
