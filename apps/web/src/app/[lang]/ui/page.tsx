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
import { Radio, RadioGroup } from '@awaisa/ui/Radio'
import { RadioCard } from '@awaisa/ui/RadioCard'
import { Select } from '@awaisa/ui/Select'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { Switch } from '@awaisa/ui/Switch'
import { msg } from '@lingui/core/macro'
import type { Metadata } from 'next'
import { initLingui } from '@/shared/i18n/server'
import styles from './page.module.css'

export const generateMetadata = async (): Promise<Metadata> => {
  const i18n = await initLingui()

  return {
    title: i18n._(msg`UI kit · awaisa`),
    robots: { index: false },
  }
}

const CITY_ITEMS = [
  { value: 'bishkek', label: 'Bishkek' },
  { value: 'osh', label: 'Osh' },
  { value: 'karakol', label: 'Karakol' },
]

const UiKitPage = async () => {
  await initLingui()

  return (
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
        <h2 className={styles.heading}>Field · Input · Select</h2>
        <Field label='Email' description='We never share your email'>
          <Input type='email' placeholder='name@example.com' />
        </Field>
        <Field label='Password' error='At least 8 characters'>
          <Input type='password' defaultValue='123' />
        </Field>
        <Select items={CITY_ITEMS} placeholder='Choose a city' aria-label='City' />
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Checkbox · Switch · Radio</h2>
        <div className={styles.row}>
          <label className={styles.row}>
            <Checkbox defaultChecked />
            Remember me
          </label>
          <label className={styles.row}>
            <Checkbox indeterminate />
            Partly
          </label>
          <label className={styles.row}>
            <Switch defaultChecked />
            Notifications
          </label>
        </div>
        <RadioGroup defaultValue='card' aria-label='Payment method' className={styles.row}>
          <label className={styles.row}>
            <Radio value='card' />
            By card
          </label>
          <label className={styles.row}>
            <Radio value='cash' />
            In cash
          </label>
        </RadioGroup>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>RadioCard</h2>
        <RadioGroup defaultValue='pro' aria-label='Plan' className={styles.cards}>
          <RadioCard value='basic' title='Basic' description='To get to know it' />
          <RadioCard value='pro' title='Pro' description='Everything, no limits' size='lg' />
        </RadioGroup>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Dialog · Skeleton</h2>
        <div className={styles.row}>
          <Dialog>
            <DialogTrigger render={<Button variant='outline' />}>Open dialog</DialogTrigger>
            <DialogContent>
              <DialogTitle>Delete the project?</DialogTitle>
              <DialogDescription>This cannot be undone.</DialogDescription>
              <DialogFooter>
                <DialogClose render={<Button variant='ghost' />}>Cancel</DialogClose>
                <DialogClose render={<Button variant='danger' />}>Delete</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Skeleton className={styles.skeleton} />
      </section>
    </main>
  )
}

export default UiKitPage
