'use client'

import { Button } from '@awaisa/ui/Button'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import { CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { getErrorMessage } from '@/common/api/apiError'
import { updateMe } from '@/common/api/clientApi'
import { Container } from '@/common/components/Container/Container'
import { PageTitle } from '@/common/components/PageTitle/PageTitle'
import { useRequireSession } from '@/common/hooks/useRequireSession'
import { formatPhone } from '@/common/utils/formatPhone'
import styles from './ProfilePage.module.css'

export const ProfilePage = () => {
  const session = useRequireSession()
  const router = useRouter()
  const toast = useToast()
  const [draftName, setDraftName] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const customer = session.customer
  const name = draftName ?? customer?.name ?? ''
  const isNameChanged = draftName !== null && draftName.trim() !== customer?.name

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    setIsSaving(true)

    try {
      session.setCustomer(await updateMe(name))
      setDraftName(null)
      toast.show({ title: 'Имя сохранено', type: 'success' })
    } catch (error) {
      toast.show({
        title: 'Не удалось сохранить',
        description: getErrorMessage(error),
        type: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSignOut = async () => {
    await session.signOut()
    router.replace('/')
  }

  return (
    <main className={styles.page}>
      <Container size='md' className={styles.content}>
        <PageTitle title='Профиль.' subtitle='Записи и контакты в одном месте.' />

        {!customer && <Skeleton className={styles.skeleton} />}

        {customer && (
          <>
            <form className={styles.card} onSubmit={handleSave}>
              <Field label='Имя'>
                <Input
                  autoComplete='name'
                  value={name}
                  onValueChange={setDraftName}
                  placeholder='Как к вам обращаться'
                />
              </Field>
              <div className={styles.row}>
                <span className={styles.label}>Телефон</span>
                <span className={styles.value}>{formatPhone(customer.phone)}</span>
              </div>
              {isNameChanged && (
                <Button type='submit' size='md' disabled={isSaving || !name.trim()}>
                  Сохранить
                </Button>
              )}
            </form>

            <nav aria-label='Разделы профиля' className={styles.list}>
              <NextLink href='/bookings' className={styles.link}>
                Мои записи
                <CaretRight weight='bold' aria-hidden />
              </NextLink>
              <NextLink href='/manage' className={styles.link}>
                Мои бизнесы
                <CaretRight weight='bold' aria-hidden />
              </NextLink>
            </nav>

            <Button variant='ghost' className={styles.signOut} onClick={handleSignOut}>
              Выйти
            </Button>
          </>
        )}
      </Container>
    </main>
  )
}
