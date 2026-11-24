// Copying, sharing and saving from the page. The toasts stay with the callers: each says it in
// its own words.

type ShareLinkInput = {
  url: string
  title: string
  text?: string
  /**
   * Use the share sheet only on touch screens: desktop sheets lead with «Копировать», so a
   * mouse gets the link copied straight away.
   */
  isTouchOnly?: boolean
}

/** `shared` and `cancelled` come from the share sheet, `copied` from the fallback. */
type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

const isTouchScreen = () => window.matchMedia('(pointer: coarse)').matches

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'

/** Whether the browser has a share sheet at all (render-safe). */
const canShareLinks = () => typeof navigator !== 'undefined' && 'share' in navigator

/** True when the text is on the clipboard. */
const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** The share sheet where there is one, else the link copied. Closing the sheet is not an error. */
const shareLink = async ({
  url,
  title,
  text,
  isTouchOnly = false,
}: ShareLinkInput): Promise<ShareResult> => {
  const hasSheet = Boolean(navigator.share) && (!isTouchOnly || isTouchScreen())
  if (!hasSheet) return (await copyText(url)) ? 'copied' : 'failed'

  try {
    await navigator.share(text === undefined ? { title, url } : { title, text, url })
    return 'shared'
  } catch (error) {
    return isAbort(error) ? 'cancelled' : 'failed'
  }
}

/**
 * Phones save a file through the share sheet («Сохранить изображение»). Desktop browsers can
 * share files too, but their sheet offers «Копировать» first, so they get a real download.
 * Resolves `cancelled` when the sheet was closed; other failures are thrown.
 */
const saveFile = async (file: File, title?: string): Promise<'saved' | 'cancelled'> => {
  if (isTouchScreen() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share(title === undefined ? { files: [file] } : { files: [file], title })
      return 'saved'
    } catch (error) {
      if (isAbort(error)) return 'cancelled'
      throw error
    }
  }

  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.append(link)
  link.click()
  link.remove()
  // Safari starts the download after this tick: revoking at once can cancel it.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'saved'
}

export type { ShareLinkInput, ShareResult }
export { canShareLinks, copyText, saveFile, shareLink }
