import { StoreCard } from '@/shared/ui/StoreCard/StoreCard'
import { StoreShelf } from '@/shared/ui/StoreShelf/StoreShelf'

const PERKS = [
  {
    eyebrow: 'Запись',
    title: 'Три шага — и вы записаны.',
    description: 'Услуга, время, имя с телефоном. Без регистрации и паролей.',
  },
  {
    eyebrow: 'Время',
    title: 'Только свободные окна.',
    description: 'Видите реальное расписание мастеров — никаких перезвонов.',
  },
  {
    eyebrow: 'Отмена',
    title: 'Передумали — отмените сами.',
    description: 'Билет с кодом хранится в «Мои записи», отмена в одно касание.',
  },
  {
    eyebrow: 'Оплата',
    title: 'Платите после визита.',
    description: 'Наличными или картой в салоне. Цена известна заранее.',
  },
]

export const PerksShelf = () => (
  <StoreShelf
    id='perks'
    title='Почему удобно.'
    subtitle='Запись, которая не отнимает время.'
    label='Преимущества'
    size='sm'
  >
    {PERKS.map((perk) => (
      <li key={perk.title}>
        <StoreCard
          eyebrow={perk.eyebrow}
          title={perk.title}
          description={perk.description}
          height='sm'
        />
      </li>
    ))}
  </StoreShelf>
)
