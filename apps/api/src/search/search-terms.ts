/**
 * Search that forgives how people type: case and «ё», the wrong keyboard layout («cnhb;rf»),
 * Latin transliteration («strizhka»), word forms («стрижку», «подстричься»), everyday words
 * («ногти», «покраска») and typos («стришка», «маникур» - fixed against the site's own words).
 * Pure functions; `SearchService` feeds them the vocabulary.
 */

const EN_TO_RU: Record<string, string> = {
  q: 'й',
  w: 'ц',
  e: 'у',
  r: 'к',
  t: 'е',
  y: 'н',
  u: 'г',
  i: 'ш',
  o: 'щ',
  p: 'з',
  '[': 'х',
  ']': 'ъ',
  a: 'ф',
  s: 'ы',
  d: 'в',
  f: 'а',
  g: 'п',
  h: 'р',
  j: 'о',
  k: 'л',
  l: 'д',
  ';': 'ж',
  "'": 'э',
  z: 'я',
  x: 'ч',
  c: 'с',
  v: 'м',
  b: 'и',
  n: 'т',
  m: 'ь',
  ',': 'б',
  '.': 'ю',
  '`': 'ё',
}

const RU_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(EN_TO_RU).map(([en, ru]) => [ru, en]),
)

// Longest first, so «sch» wins over «s».
const TRANSLIT: [string, string][] = [
  ['shch', 'щ'],
  ['sch', 'щ'],
  ['yo', 'ё'],
  ['zh', 'ж'],
  ['kh', 'х'],
  ['ts', 'ц'],
  ['ch', 'ч'],
  ['sh', 'ш'],
  ['yu', 'ю'],
  ['ya', 'я'],
  ['ju', 'ю'],
  ['ja', 'я'],
  ['a', 'а'],
  ['b', 'б'],
  ['v', 'в'],
  ['w', 'в'],
  ['g', 'г'],
  ['d', 'д'],
  ['e', 'е'],
  ['z', 'з'],
  ['i', 'и'],
  ['j', 'й'],
  ['y', 'ы'],
  ['k', 'к'],
  ['l', 'л'],
  ['m', 'м'],
  ['n', 'н'],
  ['o', 'о'],
  ['p', 'п'],
  ['r', 'р'],
  ['s', 'с'],
  ['t', 'т'],
  ['u', 'у'],
  ['f', 'ф'],
  ['h', 'х'],
  ['c', 'к'],
  ['x', 'кс'],
  ['q', 'к'],
]

/**
 * Everyday words and common misspellings → the stems that service names use. Keys are stems of
 * what people type; values are what to look for.
 */
