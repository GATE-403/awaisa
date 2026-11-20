// Where «Что нового» was opened from in the cabinet, so the page can lead back to that business
// and tab (it has the client header, which has no way back there). Kept for the tab only.
const KEY = 'awaisa:updates-from:v1'

const rememberUpdatesFrom = (path: string) => {
  try {
    sessionStorage.setItem(KEY, path)
  } catch {}
}

const readUpdatesFrom = () => {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

const forgetUpdatesFrom = () => {
  try {
    sessionStorage.removeItem(KEY)
  } catch {}
}

export { forgetUpdatesFrom, readUpdatesFrom, rememberUpdatesFrom }
