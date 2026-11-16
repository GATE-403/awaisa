'use client'

import { Button } from '@awaisa/ui/Button'
import { Input } from '@awaisa/ui/Input'
import { useToast } from '@awaisa/ui/Toast'
import { X } from '@phosphor-icons/react/ssr'
import { type FormEvent, useEffect, useState } from 'react'
import { PersonAvatar } from '@/entities/business'
import { getErrorMessage } from '@/shared/api/apiError'
import { addTeamMember, getTeam, removeTeamMember } from '@/shared/api/clientApi'
import type { TeamMember } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from '@/views/manage/ui/manageForms.module.css'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import own from './TeamTab.module.css'

interface TeamTabProps {
  slug: string
}

// «Сотрудники»: administrators run the day (schedule, clients, reviews) without money or setup.
export const TeamTab = ({ slug }: TeamTabProps) => {
  const toast = useToast()
  const [team, setTeam] = useState<TeamMember[] | null>(null)
  const [phone, setPhone] = useState('')
  const [isAdding, setIsAdding] = useState(false)

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
        title: 'Администратор добавлен',
        description: 'Ему придёт SMS со ссылкой',
        type: 'success',
      })
    } catch (error) {
      toast.show({ title: 'Не получилось', description: getErrorMessage(error), type: 'error' })
    } finally {
      setIsAdding(false)
    }
  }

  const remove = async (member: TeamMember) => {
    try {
      await removeTeamMember(slug, member.id)
      setTeam((current) => current?.filter((item) => item.id !== member.id) ?? null)
      toast.show({ title: 'Доступ закрыт', type: 'success' })
    } catch (error) {
      toast.show({ title: 'Не получилось', description: getErrorMessage(error), type: 'error' })
    }
  }

  return (
    <section className={styles.section} aria-label='Сотрудники'>
      <SectionHeader
        title='Сотрудники'
        description='Администратор видит расписание, клиентов и отзывы — без денег и настроек.'
      />
      {team && (
        <ul className={styles.list}>
          {team.map((member) => (
            <li key={member.id} className={own.row}>
              <PersonAvatar name={member.name || member.phone} size='sm' />
              <span className={styles.rowBody}>
                <span className={styles.rowTitle}>{member.name || formatPhone(member.phone)}</span>
                <span className={styles.rowMeta}>
                  {member.role === 'owner' ? 'Владелец' : 'Администратор'}
                  {member.name ? ` · ${formatPhone(member.phone)}` : ''}
                </span>
              </span>
              {member.role === 'admin' && (
                <button
                  type='button'
                  className={own.remove}
                  aria-label={`Закрыть доступ: ${member.name || formatPhone(member.phone)}`}
                  onClick={() => void remove(member)}
                >
                  <X weight='bold' aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form className={sheet.group} onSubmit={add} aria-label='Добавить администратора'>
        <SectionCaption>Добавить администратора</SectionCaption>
        <div className={own.add}>
          <Input
            type='tel'
            inputMode='tel'
            aria-label='Телефон администратора'
            placeholder='+996 555 123 456'
            value={phone}
            onValueChange={(value) => setPhone(maskPhoneInput(value))}
          />
          <Button type='submit' disabled={phone.replace(/\D/g, '').length < 9 || isAdding}>
            Добавить
          </Button>
        </div>
        <p className={sheet.groupFooter}>Он войдёт по SMS на этот номер и сразу увидит кабинет.</p>
      </form>
    </section>
  )
}
