'use client'

import { createContext, useContext } from 'react'

type ProfileEditorHost = { open: () => void }

// A profile shown inside a sheet edits its look in that same sheet: the sheet provides this, and
// «Изменить» asks it to switch instead of opening a sheet of its own over it.
const ProfileEditorHostContext = createContext<ProfileEditorHost | null>(null)

const useProfileEditorHost = () => useContext(ProfileEditorHostContext)

export { ProfileEditorHostContext, useProfileEditorHost }
