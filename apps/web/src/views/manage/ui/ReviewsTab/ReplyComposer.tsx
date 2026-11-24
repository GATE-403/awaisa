'use client'

import { useLingui } from '@lingui/react/macro'
import { ArrowBendDownRight, ArrowUp } from '@phosphor-icons/react/ssr'
import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { EmojiButton } from '@/shared/ui/EmojiPicker/EmojiButton'
import { fillReplyTemplate, type ReplyContext } from '@/views/manage/lib/replyTemplate'
import styles from './ReviewsTab.module.css'

interface ReplyComposerProps {
  /** The reply already published (editing), empty for a new one. */
  initial?: string
  placeholder: string
  /** Resolves once saved; the composer keeps the text when it throws. */
  onSave: (text: string) => Promise<void>
  /** Editing only: back to the published reply without saving (Esc, or leaving it unchanged). */
  onCancel?: () => void
  /** The owner's quick replies, offered under the field while it is focused. */
  quickReplies?: string[]
  /** Who and what the review is about, for `{name}`, `{specialist}`, `{service}` in quick replies. */
  context: ReplyContext
  /** Once sent, the next review's field takes the caret, so a backlog is answered in a row. */
  isNextFocused?: boolean
}

// The reply typed right in the thread, like the number on the sign-in screen: a bare field with
// no box or fill, always there under a review waiting for an answer, so the owner just types
// ("let me type into the field … instead of opening it, then writing"). A round send button appears
// once there is something to send; ⌘/Ctrl + Enter sends. Emptying a published reply removes it.
export const ReplyComposer = ({
  initial = '',
  placeholder,
  onSave,
  onCancel,
  quickReplies = [],
  context,
  isNextFocused = false,
}: ReplyComposerProps) => {
  const { t } = useLingui()
  const [text, setText] = useState(initial)
  const [isSaving, setIsSaving] = useState(false)
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(Boolean(onCancel))
  const isEditing = Boolean(onCancel)
  const canSend = isEditing ? text.trim() !== initial.trim() : text.trim().length > 0

  // Opened by "Change": the person asked to type, so the caret goes after the published words
  // (autoFocus left it at the start).
  useEffect(() => {
    const field = fieldRef.current
    if (!isEditing || !field) return
    field.focus()
    field.setSelectionRange(field.value.length, field.value.length)
  }, [isEditing])

  const save = async () => {
    if (!canSend || isSaving) return
    setIsSaving(true)
    // Found before saving: this field leaves the thread once its reply is published.
    const fields = [...document.querySelectorAll<HTMLTextAreaElement>('[data-reply-field]')]
    const at = fieldRef.current ? fields.indexOf(fieldRef.current) : -1
    const next = isNextFocused && at >= 0 ? fields[at + 1] : undefined
    try {
      await onSave(text.trim())
      if (!isEditing) setText('')
      if (next) {
        next.focus({ preventScroll: true })
        next.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    } catch {
      // The toast has said what went wrong; the text stays for another try.
    } finally {
      setIsSaving(false)
    }
  }

  // The emoji goes where the caret is (the end when the field was never focused), and the caret
  // lands after it so typing goes on.
  const insertEmoji = (emoji: string) => {
    const field = fieldRef.current
    const start = field?.selectionStart ?? text.length
    const end = field?.selectionEnd ?? text.length
    setText(text.slice(0, start) + emoji + text.slice(end))
    requestAnimationFrame(() => {
      field?.focus()
      field?.setSelectionRange(start + emoji.length, start + emoji.length)
    })
  }

  // ↓ from the empty field goes into the quick replies; ↑ ↓ move inside, Esc goes back.
  const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const options = [...(listRef.current?.querySelectorAll('button') ?? [])]
    const at = options.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'Escape' || (event.key === 'ArrowUp' && at === 0)) {
      event.preventDefault()
      fieldRef.current?.focus()
      return
    }
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    event.preventDefault()
    options[Math.min(options.length - 1, Math.max(0, at + step))]?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'ArrowDown' && !text.trim()) {
      const first = listRef.current?.querySelector('button')
      if (first) {
        event.preventDefault()
        first.focus()
        return
      }
    }
    if (event.key === 'Escape' && onCancel) {
      onCancel()
      return
    }
    const isSendShortcut = event.key === 'Enter' && (event.metaKey || event.ctrlKey)
    if (!isSendShortcut) return
    event.preventDefault()
    void save()
  }

  const applyQuickReply = (template: string) => {
    setText(fillReplyTemplate(template, context))
    requestAnimationFrame(() => fieldRef.current?.focus())
  }

  return (
    <div className={styles.composerWrap}>
      <div className={styles.composer}>
        <EmojiButton onPick={insertEmoji} />
        <textarea
          ref={fieldRef}
          aria-label={t`Reply to the review`}
          data-reply-field=''
          className={styles.composerField}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          // Editing left unchanged folds back to the published reply (not when the focus only went
          // into the emoji picker's search).
          onFocus={() => setIsFocused(true)}
          onBlur={(event) => {
            const next = event.relatedTarget
            if (next instanceof Element && next.closest('[frimousse-root], [data-quick-replies]')) {
              return
            }
            setIsFocused(false)
            if (onCancel && text.trim() === initial.trim()) onCancel()
          }}
          maxLength={1000}
          rows={1}
          placeholder={placeholder}
        />
        {canSend && (
          <button
            type='button'
            className={styles.send}
            // Pressed before the field loses focus, so an edit is sent rather than folded back.
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => void save()}
            disabled={isSaving}
            aria-label={isEditing && !text.trim() ? t`Delete reply` : t`Send reply`}
            title={t`Send (⌘ Enter)`}
          >
            <ArrowUp aria-hidden />
          </button>
        )}
      </div>
      {/* Quick replies while the field is focused and still empty: compact rows with an "insert"
          glyph and hairlines, lit in the accent under the pointer, so they read as choices without
          a panel around them; the full words in the tooltip; ↑ ↓ move, Enter or a tap fills. */}
      {isFocused && !text.trim() && quickReplies.length > 0 && (
        <div
          ref={listRef}
          className={styles.suggestions}
          data-quick-replies=''
          role='listbox'
          aria-label={t`Quick replies`}
          onKeyDown={handleListKeyDown}
          onBlur={(event) => {
            const next = event.relatedTarget
            if (next instanceof Node && event.currentTarget.parentElement?.contains(next)) return
            setIsFocused(false)
          }}
        >
          {quickReplies.map((template) => {
            const filled = fillReplyTemplate(template, context)
            return (
              <button
                key={template}
                type='button'
                role='option'
                aria-selected={false}
                className={styles.suggestion}
                title={filled}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => applyQuickReply(template)}
              >
                <ArrowBendDownRight aria-hidden />
                <span className={styles.suggestionText}>{filled}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
