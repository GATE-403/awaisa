// Public API of the slice: other layers import only from here (Feature-Sliced Design).

export { INTERESTS, usePreferences } from './lib/preferences'
export { deviceSession, rememberService, trackBookedPick } from './lib/signals'
export { ForYouShelf } from './ui/ForYouShelf'
export { PreferencesSheet } from './ui/PreferencesSheet'
