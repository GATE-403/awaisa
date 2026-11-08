import { Button } from '@awaisa/ui/Button'
import { Checkbox } from '@awaisa/ui/Checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@awaisa/ui/Dialog'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { Link } from '@awaisa/ui/Link'
import { Radio, RadioGroup } from '@awaisa/ui/Radio'
import { RadioCard } from '@awaisa/ui/RadioCard'
import { Select } from '@awaisa/ui/Select'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { Switch } from '@awaisa/ui/Switch'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@awaisa/ui/Tabs'
import type { Metadata } from 'next'
import NextLink from 'next/link'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'UI kit · awaisa',
  robots: { index: false },
}

const CITY_ITEMS = [
  { value: 'bishkek', label: 'Бишкек' },
  { value: 'osh', label: 'Ош' },
  { value: 'karakol', label: 'Каракол' },
]

const UiKitPage = () => (
  <main className={styles.page}>
    <h1 className={styles.title}>UI kit</h1>

    <section className={styles.section}>
      <h2 className={styles.heading}>Button</h2>
      <div className={styles.row}>
        <Button>Primary</Button>
        <Button variant='secondary'>Secondary</Button>
        <Button variant='outline'>Outline</Button>
        <Button variant='ghost'>Ghost</Button>
        <Button variant='danger'>Danger</Button>
        <Button variant='link'>Link</Button>
        <Button disabled>Disabled</Button>
      </div>
      <div className={styles.row}>
        <Button size='sm'>Small</Button>
        <Button size='md'>Medium</Button>
        <Button size='lg'>Large</Button>
      </div>
    </section>

    <section className={styles.section}>
      <h2 className={styles.heading}>Link</h2>
      <div className={styles.row}>
        <Link render={<NextLink href='/map' />}>Открыть карту</Link>
        <Link variant='muted' href='#'>
          Muted
        </Link>
      </div>
    </section>

    <section className={styles.section}>
      <h2 className={styles.heading}>Field · Input · Select</h2>
      <Field label='Email' description='Мы не передаём почту третьим лицам'>
        <Input type='email' placeholder='name@example.com' />
      </Field>
      <Field label='Пароль' error='Минимум 8 символов'>
        <Input type='password' defaultValue='123' />
      </Field>
      <Select items={CITY_ITEMS} placeholder='Выберите город' aria-label='Город' />
    </section>

    <section className={styles.section}>
      <h2 className={styles.heading}>Checkbox · Switch · Radio</h2>
      <div className={styles.row}>
        <label className={styles.row}>
          <Checkbox defaultChecked />
          Запомнить меня
        </label>
        <label className={styles.row}>
          <Checkbox indeterminate />
          Частично
        </label>
        <label className={styles.row}>
          <Switch defaultChecked />
          Уведомления
        </label>
      </div>
      <RadioGroup defaultValue='card' aria-label='Способ оплаты' className={styles.row}>
        <label className={styles.row}>
          <Radio value='card' />
          Картой
        </label>
        <label className={styles.row}>
          <Radio value='cash' />
          Наличными
        </label>
      </RadioGroup>
    </section>

    <section className={styles.section}>
      <h2 className={styles.heading}>RadioCard</h2>
      <RadioGroup defaultValue='pro' aria-label='Тариф' className={styles.cards}>
        <RadioCard value='basic' title='Базовый' description='Для знакомства' />
        <RadioCard value='pro' title='Pro' description='Всё без ограничений' size='lg'>
          <Link href='#'>Подробнее</Link>
        </RadioCard>
      </RadioGroup>
    </section>

    <section className={styles.section}>
      <h2 className={styles.heading}>Tabs</h2>
      <Tabs defaultValue='overview'>
        <TabsList>
          <TabsTab value='overview'>Обзор</TabsTab>
          <TabsTab value='reviews'>Отзывы</TabsTab>
          <TabsTab value='photos'>Фото</TabsTab>
        </TabsList>
        <TabsPanel value='overview'>Описание места</TabsPanel>
        <TabsPanel value='reviews'>Отзывов пока нет</TabsPanel>
        <TabsPanel value='photos'>Фото появятся позже</TabsPanel>
      </Tabs>
    </section>

    <section className={styles.section}>
      <h2 className={styles.heading}>Dialog · Skeleton</h2>
      <div className={styles.row}>
        <Dialog>
          <DialogTrigger render={<Button variant='outline' />}>Открыть диалог</DialogTrigger>
          <DialogContent>
            <DialogTitle>Удалить проект?</DialogTitle>
            <DialogDescription>Это действие нельзя отменить.</DialogDescription>
            <DialogFooter>
              <DialogClose render={<Button variant='ghost' />}>Отмена</DialogClose>
              <DialogClose render={<Button variant='danger' />}>Удалить</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Skeleton className={styles.skeleton} />
    </section>
  </main>
)

export default UiKitPage
