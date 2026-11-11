'use client'

import { useState } from 'react'
import styles from './Place.module.css'

interface AddressLineProps {
  address: string
}

// The street fits one line next to the status; a long one is cut, and a tap shows it whole.
export const AddressLine = ({ address }: AddressLineProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <button
      type='button'
      className={styles.address}
      aria-expanded={isExpanded}
      title={address}
      onClick={() => setIsExpanded((value) => !value)}
    >
      {address}
    </button>
  )
}
