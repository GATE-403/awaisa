'use client'

import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useMemo, useState } from 'react'
import { useSession } from '@/entities/session'
import { ProfileEditorHostContext, ProfileStyleForm, useMyProfile } from '@/features/profileStyle'
import { useT } from '@/shared/i18n'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import { ProfileActionsSlotContext } from '../model/profileActionsSlot'

const EDIT_FORM_ID = 'profile-sheet-style-form'

interface ProfileSheetProps {
  /** The address's id or handle, as the link had it. */
  id: string
  children: ReactNode
}

// A profile tapped inside the app opens as a sheet over the page, like a booking («просто
// модалку как с записями»): the page stays under it and closing goes back to it. A link from
// outside, a reload or a shared address opens the full `/u/<id>` page. Like `BookingModalGate`, it
// shows only while the address is its own: the `@modal` slot keeps its last page on other
// navigations. «Изменить» turns this same sheet into the editor («могла там же внутри
// поменяться»): «Отмена» goes back to the profile, «Готово» saves and goes back.
export const ProfileSheet = ({ id, children }: ProfileSheetProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const t = useT()
  const session = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  // The bar's right corner, where the profile's glyph capsule is portalled.
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null)
  const myProfile = useMyProfile(session.status === 'signedIn')
  const host = useMemo(() => ({ open: () => setIsEditing(true) }), [])
  const isOwnAddress = decodeURIComponent(pathname) === `/u/${id}`
  if (!isOwnAddress) return null

  const customer = session.customer
  const settings = myProfile.settings

  return (
    <Sheet
      title={t('Профиль')}
      cancelLabel={isEditing ? 'Отмена' : 'Закрыть'}
      onCancel={isEditing ? () => setIsEditing(false) : undefined}
      onClose={() => router.back()}
      barEnd={isEditing ? undefined : <span ref={setActionsSlot} />}
      action={
        isEditing
          ? {
              label: isSaving ? t('Сохраняем…') : t('Готово'),
              form: EDIT_FORM_ID,
              disabled: isSaving || !settings,
            }
          : undefined
      }
    >
      {isEditing ? (
        settings &&
        customer && (
          <ProfileStyleForm
            formId={EDIT_FORM_ID}
            settings={settings}
            profile={myProfile.profile}
            name={customer.name || t('Вы')}
            avatarUrl={customer.avatarUrl ?? null}
            onSave={async (input) => {
              await myProfile.save(input)
              router.refresh()
            }}
            onDone={() => setIsEditing(false)}
            onSavingChange={setIsSaving}
          />
        )
      ) : (
        <ProfileEditorHostContext value={host}>
          <ProfileActionsSlotContext value={actionsSlot}>{children}</ProfileActionsSlotContext>
        </ProfileEditorHostContext>
      )}
    </Sheet>
  )
}
