'use client'

import { Button } from '@awaisa/ui/Button'
import { Input } from '@awaisa/ui/Input'
import { useToast } from '@awaisa/ui/Toast'
import { X } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type FormEvent, useEffect, useState } from 'react'
import { PersonAvatar } from '@/entities/business'
import { getErrorMessage } from '@/shared/api/apiError'
import { addTeamMember, getTeam, removeTeamMember } from '@/shared/api/clientApi'
import type { TeamMember } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { formatPhone } from '@/shared/lib/formatPhone'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { FloatingToolbar } from '@/shared/ui/FloatingToolbar/FloatingToolbar'
import { RowNote } from '@/shared/ui/RowNote/RowNote'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { usePlanAccess } from '@/views/manage/model/usePlanAccess'
import styles from '@/views/manage/ui/manageForms.module.css'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import own from './TeamTab.module.css'

interface TeamTabProps {
  slug: string
}

// «Сотрудники»: administrators run the day (schedule, clients, reviews) without money or setup.
export const TeamTab = ({ slug }: TeamTabProps) => {
  const toast = useToast()
  const t = useT()
  const [team, setTeam] = useState<TeamMember[] | null>(null)
  const [phone, setPhone] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const access = usePlanAccess()
  const canAdd = access === null || access.features.includes('team')

  useEffect(() => {
    const controller = new AbortController()
    getTeam(slug, controller.signal)
      .then(setTeam)
      .catch(() => setTeam([]))
    return () => controller.abort()
  }, [slug])

  const add = async (event: FormEvent) => {
    event.preventDefault()
    setIsAdding(true)
    try {
      setTeam(await addTeamMember(slug, phone))
      setPhone('')
      toast.show({
        title: t('Администратор добавлен'),
        description: t('Ему придёт SMS со ссылкой'),
        type: 'success',
      })
    } catch (error) {
      toast.show({ title: t('Не получилось'), description: getErrorMessage(error), type: 'error' })
    } finally {
      setIsAdding(false)
    }
  }

  const remove = async (member: TeamMember) => {
    try {
      await removeTeamMember(slug, member.id)
      setTeam((current) => current?.filter((item) => item.id !== member.id) ?? null)
      toast.show({ title: t('Доступ закрыт'), type: 'success' })
    } catch (error) {
      toast.show({ title: t('Не получилось'), description: getErrorMessage(error), type: 'error' })
    }
  }

  return (
    <section className={styles.section} aria-label={t('Сотрудники')}>
      <SectionHeader
        title={t('Сотрудники')}
        description={t('Администратор видит расписание, клиентов и отзывы — без денег и настроек.')}
      />
      {team && (
        <ul className={styles.list}>
          {team.map((member) => (
            <li key={member.id} className={own.row}>
              <PersonAvatar name={member.name || member.phone} size='sm' />
              <span className={styles.rowBody}>
                <span className={styles.rowTitle}>{member.name || formatPhone(member.phone)}</span>
                <span className={styles.rowMeta}>
                  {member.role === 'owner' ? t('Владелец') : t('Администратор')}
                  {member.name ? ` · ${formatPhone(member.phone)}` : ''}
                </span>
              </span>
              {member.role === 'admin' && (
                <button
                  type='button'
                  className={own.remove}
                  aria-label={t('Закрыть доступ: {name}', {
                    name: member.name || formatPhone(member.phone),
                  })}
                  onClick={() => void remove(member)}
                >
                  <X aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!canAdd && (
        <RowNote>
          {t('Администраторы доступны на тарифе «{plan}».', {
            plan: access?.upgradeTitle ?? t('Бизнес'),
          })}{' '}
          <NextLink href={`/manage/${slug}?tab=billing`} className={own.planLink}>
            {t('Открыть тариф')} ›
          </NextLink>
        </RowNote>
      )}
      {canAdd && (
        <form className={sheet.group} onSubmit={add} aria-label={t('Добавить администратора')}>
          <SectionCaption className={own.addCaption}>{t('Добавить администратора')}</SectionCaption>
          {/* On phones the number and «Добавить» float at the window's foot, under the thumb. */}
          <FloatingToolbar className={own.add}>
            <Input
              type='tel'
              inputMode='tel'
              aria-label={t('Телефон администратора')}
              placeholder='+996 555 123 456'
              value={phone}
              onValueChange={(value) => setPhone(maskPhoneInput(value))}
            />
            <Button type='submit' disabled={phone.replace(/\D/g, '').length < 9 || isAdding}>
              {t('Добавить')}
            </Button>
          </FloatingToolbar>
          <RowNote className={own.addNote}>
            {t('Он войдёт по SMS на этот номер и сразу увидит кабинет.')}
          </RowNote>
        </form>
      )}
    </section>
  )
}
