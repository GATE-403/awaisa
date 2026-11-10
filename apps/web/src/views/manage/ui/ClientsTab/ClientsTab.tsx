'use client'

import { Avatar } from '@awaisa/ui/Avatar'
import { Input } from '@awaisa/ui/Input'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { CaretRight, MagnifyingGlass, NotePencil } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { getErrorMessage } from '@/shared/api/apiError'
import { getClients } from '@/shared/api/clientApi'
import type { ClientListItem } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { pluralize } from '@/shared/lib/plural'
import { ClientSheet } from '@/views/manage/ui/ClientSheet/ClientSheet'
import { EmptyState } from '@/views/manage/ui/EmptyState/EmptyState'
import forms from '@/views/manage/ui/manageForms.module.css'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import styles from './ClientsTab.module.css'

interface ClientsTabProps {
  slug: string
}

const SEARCH_DELAY_MS = 250
const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })

// The client base, like Contacts: search by name or number, newest visits first.
export const ClientsTab = ({ slug }: ClientsTabProps) => {
  const [query, setQuery] = useState('')
  const [clients, setClients] = useState<ClientListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openPhone, setOpenPhone] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` reloads after a note is saved
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      getClients(slug, query.trim(), controller.signal)
        .then(setClients)
        .catch((loadError: unknown) => {
          if (!controller.signal.aborted) setError(getErrorMessage(loadError))
        })
    }, SEARCH_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [slug, query, version])

  return (
    <section className={forms.section}>
      <SectionHeader
        title='Клиенты'
        description={
          clients && !query
            ? `${pluralize(clients.length, ['клиент', 'клиента', 'клиентов'])} — все, кто записывался`
            : 'Все, кто записывался: визиты, траты, неявки и ваши заметки.'
        }
      />
      <label className={styles.search}>
        <MagnifyingGlass weight='bold' aria-hidden className={styles.searchIcon} />
        <Input
          type='search'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Имя или номер'
          aria-label='Поиск клиента'
          className={styles.searchInput}
        />
      </label>

      {error && <p className={styles.error}>{error}</p>}
      {!clients && !error && <Skeleton className={styles.skeleton} />}
      {clients?.length === 0 && (
        <EmptyState
          title={query ? 'Никого не нашли' : 'Клиентов пока нет'}
          text={query ? 'Проверьте имя или номер.' : 'Они появятся с первой записью.'}
        />
      )}
      {clients && clients.length > 0 && (
        <ul className={forms.list}>
          {clients.map((client) => (
            <li key={client.phone}>
              <button
                type='button'
                className={styles.row}
                onClick={() => setOpenPhone(client.phone)}
              >
                <Avatar name={client.name || client.phone.slice(-2)} size='md' />
                <span className={styles.text}>
                  <span className={styles.name}>
                    {client.name || formatPhone(client.phone)}
                    {client.hasNote && (
                      <NotePencil aria-label='Есть заметка' className={styles.noteIcon} />
                    )}
                    {client.noShows > 0 && (
                      <span className={styles.noShow}>
                        {pluralize(client.noShows, ['неявка', 'неявки', 'неявок'])}
                      </span>
                    )}
                  </span>
                  <span className={styles.meta}>
                    {pluralize(client.visits, ['визит', 'визита', 'визитов'])}
                    {client.lastVisit &&
                      ` · был ${dateFormatter.format(new Date(client.lastVisit))}`}
                    {client.nextVisit &&
                      ` · придёт ${dateFormatter.format(new Date(client.nextVisit))}`}
                  </span>
                </span>
                <span className={styles.spent}>
                  {client.spent > 0 ? formatPrice(client.spent) : ''}
                </span>
                <CaretRight weight='bold' aria-hidden className={styles.chevron} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {openPhone && (
        <ClientSheet
          slug={slug}
          phone={openPhone}
          onClose={() => setOpenPhone(null)}
          onSaved={() => setVersion((value) => value + 1)}
        />
      )}
    </section>
  )
}
