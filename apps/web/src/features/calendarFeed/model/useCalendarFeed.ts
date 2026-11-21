'use client'

import { useEffect, useState } from 'react'
import {
  getCalendarFeed,
  issueCalendarFeed,
  setCalendarFeedMaster,
  setCalendarPhones,
} from '@/shared/api/clientApi'
import type { CalendarFeed } from '@/shared/api/types'
import { type FeedScope, readSavedFeed, saveFeed } from '../lib/feedLinks'

// One feed's state: what the API says about it and the secret address, when this device made it.
export const useCalendarFeed = (scope: FeedScope) => {
  const [feed, setFeed] = useState<CalendarFeed | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)
  const { kind, slug } = scope

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        const loaded = await getCalendarFeed({ kind, slug }, controller.signal)
        setFeed(loaded)
        setUrl(readSavedFeed({ kind, slug }, loaded.createdAt))
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError)
      }
    }
    void load()
    return () => controller.abort()
  }, [kind, slug])

  /** A new address; the previous one stops working at once. */
  const issue = async (specialistId: string | null) => {
    const link = await issueCalendarFeed({ kind, slug }, specialistId)
    if (link.feed.createdAt)
      saveFeed({ kind, slug }, { url: link.url, createdAt: link.feed.createdAt })
    setFeed(link.feed)
    setUrl(link.url)
    return link
  }

  const setMaster = async (specialistId: string | null) => {
    setFeed(await setCalendarFeedMaster(slug, specialistId))
  }

  const setPhones = async (isShown: boolean) => {
    setFeed(await setCalendarPhones(slug, isShown))
  }

  return { feed, url, error, issue, setMaster, setPhones }
}
