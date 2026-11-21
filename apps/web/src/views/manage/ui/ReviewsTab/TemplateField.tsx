'use client'

import { Plus } from '@phosphor-icons/react/ssr'
import { type ClipboardEvent, type KeyboardEvent, useEffect, useRef } from 'react'
import { TEMPLATE_TOKENS } from './config'
import styles from './ReviewsTab.module.css'

interface TemplateFieldProps {
  /** The template as stored: plain text with `{имя}`, `{мастер}`, `{услуга}`. */
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
}

const TOKEN_PATTERN = /\{(имя|мастер|услуга)\}/giu

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Stored text → the field's HTML: placeholders become pills nobody has to decode («что за {имя}»).
const toHtml = (value: string) =>
  escapeHtml(value)
    .replace(TOKEN_PATTERN, (_, name: string) => {
      const token = TEMPLATE_TOKENS.find((item) => item.key === name.toLowerCase())
      return token
        ? `<span class="${styles.pill}" contenteditable="false" data-token="${token.key}">${token.label}</span>`
        : `{${name}}`
    })
    .replace(/\n/g, '<br>')

// The field's DOM → stored text: pills back to `{имя}`, line breaks to `\n`.
const fromNode = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  if (!(node instanceof HTMLElement)) return ''
  if (node.dataset.token) return `{${node.dataset.token}}`
  if (node.tagName === 'BR') return '\n'
  const inner = [...node.childNodes].map(fromNode).join('')
  return node.tagName === 'DIV' ? `\n${inner}` : inner
}

const fromField = (field: HTMLElement) =>
  [...field.childNodes].map(fromNode).join('').replace(/ /g, ' ')

// A reply template typed like ordinary text, the client's name, the master and the service as
// pills inserted from the buttons under it (at the caret) and removed whole with Backspace. It
// grows with the text; Enter makes a new line. Stored as plain text with `{имя}` and the rest,
// which the API fills in.
export const TemplateField = ({ value, onChange, label, placeholder }: TemplateFieldProps) => {
  const fieldRef = useRef<HTMLDivElement>(null)
  // The last text this field reported, so a re-render from its own typing never resets the caret.
  const reported = useRef<string | null>(null)

  useEffect(() => {
    const field = fieldRef.current
    if (!field || value === reported.current) return
    field.innerHTML = toHtml(value)
    reported.current = value
  }, [value])

  const report = () => {
    const field = fieldRef.current
    if (!field) return
    const next = fromField(field)
    reported.current = next
    onChange(next)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    document.execCommand('insertLineBreak')
  }

  // Formatting from elsewhere is dropped: the reply is plain text.
  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    document.execCommand('insertText', false, event.clipboardData.getData('text/plain'))
  }

  const insertToken = (key: string, tokenLabel: string) => {
    const field = fieldRef.current
    if (!field) return
    const pill = document.createElement('span')
    pill.className = styles.pill ?? ''
    pill.contentEditable = 'false'
    pill.dataset.token = key
    pill.textContent = tokenLabel
    const selection = window.getSelection()
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null
    if (range && field.contains(range.commonAncestorContainer)) {
      range.deleteContents()
      // A word right before the caret gets a space, so the pill never sticks to it («лучше,Имя»).
      const before = range.startContainer.textContent?.slice(0, range.startOffset) ?? ''
      if (before && !/\s$/.test(before)) range.insertNode(document.createTextNode(' '))
      range.collapse(false)
      range.insertNode(pill)
      range.setStartAfter(pill)
      range.collapse(true)
      selection?.removeAllRanges()
      selection?.addRange(range)
    } else {
      if (field.textContent && !/\s$/.test(field.textContent)) field.append(' ')
      field.append(pill)
    }
    // A space after the pill, so typing goes on as a new word.
    pill.after(document.createTextNode(' '))
    field.focus()
    report()
  }

  return (
    <div className={styles.template}>
      {/* biome-ignore lint/a11y/useSemanticElements: a textbox with pills needs contenteditable */}
      <div
        ref={fieldRef}
        role='textbox'
        aria-multiline='true'
        aria-label={label}
        tabIndex={0}
        contentEditable
        suppressContentEditableWarning
        className={styles.templateField}
        data-placeholder={placeholder}
        onInput={report}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
      <div className={styles.tokens}>
        {TEMPLATE_TOKENS.map((token) => (
          <button
            key={token.key}
            type='button'
            className={styles.tokenButton}
            // Keeps the caret in the field, so the pill lands where it was.
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => insertToken(token.key, token.label)}
          >
            <Plus aria-hidden />
            {token.label}
          </button>
        ))}
      </div>
    </div>
  )
}
