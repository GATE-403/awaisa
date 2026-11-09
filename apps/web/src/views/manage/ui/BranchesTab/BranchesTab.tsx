import { Button } from '@awaisa/ui/Button'
import { CaretRight, MapPin } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { createBranch, deleteBranch, updateBranch } from '@/shared/api/clientApi'
import type { Branch, BranchInput } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import styles from '@/views/manage/ui/manageForms.module.css'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import { BranchDialog } from './BranchDialog'

interface BranchesTabProps {
  slug: string
  branches: Branch[]
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
}

export const BranchesTab = ({ slug, branches, run }: BranchesTabProps) => {
  const [editing, setEditing] = useState<Branch | 'new' | null>(null)

  const handleSave = (input: BranchInput) =>
    editing && editing !== 'new'
      ? run(() => updateBranch(slug, editing.id, input), 'Филиал сохранён')
      : run(() => createBranch(slug, input), 'Филиал добавлен')

  const handleDelete = (id: string) => run(() => deleteBranch(slug, id), 'Филиал удалён')

  return (
    <section className={styles.section} aria-label='Филиалы'>
      <SectionHeader
        title='Филиалы'
        description='Каждый адрес — своя метка на карте. Клиент выбирает ближайший при записи.'
        actions={
          <Button size='sm' onClick={() => setEditing('new')}>
            Добавить филиал
          </Button>
        }
      />

      <ul className={styles.list}>
        {branches.map((branch) => (
          <li key={branch.id}>
            <button type='button' className={styles.masterRow} onClick={() => setEditing(branch)}>
              <span className={styles.rowIcon} data-missing={branch.latitude === null || undefined}>
                <MapPin weight='fill' aria-hidden />
              </span>
              <span className={styles.rowBody}>
                <span className={styles.rowTitle}>
                  {branch.name}
                  {branch.isActive === false && <span className={styles.badge}>Закрыт</span>}
                </span>
                <span className={styles.rowMeta}>
                  {[branch.address || 'Адрес не указан', branch.phone && formatPhone(branch.phone)]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              {branch.latitude === null && <span className={styles.cellMuted}>Нет метки</span>}
              <CaretRight className={styles.chevron} weight='bold' aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.listFooter}>
        Без метки филиал не виден на карте. Мастера без филиала принимают во всех.
      </p>

      {editing && (
        <BranchDialog
          key={editing === 'new' ? 'new' : editing.id}
          branch={editing === 'new' ? null : editing}
          canDelete={branches.length > 1}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </section>
  )
}
