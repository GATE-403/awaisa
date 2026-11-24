'use client'

import { useEffect, useState } from 'react'
import { getClientMessagingConfig } from '@/shared/api/clientApi'
import { useT } from '@/shared/i18n'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import forms from '@/views/manage/ui/manageForms.module.css'

// Where clients hear about their visits; nothing is drawn while WhatsApp is off (SMS as always).
export const ClientChannelNote = () => {
  const t = useT()
  const [isWhatsappOn, setIsWhatsappOn] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        const config = await getClientMessagingConfig(controller.signal)
        setIsWhatsappOn(config.isWhatsappOn)
      } catch {
        // A quiet hint: without the answer it simply stays hidden.
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  if (!isWhatsappOn) return null

  return (
    <div className={forms.group}>
      <SectionCaption>{t('To clients')}</SectionCaption>
      <p className={forms.groupEmpty}>
        {t('Visit confirmations and reminders go to WhatsApp, or by SMS without it.')}
      </p>
    </div>
  )
}
