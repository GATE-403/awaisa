'use client'

import { createContext, useContext } from 'react'

type ManageRole = 'owner' | 'staff'

// The cabinet's viewer: administrators ("staff") run the day - no money, no setup. The API
// refuses those routes too; this only keeps the cabinet from offering them.
const ManageRoleContext = createContext<ManageRole>('owner')

const useCanSeeMoney = () => useContext(ManageRoleContext) === 'owner'

export type { ManageRole }
export { ManageRoleContext, useCanSeeMoney }
