'use client'

import { createContext, useContext } from 'react'

// Where the profile's actions go when it is shown in a sheet: the sheet's bar holds an element
// for them, and the content portals its glyph capsule there.
const ProfileActionsSlotContext = createContext<HTMLElement | null>(null)

const useProfileActionsSlot = () => useContext(ProfileActionsSlotContext)

export { ProfileActionsSlotContext, useProfileActionsSlot }
