import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'customers' })
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 16, unique: true })
  phone: string

  @Column({ type: 'varchar', length: 120, default: '' })
  name: string

  @Column({ name: 'avatar_url', type: 'varchar', length: 512, nullable: true })
  avatarUrl: string | null

  /** Profile banner preset (`profiles/profile-style.ts`); null = picked from the name. */
  @Column({ type: 'varchar', length: 16, nullable: true })
  banner: string | null

  /** Profile accent colour key; null = the name's own tint. */
  @Column({ type: 'varchar', length: 16, nullable: true })
  accent: string | null

  @Column({ type: 'varchar', length: 80, default: '' })
  status: string

  /** One emoji in front of the status (empty = none). */
  @Column({ name: 'status_emoji', type: 'varchar', length: 16, default: '' })
  statusEmoji: string

  /** The short profile address: `/u/<handle>` (unique regardless of case). */
  @Column({ type: 'varchar', length: 24, nullable: true })
  handle: string | null

  /** A few lines about oneself on the profile. */
  @Column({ type: 'varchar', length: 160, default: '' })
  about: string

  /** Handles (Instagram, Telegram, TikTok) and a website - `profiles/profile-links.ts`. */
  @Column({ name: 'social_links', type: 'jsonb', default: {} })
  socialLinks: Partial<Record<'instagram' | 'telegram' | 'tiktok' | 'website', string>>

  /** Up to three earned achievement ids shown beside the name. */
  @Column({ name: 'featured_badges', type: 'text', array: true, default: '{}' })
  featuredBadges: string[]

  /** «Мой мастер»: a master the client has been to. */
  @Column({ name: 'favorite_master_id', type: 'varchar', length: 64, nullable: true })
  favoriteMasterId: string | null

  /** Others can open `/u/<id>`; off = only the owner sees it. */
  @Column({ name: 'is_public', type: 'boolean', default: true })
  isPublic: boolean

  /** The places and masters on the profile; off = only badges and reviews. */
  @Column({ name: 'show_places', type: 'boolean', default: true })
  showPlaces: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
