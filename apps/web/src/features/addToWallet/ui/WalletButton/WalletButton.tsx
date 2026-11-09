'use client'

import { useToast } from '@awaisa/ui/Toast'
import { Wallet } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { parseBookings, readRaw } from '@/entities/booking'
import { getErrorMessage } from '@/shared/api/apiError'
import { getWalletConfig, getWalletLinks } from '@/shared/api/clientApi'
import styles from './WalletButton.module.css'

interface WalletButtonProps {
  bookingId: string
}

type WalletKind = 'apple' | 'google'

let configRequest: Promise<{ apple: boolean; google: boolean }> | null = null

// Apple devices get Apple Wallet, Android gets Google Wallet; elsewhere whichever is set up.
const pickWallet = (config: { apple: boolean; google: boolean }): WalletKind | null => {
  const isApple = /iPhone|iPad|Macintosh/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)
  if (config.apple && (isApple || !isAndroid)) return 'apple'
  if (config.google) return 'google'

  return config.apple ? 'apple' : null
}

const LABELS: Record<WalletKind, string> = {
  apple: 'Добавить в Apple Wallet',
  google: 'Сохранить в Google Wallet',
}

// A real pass, not a picture of one: Wallet brings it to the lock screen before the visit.
export const WalletButton = ({ bookingId }: WalletButtonProps) => {
  const toast = useToast()
  const [kind, setKind] = useState<WalletKind | null>(null)
  const [isOpening, setIsOpening] = useState(false)

  useEffect(() => {
    configRequest ??= getWalletConfig().catch(() => ({ apple: false, google: false }))
    let isActive = true
    void configRequest.then((config) => {
      if (isActive) setKind(pickWallet(config))
    })

    return () => {
      isActive = false
    }
  }, [])

  if (!kind) return null

  const open = async () => {
    setIsOpening(true)
    try {
      const token = parseBookings(readRaw()).find((item) => item.id === bookingId)?.token ?? null
      const links = await getWalletLinks(bookingId, token)
      const url = links[kind]
      if (url) window.location.assign(url)
    } catch (error) {
      toast.show({ title: 'Не получилось', description: getErrorMessage(error), type: 'error' })
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <button type='button' className={styles.button} onClick={open} disabled={isOpening}>
      <Wallet weight='fill' aria-hidden />
      {LABELS[kind]}
    </button>
  )
}
