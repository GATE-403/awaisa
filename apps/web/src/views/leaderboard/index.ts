// Public API of the slice: other layers import only from here (Feature-Sliced Design).
export { BOARDS, boardHref } from './config/boards'
export { LeaderboardPage } from './LeaderboardPage'
export { boardMetadata, readBoard } from './lib/boardMetadata'
export { LeaderboardSkeleton } from './ui/LeaderboardSkeleton'
