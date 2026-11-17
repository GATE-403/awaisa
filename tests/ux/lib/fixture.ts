import { test as base } from '@playwright/test'
import { findProfile } from '../personas'
import { UxContext } from './ux'

// Every UX test gets `ux`: the persona and device of its project, with their checks wired in.
const test = base.extend<{ ux: UxContext }>({
  ux: async ({ page }, use, testInfo) => {
    const { persona, device } = findProfile(testInfo.project.name)
    const ux = new UxContext(page, persona, device, testInfo)
    await ux.setup()
    await use(ux)
    await ux.finish()
  },
})

export { expect } from '@playwright/test'
export { test }
