import { Fragment, type ReactNode } from 'react'

interface FilledProps {
  /** A translated sentence; `{name}` marks where each part goes. */
  text: string
  parts: Record<string, ReactNode>
}

// A sentence with figures drawn inside it (bold), translated as one string, never glued from pieces.
export const Filled = ({ text, parts }: FilledProps) => (
  <>
    {text.split(/\{(\w+)\}/).map((piece, index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: the pieces of one fixed sentence never move.
      <Fragment key={index}>{index % 2 === 1 ? parts[piece] : piece}</Fragment>
    ))}
  </>
)
