import type { MasterSuggestion } from '@awaisa/contracts'
import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import {
  correctQuery,
  likePatterns,
  normalize,
  readingsOf,
  stemsOf,
  vocabularyOf,
} from './search-terms.js'

type Resolved = {
  /** `ILIKE ANY` patterns for the names to match. */
  patterns: string[]
  /** What was searched instead of the typed text («стрижка» for «cnhb;rf»), or null. */
  corrected: string | null
}

// The vocabulary (words of service and place names) changes only when owners edit their menus.
const VOCABULARY_TTL_MS = 10 * 60 * 1000

// Masters in the search panel: a short group above the places.
const MASTERS_LIMIT = 4

@Injectable()
export class SearchService {
  private vocabulary: { words: string[]; at: number } | null = null

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * How to search for what was typed: every reading of it (as typed, re-keyed, transliterated),
   * their stems and everyday synonyms; when none of that matches anything, the closest words
   * of the site's own names stand in for the typos.
   */
  /**
   * Masters whose first or last name starts with what was typed (as typed, on the other
   * layout or transliterated: «azamat», «фяфьфе» find «Азамат»), at published places, rated
   * first. People search their own master by name, not by the place.
   */
  async masters(query: string, limit = MASTERS_LIMIT): Promise<MasterSuggestion[]> {
    const patterns = readingsOf(query)
      .filter((reading) => reading.length >= 2)
      .flatMap((reading) => [`${reading}%`, `% ${reading}%`])
    if (patterns.length === 0) return []
    const rows = (await this.dataSource.query(
      `SELECT sp."id", sp."name", sp."role", sp."photo_url" AS "photoUrl", sp."rating",
         b."slug", b."name" AS "businessName"
       FROM "specialists" sp
       JOIN "businesses" b ON b."id" = sp."business_id" AND b."is_published"
       WHERE sp."is_active" AND replace(lower(sp."name"), 'ё', 'е') LIKE ANY($1)
       ORDER BY sp."rating" DESC NULLS LAST, sp."name"
       LIMIT $2`,
      [patterns, limit],
    )) as Record<string, unknown>[]
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      role: String(row.role ?? ''),
      photoUrl: (row.photoUrl as string | null) ?? null,
      rating: row.rating === null ? null : Number(row.rating),
      business: { slug: String(row.slug), name: String(row.businessName) },
    }))
  }

  async resolve(query: string): Promise<Resolved | null> {
    const base = normalize(query)
    if (!base) return null
    const readings = readingsOf(query)
    for (const reading of readings) {
      const patterns = likePatterns(stemsOf(reading))
      if (patterns.length > 0 && (await this.hasMatches(patterns))) {
        return { patterns, corrected: reading === base ? null : reading }
      }
    }
    const words = await this.words()
    for (const reading of readings) {
      const corrected = correctQuery(reading, words)
      if (!corrected) continue
      const patterns = likePatterns(stemsOf(corrected))
      if (await this.hasMatches(patterns)) return { patterns, corrected }
    }
    // Nothing anywhere: search what was typed, so the page can say there is nothing.
    return { patterns: likePatterns(stemsOf(base)), corrected: null }
  }

  private async hasMatches(patterns: string[]) {
    const [row] = (await this.dataSource.query(
      `SELECT EXISTS (
         SELECT 1 FROM "services" s
         JOIN "businesses" b ON b."id" = s."business_id" AND b."is_published"
         WHERE s."is_active" AND (s."name" ILIKE ANY($1::text[]) OR b."name" ILIKE ANY($1::text[]))
       ) AS "found"`,
      [patterns],
    )) as { found: boolean }[]
    return Boolean(row?.found)
  }

  private async words() {
    if (this.vocabulary && Date.now() - this.vocabulary.at < VOCABULARY_TTL_MS) {
      return this.vocabulary.words
    }
    const rows = (await this.dataSource.query(
      `SELECT DISTINCT s."name" FROM "services" s
       JOIN "businesses" b ON b."id" = s."business_id" AND b."is_published"
       WHERE s."is_active"
       UNION SELECT "name" FROM "businesses" WHERE "is_published"`,
    )) as { name: string }[]
    const words = vocabularyOf(rows.map((row) => row.name))
    this.vocabulary = { words, at: Date.now() }
    return words
  }
}

export type { Resolved }
