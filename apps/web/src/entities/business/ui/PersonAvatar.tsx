import { Avatar, type AvatarProps } from '@awaisa/ui/Avatar'
import { sizedImage } from '@/shared/lib/imageSizes'
import { Mascot } from '@/shared/ui/Mascot/Mascot'
import { monogramTint } from './BusinessTile/BusinessTile'

// The biggest face drawn is ~120px (the leaderboard's first place, a profile head), so 240px
// covers a 2x screen. Masters' photos are 600×800 portraits: a 24px face in a catalog card used
// to download the whole of one (Lighthouse image delivery, ~200 KiB a catalog page).
const FACE_SOURCE_WIDTH = 240

// A person's face everywhere (clients, masters, the team, reviewers): their photo, or the white
// mascot on their own colour from the name — the same person looks the same on every screen.
export const PersonAvatar = ({ name, src, style, ...props }: AvatarProps) => (
  <Avatar
    name={name}
    src={src && sizedImage(src, FACE_SOURCE_WIDTH).src}
    style={style ?? monogramTint(name)}
    fallback={<Mascot />}
    {...props}
  />
)