const SYNONYMS: [string, string[]][] = [
  ['ногот', ['маникюр', 'ногт']],
  ['ногт', ['маникюр', 'ногт']],
  ['маник', ['маникюр']],
  ['педик', ['педикюр']],
  ['гель', ['покрыт', 'маникюр']],
  ['шеллак', ['покрыт']],
  ['подстри', ['стриж']],
  ['постри', ['стриж']],
  ['стриг', ['стриж']],
  ['прическ', ['причёск', 'укладк']],
  ['причес', ['причёск', 'укладк']],
  ['покраск', ['окраш', 'тониров']],
  ['покрас', ['окраш', 'тониров']],
  ['краск', ['окраш']],
  ['колор', ['окраш', 'airtouch']],
  ['мелир', ['окраш', 'airtouch']],
  ['реснич', ['ресниц']],
  ['ресниц', ['ресниц']],
  ['бров', ['бров']],
  ['бород', ['бород']],
  ['усы', ['бород']],
  ['брить', ['брить']],
  ['бритьё', ['брить']],
  ['бритье', ['брить']],
  ['барбер', ['мужск', 'бород']],
  ['массаж', ['массаж']],
  ['спина', ['массаж', 'спин']],
  ['спа', ['spa', 'массаж']],
  ['тату', ['тату']],
  ['татуир', ['тату']],
  ['шугар', ['шугаринг']],
  ['депил', ['шугаринг', 'депиляц', 'воск']],
  ['эпил', ['шугаринг', 'депиляц', 'воск']],
  ['воск', ['воск', 'депиляц']],
  ['чистк', ['чистк']],
  ['лицо', ['лиц', 'чистк', 'пилинг']],
  ['косметол', ['чистк', 'пилинг', 'консультац']],
  ['зуб', ['стомат', 'зуб', 'кариес', 'гигиен']],
  ['стомат', ['стомат', 'кариес', 'гигиен']],
  ['макияж', ['макияж']],
  ['визаж', ['макияж']],
  ['наращ', ['наращ']],
]

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s+-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const isLatin = (value: string) => /^[a-z0-9\s;',.[\]`-]+$/.test(value) && /[a-z]/.test(value)

const fixLayout = (value: string, map: Record<string, string>) =>
  [...value].map((char) => map[char] ?? char).join('')

const transliterate = (value: string) => {
  let rest = value
  let out = ''
  while (rest.length > 0) {
    const pair = TRANSLIT.find(([latin]) => rest.startsWith(latin))
    if (pair) {
      out += pair[1]
      rest = rest.slice(pair[0].length)
    } else {
      out += rest[0]
      rest = rest.slice(1)
    }
  }
  return out
}

/** A word cut to its stem-ish start, so «стрижку» finds «Стрижка» and «брови» finds «Бровей». */
const stemOf = (word: string) => {
  if (word.length <= 4) return word
  return word.slice(0, Math.max(4, word.length - 2))
}

/** Every reading of a query worth looking for: as typed, re-keyed, transliterated, synonyms. */
const readingsOf = (query: string) => {
  const raw = query.toLowerCase().trim()
  const base = normalize(raw)
  const readings = new Set<string>([base])
  if (isLatin(raw)) {
    readings.add(normalize(fixLayout(raw, EN_TO_RU)))
    readings.add(normalize(transliterate(base)))
  } else if (/[а-яё]/.test(base)) {
    // Russian letters typed while meaning a Latin name («ифкиук ыргщз» → «barber shop»).
    readings.add(normalize(fixLayout(raw, RU_TO_EN)))
  }
  return [...readings].filter(Boolean)
}

/** The LIKE stems for one reading: the phrase, each word's stem, and synonym stems. */
const stemsOf = (reading: string) => {
  const stems = new Set<string>()
  if (reading.length >= 2) stems.add(reading)
  for (const word of reading.split(' ')) {
    if (word.length < 3) continue
    stems.add(stemOf(word))
    for (const [key, targets] of SYNONYMS) {
      if (word.startsWith(key) || (key.length >= 5 && key.startsWith(word))) {
        for (const target of targets) stems.add(target)
      }
    }
  }
  return [...stems]
}

/** Trigrams with padding, like pg_trgm: «кот» → « к», «ко», «кот», «от », … */
const trigrams = (word: string) => {
  const padded = `  ${word} `
  const grams = new Set<string>()
  for (let index = 0; index < padded.length - 2; index += 1)
    grams.add(padded.slice(index, index + 3))
  return grams
}

const similarity = (first: string, second: string) => {
  const a = trigrams(first)
  const b = trigrams(second)
  let shared = 0
  for (const gram of a) if (b.has(gram)) shared += 1
  return shared / (a.size + b.size - shared)
}

/** Optimal string alignment distance: an adjacent swap («стиржка») counts as one edit. */
const editDistance = (first: string, second: string) => {
  const rows = first.length + 1
  const cols = second.length + 1
  const d: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (__, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = first[i - 1] === second[j - 1] ? 0 : 1
      const row = d[i] as number[]
      const above = d[i - 1] as number[]
      row[j] = Math.min(
        (above[j] as number) + 1,
        (row[j - 1] as number) + 1,
        (above[j - 1] as number) + cost,
      )
      if (i > 1 && j > 1 && first[i - 1] === second[j - 2] && first[i - 2] === second[j - 1]) {
        row[j] = Math.min(row[j] as number, ((d[i - 2] as number[])[j - 2] as number) + 1)
      }
    }
  }
  return (d[rows - 1] as number[])[cols - 1] as number
}

/**
 * The site's own word closest to a mistyped one, or null. Short words allow one edit, longer
 * ones two (or a trigram match), and the first letter usually stays - people rarely miss it.
 */
const closestWord = (word: string, vocabulary: readonly string[]) => {
  if (word.length < 3) return null
  const allowed = word.length <= 4 ? 1 : word.length <= 7 ? 2 : 3
  let best: { word: string; score: number } | null = null
  for (const candidate of vocabulary) {
    if (Math.abs(candidate.length - word.length) > allowed + 2) continue
    const prefix = candidate.startsWith(word) || word.startsWith(candidate) ? 0.5 : 0
    const distance = editDistance(word, candidate.slice(0, Math.max(word.length, 3)))
    const fullDistance = editDistance(word, candidate)
    const near = Math.min(distance, fullDistance)
    const score =
      (near <= allowed ? 1 - near / (word.length + 1) : 0) +
      similarity(word, candidate) +
      prefix +
      (candidate[0] === word[0] ? 0.2 : 0)
    if (near > allowed && similarity(word, candidate) < 0.35) continue
    if (!best || score > best.score) best = { word: candidate, score }
  }
  return best?.word ?? null
}

/** Rewrites each word to the closest known one; null when nothing needed changing. */
const correctQuery = (query: string, vocabulary: readonly string[]) => {
  const words = normalize(query).split(' ')
  const known = new Set(vocabulary)
  let changed = false
  const fixed = words.map((word) => {
    if (
      word.length < 3 ||
      known.has(word) ||
      vocabulary.some((item) => item.startsWith(stemOf(word)))
    ) {
      return word
    }
    const closest = closestWord(word, vocabulary)
    if (closest && closest !== word) {
      changed = true
      return closest
    }
    return word
  })
  return changed ? fixed.join(' ') : null
}

/** Words of names for the vocabulary: lower case, «ё» as «е», at least three letters. */
const vocabularyOf = (names: readonly string[]) => {
  const words = new Set<string>()
  for (const name of names) {
    for (const word of normalize(name).split(' ')) if (word.length >= 3) words.add(word)
  }
  return [...words]
}

/** `ILIKE` patterns for a set of stems, with `%` and `_` escaped. */
const likePatterns = (stems: readonly string[]) =>
  [...new Set(stems)].map((stem) => `%${stem.replace(/[%_\\]/g, '\\$&')}%`)

export {
  closestWord,
  correctQuery,
  editDistance,
  likePatterns,
  normalize,
  readingsOf,
  similarity,
  stemsOf,
  transliterate,
  vocabularyOf,
}
