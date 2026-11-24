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
import { PHONE_PLACEHOLDER } from '@/shared/config/region'
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

// "Team": administrators run the day (schedule, clients, reviews) without money or setup.
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
        title: t('Administrator added'),
        description: t("They'll get an SMS with a link"),
        type: 'success',
      })
    } catch (error) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(error),
        type: 'error',
      })
    } finally {
      setIsAdding(false)
    }
  }

  const remove = async (member: TeamMember) => {
    try {
      await removeTeamMember(slug, member.id)
      setTeam((current) => current?.filter((item) => item.id !== member.id) ?? null)
      toast.show({ title: t('Access removed'), type: 'success' })
    } catch (error) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(error),
        type: 'error',
      })
    }
  }

  return (
    <section className={styles.section} aria-label={t('Team')}>
      <SectionHeader
        title={t('Team')}
        description={t(
          'An administrator sees the schedule, clients and reviews, without money or settings.',
        )}
      />
      {team && (
        <ul className={styles.list}>
          {team.map((member) => (
            <li key={member.id} className={own.row}>
              <PersonAvatar name={member.name || member.phone} size='sm' />
              <span className={styles.rowBody}>
                <span className={styles.rowTitle}>{member.name || formatPhone(member.phone)}</span>
                <span className={styles.rowMeta}>
                  {member.role === 'owner' ? t('Owner') : t('Administrator')}
                  {member.name ? ` · ${formatPhone(member.phone)}` : ''}
                </span>
              </span>
              {member.role === 'admin' && (
                <button
                  type='button'
                  className={own.remove}
                  aria-label={t('Remove access: {name}', {
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
          {t('Administrators are available on the “{plan}” plan.', {
            plan: access?.upgradeTitle ?? t('Business'),
          })}{' '}
          <NextLink href={`/manage/${slug}?tab=billing`} className={own.planLink}>
            {t('Open the plan')} ›
          </NextLink>
        </RowNote>
      )}
      {canAdd && (
        <form className={sheet.group} onSubmit={add} aria-label={t('Add an administrator')}>
          <SectionCaption className={own.addCaption}>{t('Add an administrator')}</SectionCaption>
          {/* On phones the number and "Add" float at the window's foot, under the thumb. */}
          <FloatingToolbar className={own.add}>
            <Input
              type='tel'
              inputMode='tel'
              aria-label={t("Administrator's phone")}
              placeholder={PHONE_PLACEHOLDER}
              value={phone}
              onValueChange={(value) => setPhone(maskPhoneInput(value))}
            />
            <Button type='submit' disabled={phone.replace(/\D/g, '').length < 9 || isAdding}>
              {t('Add')}
            </Button>
          </FloatingToolbar>
          <RowNote className={own.addNote}>
            {t('They sign in by SMS to this number and see the dashboard straight away.')}
          </RowNote>
        </form>
      )}
    </section>
  )
}
