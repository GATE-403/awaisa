import { Button } from '@awaisa/ui/Button'
import { useLingui } from '@lingui/react/macro'
import { CaretRight, MapPin } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { createBranch, deleteBranch, updateBranch } from '@/shared/api/clientApi'
import type { Branch, BranchInput } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { RowNote } from '@/shared/ui/RowNote/RowNote'
import styles from '@/views/manage/ui/manageForms.module.css'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import { BookingLinks } from './BookingLinks'
import { BranchDialog } from './BranchDialog'

interface BranchesTabProps {
  slug: string
  branches: Branch[]
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
}

export const BranchesTab = ({ slug, branches, run }: BranchesTabProps) => {
  const { t } = useLingui()
  const [editing, setEditing] = useState<Branch | 'new' | null>(null)

  const handleSave = (input: BranchInput) =>
    editing && editing !== 'new'
      ? run(() => updateBranch(slug, editing.id, input), t`Branch saved`)
      : run(() => createBranch(slug, input), t`Branch added`)

  const handleDelete = (id: string) => run(() => deleteBranch(slug, id), t`Branch deleted`)

  return (
    <section className={styles.section} aria-label={t`Branches`}>
      <SectionHeader
        title={t`Branches`}
        description={t`Each address has its own pin on the map. Clients pick the nearest when booking.`}
        isFloatingOnPhone
        actions={
          <Button size='sm' onClick={() => setEditing('new')}>
            {t`Add a branch`}
          </Button>
        }
      />

      <ul className={styles.list}>
        {branches.map((branch) => (
          <li key={branch.id}>
            <button type='button' className={styles.masterRow} onClick={() => setEditing(branch)}>
              <span className={styles.rowIcon} data-missing={branch.latitude === null || undefined}>
                <MapPin aria-hidden />
              </span>
              <span className={styles.rowBody}>
                <span className={styles.rowTitle}>
                  {branch.name}
                  {branch.isActive === false && (
                    <span className={styles.badge}>
                      {t({ message: 'Closed', context: 'branch is closed, masculine' })}
                    </span>
                  )}
                </span>
                <span className={styles.rowMeta}>
                  {[branch.address || t`No address`, branch.phone && formatPhone(branch.phone)]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              {branch.latitude === null && <span className={styles.cellMuted}>{t`No pin`}</span>}
              <CaretRight className={styles.chevron} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <RowNote>
        {t`Without a pin a branch isn't on the map. Specialists without a branch work at all of them.`}
      </RowNote>

      <BookingLinks slug={slug} branches={branches} />

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
