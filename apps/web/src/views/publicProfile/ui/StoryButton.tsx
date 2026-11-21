'use client'

import { Button, ButtonLink } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { InstagramLogo } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { useT } from '@/shared/i18n'
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
      <Button variant='secondary' size='sm' onClick={open} disabled={isBusy}>
        <InstagramLogo weight='bold' aria-hidden />
        {isBusy ? t('Готовим…') : t('В сторис')}
      </Button>
      {story && (
        <Sheet title={t('Для сторис')} cancelLabel={t('Закрыть')} onClose={() => setStory(null)}>
          <div className={styles.preview}>
            {/* biome-ignore lint/performance/noImgElement: a generated picture (blob: URL) */}
            <img src={story.url} alt={t('Картинка профиля для сторис')} className={styles.image} />
            <div className={styles.actions}>
              {canShare && (
                <Button size='lg' fullWidth onClick={share}>
                  {t('Поделиться')}
                </Button>
              )}
              <ButtonLink
                href={story.url}
                download={story.file.name}
                variant={canShare ? 'secondary' : 'primary'}
                size='lg'
                fullWidth
              >
                {t('Скачать картинку')}
              </ButtonLink>
            </div>
          </div>
        </Sheet>
      )}
    </>
  )
}
