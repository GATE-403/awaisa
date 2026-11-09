import { Avatar } from '@awaisa/ui/Avatar'
import { Button } from '@awaisa/ui/Button'
import { CaretRight } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import {
  createSpecialist,
  removeSpecialistPhoto,
  updateSpecialist,
  uploadSpecialistPhoto,
} from '@/common/api/clientApi'
import type { Branch, Catalog, Specialist, SpecialistInput } from '@/common/api/types'
import { pluralize } from '@/common/utils/plural'
import { EmptyState } from '../EmptyState/EmptyState'
import styles from '../manageForms.module.css'
import { SectionHeader } from '../SectionHeader/SectionHeader'
import { MasterDialog } from './MasterDialog'

interface MastersTabProps {
  slug: string
  catalog: Catalog
  branches: Branch[]
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
}

export const MastersTab = ({ slug, catalog, branches, run }: MastersTabProps) => {
  const [editing, setEditing] = useState<Specialist | 'new' | null>(null)

  const handleSave = (input: SpecialistInput) =>
    editing && editing !== 'new'
      ? run(() => updateSpecialist(slug, editing.id, input), 'Мастер сохранён')
      : run(() => createSpecialist(slug, input), 'Мастер добавлен')

  return (
    <section className={styles.section} aria-label='Мастера'>
      <SectionHeader
        title='Мастера'
        description='У каждого своё расписание — записи не пересекаются.'
        actions={
          <Button size='sm' onClick={() => setEditing('new')}>
            Добавить мастера
          </Button>
        }
      />

      {catalog.specialists.length === 0 ? (
        <EmptyState
          title='Добавьте мастера'
          text='Если работаете один — добавьте себя. Клиенты смогут выбрать мастера или любого свободного.'
          action={<Button onClick={() => setEditing('new')}>Добавить мастера</Button>}
        />
      ) : (
        <ul className={styles.list}>
          {catalog.specialists.map((master) => (
            <li key={master.id}>
              <button type='button' className={styles.masterRow} onClick={() => setEditing(master)}>
                <Avatar name={master.name} src={master.photoUrl ?? undefined} />
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>
                    {master.name}
                    {master.isActive === false && (
                      <span className={styles.badge}>Не принимает</span>
                    )}
                  </span>
                  {(master.role || (branches.length > 1 && master.branchId)) && (
                    <span className={styles.rowMeta}>
                      {[master.role, branches.find(({ id }) => id === master.branchId)?.name]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </span>
                <span className={styles.cellMuted}>
                  {pluralize(master.serviceIds.length, ['услуга', 'услуги', 'услуг'])}
                </span>
                <CaretRight className={styles.chevron} weight='bold' aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <MasterDialog
          key={editing === 'new' ? 'new' : editing.id}
          master={editing === 'new' ? null : editing}
          services={catalog.services}
          branches={branches}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onPhotoChange={
            editing === 'new'
              ? undefined
              : (file) =>
                  run(
                    () =>
                      file
                        ? uploadSpecialistPhoto(slug, editing.id, file)
                        : removeSpecialistPhoto(slug, editing.id),
                    file ? 'Фото обновлено' : 'Фото удалено',
                  )
          }
        />
      )}
    </section>
  )
}
