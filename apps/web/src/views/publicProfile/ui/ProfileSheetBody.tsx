import { profileStyle } from '@/entities/profile'
import type { PublicProfile } from '@/shared/api/types'
import styles from '../ProfilePage.module.css'
import { ProfileContent } from './ProfileContent'

// The profile inside the sheet: the same content as the page, on the profile's colour, without
// the page's trail (the sheet's bar is the way back).
export const ProfileSheetBody = ({ profile }: { profile: PublicProfile }) => (
  <div className={styles.sheetBody} style={profileStyle(profile.accent)}>
    <ProfileContent profile={profile} />
  </div>
)
