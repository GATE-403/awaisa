'use client'

import { useEffect, useState } from 'react'
import { getFeed } from '@/shared/api/clientApi'

type LookPhoto = { id: string; url: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * "I want this" from a work in the catalog (`?look=<photo id>`): the photo the client wants to look
 * like, read back from the place's own feed, so only a visible photo of this place is shown and
 * sent. Anything else is quietly left out: the booking never fails because of it.
 */
export const useLookPhoto = (slug: string, id: string | null) => {
  const [photo, setPhoto] = useState<LookPhoto | null>(null)
  const [isRemoved, setIsRemoved] = useState(false)

  useEffect(() => {
    if (!id || !UUID.test(id)) return
    const controller = new AbortController()
    getFeed({ business: slug, start: id }, controller.signal)
      .then((page) => {
        const first = page.items[0]
        if (first?.id === id) setPhoto({ id: first.id, url: first.url })
      })
      .catch(() => undefined)

    return () => controller.abort()
  }, [slug, id])

  return { photo: isRemoved ? null : photo, remove: () => setIsRemoved(true) }
}

export type { LookPhoto }
