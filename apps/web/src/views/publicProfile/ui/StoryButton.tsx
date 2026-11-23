'use client'

import { useToast } from '@awaisa/ui/Toast'
import { DownloadSimple, Export, IdentificationBadge } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { useT } from '@/shared/i18n'
import { GlyphButton } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import styles from './StoryButton.module.css'

interface StoryButtonProps {
  address: string
}

type Story = { file: File; url: string }

// A 9:16 card for Instagram or Telegram stories. It opens as a preview first: the result is
// visible, and «Поделиться» / «Скачать» are pressed by the person themselves — Safari refuses a
// share sheet that a finished download (not a tap) tries to open.
export const StoryButton = ({ address }: StoryButtonProps) => {
  const t = useT()
  const toast = useToast()
  const [isBusy, setIsBusy] = useState(false)
  const [story, setStory] = useState<Story | null>(null)
  const [canShare, setCanShare] = useState(false)

  useEffect(
    () => () => {
      if (story) URL.revokeObjectURL(story.url)
    },
    [story],
  )

  const open = async () => {
    setIsBusy(true)
    try {
      const response = await fetch(`/u/${address}/story`)
      if (!response.ok) throw new Error('story')
      const blob = await response.blob()
      const file = new File([blob], `awaisa-${address}.png`, { type: 'image/png' })
      setCanShare(
        window.matchMedia('(pointer: coarse)').matches &&
          Boolean(navigator.canShare?.({ files: [file] })),
      )
      setStory({ file, url: URL.createObjectURL(blob) })
    } catch {
      toast.show({ title: t('Не получилось сделать картинку'), type: 'error' })
    } finally {
      setIsBusy(false)
    }
  }

  const download = () => {
    if (!story) return
    const link = document.createElement('a')
    link.href = story.url
    link.download = story.file.name
    link.click()
  }

  const share = async () => {
    if (!story) return
    try {
      await navigator.share({ files: [story.file] })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.show({ title: t('Не получилось поделиться'), type: 'error' })
    }
  }

  return (
    <>
      <GlyphButton
        // The picture it makes is the profile as a card.
        icon={<IdentificationBadge aria-hidden />}
        label={isBusy ? t('Готовим…') : t('В сторис')}
        onClick={open}
        disabled={isBusy}
      />
      {story && (
        // The picture alone; saving it is one glyph in the sheet's bar («кнопку скачать можно
        // было бы сделать иконкой справа сверху»): the share sheet on a phone, a download with
        // a mouse.
        <Sheet
          title={t('Для сторис')}
          cancelLabel={t('Закрыть')}
          onClose={() => setStory(null)}
          action={
            canShare
              ? {
                  label: t('Поделиться'),
                  icon: <Export aria-hidden />,
                  onClick: () => void share(),
                }
              : {
                  label: t('Скачать картинку'),
                  icon: <DownloadSimple aria-hidden />,
                  onClick: download,
                }
          }
        >
          <div className={styles.preview}>
            {/* biome-ignore lint/performance/noImgElement: a generated picture (blob: URL) */}
            <img src={story.url} alt={t('Картинка профиля для сторис')} className={styles.image} />
          </div>
        </Sheet>
      )}
    </>
  )
}
