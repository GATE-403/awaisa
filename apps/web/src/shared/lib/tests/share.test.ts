import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copyText, saveFile, shareLink } from '../share'

const writeText = vi.fn<(text: string) => Promise<void>>()

const stubScreen = (isTouch: boolean) =>
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: isTouch }),
    setTimeout: (callback: () => void) => callback(),
  })

const stubNavigator = (extra: Partial<Navigator> = {}) =>
  vi.stubGlobal('navigator', { clipboard: { writeText }, ...extra })

const abort = () => new DOMException('closed', 'AbortError')

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined)
  stubScreen(false)
  stubNavigator()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('copyText', () => {
  it('says whether the text reached the clipboard', async () => {
    expect(await copyText('https://awaisa.kg/old-school')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('https://awaisa.kg/old-school')

    writeText.mockRejectedValueOnce(new Error('NotAllowedError'))
    expect(await copyText('x')).toBe(false)
  })

  it('fails quietly without a clipboard', async () => {
    vi.stubGlobal('navigator', {})
    expect(await copyText('x')).toBe(false)
  })
})

describe('shareLink', () => {
  const link = { url: 'https://awaisa.kg/u/aibek', title: 'Айбек' }

  it('opens the share sheet where there is one', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ share })

    expect(await shareLink(link)).toBe('shared')
    expect(share).toHaveBeenCalledWith(link)
    expect(writeText).not.toHaveBeenCalled()
  })

  it('takes a closed sheet as cancelled and other failures as failed', async () => {
    stubNavigator({ share: vi.fn().mockRejectedValue(abort()) })
    expect(await shareLink(link)).toBe('cancelled')

    stubNavigator({ share: vi.fn().mockRejectedValue(new Error('NotAllowedError')) })
    expect(await shareLink(link)).toBe('failed')
  })

  it('copies the link without a share sheet', async () => {
    expect(await shareLink(link)).toBe('copied')
    expect(writeText).toHaveBeenCalledWith(link.url)

    writeText.mockRejectedValueOnce(new Error('NotAllowedError'))
    expect(await shareLink(link)).toBe('failed')
  })

  it('copies with a mouse when the sheet is for touch screens only', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ share })

    expect(await shareLink({ ...link, isTouchOnly: true })).toBe('copied')
    expect(share).not.toHaveBeenCalled()

    stubScreen(true)
    expect(await shareLink({ ...link, text: 'Привет', isTouchOnly: true })).toBe('shared')
    expect(share).toHaveBeenCalledWith({ ...link, text: 'Привет' })
  })
})

describe('saveFile', () => {
  const file = new File(['{}'], 'awaisa-2026-11-24.json', { type: 'application/json' })

  it('uses the share sheet on touch screens', async () => {
    stubScreen(true)
    const share = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ share, canShare: () => true })

    expect(await saveFile(file, 'Мои данные')).toBe('saved')
    expect(share).toHaveBeenCalledWith({ files: [file], title: 'Мои данные' })

    share.mockRejectedValueOnce(abort())
    expect(await saveFile(file)).toBe('cancelled')

    share.mockRejectedValueOnce(new Error('NotAllowedError'))
    await expect(saveFile(file)).rejects.toThrow('NotAllowedError')
  })

  it('downloads it with a mouse and lets the address go afterwards', async () => {
    const share = vi.fn()
    stubNavigator({ share, canShare: () => true })
    const link = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
    vi.stubGlobal('document', { createElement: () => link, body: { append: vi.fn() } })
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:file')

    expect(await saveFile(file)).toBe('saved')
    expect(share).not.toHaveBeenCalled()
    expect(link).toMatchObject({ href: 'blob:file', download: 'awaisa-2026-11-24.json' })
    expect(link.click).toHaveBeenCalled()
    expect(revoke).toHaveBeenCalledWith('blob:file')
  })
})
