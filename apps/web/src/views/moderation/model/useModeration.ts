'use client'

import { useToast } from '@awaisa/ui/Toast'
import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { decideModeration } from '@/shared/api/clientApi'
import { refreshBusiness } from '@/shared/api/revalidate'
import type {
  ModerationAction,
  ModerationItem,
  ModerationLog,
  ModerationQueue,
} from '@/shared/api/types'
import { ACTION_LABELS } from '../config/labels'

type InitialModeration = { queue: ModerationQueue | null; log: ModerationLog | null }

const keyOf = (item: Pick<ModerationItem, 'targetType' | 'targetId'>) =>
  `${item.targetType}:${item.targetId}`

// The queue and the journal, both from the server; a decision takes the thing off the queue and
// puts the decision on top of the journal, and the public page it lived on is read afresh.
const useModeration = (initial: InitialModeration) => {
  const { t } = useLingui()
  const toast = useToast()
  const [items, setItems] = useState(initial.queue?.items ?? [])
  const [log, setLog] = useState(initial.log?.items ?? [])
  const [pending, setPending] = useState<string | null>(null)

  const decide = async (item: ModerationItem, action: ModerationAction) => {
    const key = keyOf(item)
    setPending(key)
    try {
      const decision = await decideModeration({
        targetType: item.targetType,
        targetId: item.targetId,
        action,
      })
      setItems((current) => current.filter((entry) => keyOf(entry) !== key))
      setLog((current) => [decision, ...current])
      if (item.preview?.business) void refreshBusiness(item.preview.business.slug)
      toast.show({ title: t(ACTION_LABELS[action]), type: 'success' })
    } catch (error) {
      toast.show({ title: getErrorMessage(error), type: 'error' })
    } finally {
      setPending(null)
    }
  }

  return {
    items,
    log,
    decide,
    isPending: (item: ModerationItem) => pending === keyOf(item),
    hasError: initial.queue === null,
  }
}

export type { InitialModeration }
export { keyOf, useModeration }
