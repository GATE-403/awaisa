'use server'

import { updateTag } from 'next/cache'
import { BUSINESSES_TAG, businessTag } from './cacheTags'

const SLUG_PATTERN = /^[a-z0-9-]{3,48}$/

// Called by the cabinet after an owner saves: the next visit to the public page reads fresh data.
// It only drops a cache entry, so it needs no auth — the API itself guards the edit.
export const refreshBusiness = async (slug: string) => {
  if (!SLUG_PATTERN.test(slug)) return
  updateTag(businessTag(slug))
  updateTag(BUSINESSES_TAG)
}
