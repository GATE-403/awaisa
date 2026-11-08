import { Avatar } from '@awaisa/ui/Avatar'
import { Button } from '@awaisa/ui/Button'
import { CaretRight } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { createSpecialist, updateSpecialist } from '@/common/api/clientApi'
import type { Catalog, Specialist, SpecialistInput } from '@/common/api/types'
import { pluralize } from '@/common/utils/plural'
import styles from '../manageForms.module.css'
import { MasterDialog } from './MasterDialog'

interface MastersTabProps {
  slug: string
  catalog: Catalog
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
}

export const MastersTab = ({ slug, catalog, run }: MastersTabProps) => {
  const [editing, setEditing] = useState<Specialist | 'new' | null>(null)

  const handleSave = (input: SpecialistInput) =>
    editing && editing !== 'new'
      ? run(() => updateSpecialist(slug, editing.id, input), 'Мастер сохранён')
      : run(() => createSpecialist(slug, input), 'Мастер добавлен')

  return (
    <div className={styles.section}>
      <div className={styles.toolbar}>
        <p className={styles.hint}>У каждого мастера своё расписание — записи не пересекаются.</p>
        <Button onClick={() => setEditing('new')}>Добавить мастера</Button>
      </div>

      {catalog.specialists.length === 0 ? (
        <p className={styles.empty}>Пока никого. Если работаете один — добавьте себя.</p>
      ) : (
        <ul className={styles.list}>
          {catalog.specialists.map((master) => (
            <li key={master.id}>
              <button type='button' className={styles.row} onClick={() => setEditing(master)}>
                <Avatar name={master.name} />
                <span className={styles.rowBody}>
                  <span>{master.name}</span>
                  <span className={styles.rowMeta}>
                    {[
                      master.role,
                      pluralize(master.serviceIds.length, ['услуга', 'услуги', 'услуг']),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                {master.isActive === false && <span className={styles.badge}>Не принимает</span>}
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
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
