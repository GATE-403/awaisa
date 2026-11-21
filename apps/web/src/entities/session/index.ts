// Public API of the slice: other layers import only from here (Feature-Sliced Design).

export { getCabinetHref, hasCabinet } from './lib/cabinetHref'
export * from './model/useRequireSession'
export { useSession } from './model/useSession'
export { SessionProvider } from './ui/SessionProvider'
