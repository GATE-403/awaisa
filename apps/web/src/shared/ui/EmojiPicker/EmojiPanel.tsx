'use client'

import { Trans, useLingui } from '@lingui/react/macro'
import { EmojiPicker } from 'frimousse'
import { EMOJI_COLUMNS, EMOJI_DATA_URL } from './config'
import styles from './EmojiPicker.module.css'

interface EmojiPanelProps {
  onPick: (emoji: string) => void
}

// The picker itself (Frimousse: unstyled parts, styled here with tokens). English names and
// search; the emoji data comes from our own `/emoji-data` path, never a CDN in the browser.
export const EmojiPanel = ({ onPick }: EmojiPanelProps) => {
  const { t } = useLingui()

  return (
    <EmojiPicker.Root
      className={styles.picker}
      locale='en'
      columns={EMOJI_COLUMNS}
      emojibaseUrl={EMOJI_DATA_URL}
      onEmojiSelect={({ emoji }) => onPick(emoji)}
    >
      <div className={styles.top}>
        <EmojiPicker.Search className={styles.search} placeholder={t`Search emoji`} autoFocus />
        <EmojiPicker.SkinToneSelector className={styles.skinTone} aria-label={t`Skin tone`} />
      </div>
      <EmojiPicker.Viewport className={styles.viewport}>
        <EmojiPicker.Loading className={styles.note}>
          <Trans>Loading…</Trans>
        </EmojiPicker.Loading>
        <EmojiPicker.Empty className={styles.note}>
          <Trans>Nothing found</Trans>
        </EmojiPicker.Empty>
        <EmojiPicker.List
          className={styles.list}
          components={{
            CategoryHeader: ({ category, ...props }) => (
              <div {...props} className={styles.category}>
                {category.label}
              </div>
            ),
            Row: ({ children, ...props }) => (
              <div {...props} className={styles.row}>
                {children}
              </div>
            ),
            Emoji: ({ emoji, ...props }) => (
              <button {...props} type='button' className={styles.emoji}>
                {emoji.emoji}
              </button>
            ),
          }}
        />
      </EmojiPicker.Viewport>
    </EmojiPicker.Root>
  )
}
