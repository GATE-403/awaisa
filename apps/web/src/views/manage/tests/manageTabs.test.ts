import { describe, expect, it } from 'vitest'
import { isSettingsTab, isTabAllowed, MAIN_TABS, SETTINGS_TABS, toManageTab } from '../manageTabs'

describe('toManageTab', () => {
  it('opens the tab a link names', () => {
    expect(toManageTab('clients')).toBe('clients')
    expect(toManageTab('stock')).toBe('stock')
    expect(toManageTab('settings')).toBe('settings')
  })

  it('lands old links on «Страница»: profile, services, masters and hours moved there', () => {
    for (const old of ['profile', 'services', 'masters', 'hours']) {
      expect(toManageTab(old), old).toBe('page')
    }
  })

  it('opens the schedule for no tab or an unknown one', () => {
    expect(toManageTab(null)).toBe('schedule')
    expect(toManageTab('payments')).toBe('schedule')
  })
})

describe('isTabAllowed', () => {
  it('lets the owner open everything', () => {
    for (const tab of [...MAIN_TABS, ...SETTINGS_TABS]) {
      expect(isTabAllowed(tab.value, 'owner')).toBe(true)
    }
  })

  it('gives an administrator the day only: schedule, clients, the cash desk and reviews', () => {
    const allowed = [...MAIN_TABS, ...SETTINGS_TABS, { value: 'settings' as const }]
      .filter((tab) => isTabAllowed(tab.value, 'staff'))
      .map((tab) => tab.value)
    expect(allowed).toEqual(['schedule', 'clients', 'cash', 'reviews'])
  })
})

describe('isSettingsTab', () => {
  it('knows the settings sections and the list itself', () => {
    expect(isSettingsTab('settings')).toBe(true)
    expect(SETTINGS_TABS.every((tab) => isSettingsTab(tab.value))).toBe(true)
    expect(MAIN_TABS.some((tab) => isSettingsTab(tab.value))).toBe(false)
  })
})
