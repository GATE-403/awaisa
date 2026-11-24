'use client'

import { Popover } from '@awaisa/ui/Popover'
import { Smiley } from '@phosphor-icons/react/ssr'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import styles from './EmojiPicker.module.css'

// The picker's code and data load only once someone opens it.
const EmojiPanel = dynamic(() => import('./EmojiPanel').then((module) => module.EmojiPanel), {
  ssr: false,
  loading: () => <p className={styles.note}>Loading…</p>,
})

interface EmojiButtonProps {
  /** Called with the chosen emoji; the field puts it at its caret. */
  onPick: (emoji: string) => void
}

// A thin ☺ glyph beside a comment field that opens the emoji picker in the kit's popover, above
// the field. Choosing one closes it, so the person goes back to typing.
export const EmojiButton = ({ onPick }: EmojiButtonProps) => {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        ref={setAnchor}
        type='button'
        className={styles.trigger}
        // Keeps the field's caret where it was, so the emoji lands there.
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => setIsOpen((open) => !open)}
        aria-label='Emoji'
        aria-expanded={isOpen}
        title='Emoji'
      >
        <Smiley aria-hidden />
      </button>
      <Popover open={isOpen} onOpenChange={setIsOpen} anchor={anchor} label='Emoji' side='top'>
        {isOpen && (
          <EmojiPanel
            onPick={(emoji) => {
              onPick(emoji)
              setIsOpen(false)
            }}
          />
        )}
      </Popover>
    </>
  )
}
