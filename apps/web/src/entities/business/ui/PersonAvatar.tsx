import { Avatar, type AvatarProps } from '@awaisa/ui/Avatar'
import { monogramTint } from './BusinessTile/BusinessTile'

// A person's face everywhere (clients, masters, the team, reviewers): their photo, or their
// initials on their own colour from the name — the same person looks the same on every screen.
export const PersonAvatar = ({ name, style, ...props }: AvatarProps) => (
  <Avatar name={name} style={style ?? monogramTint(name)} {...props} />
)
