// The Russian text is the key; each entry is its Kyrgyz and English text. `{name}` is filled in.
type Entry = [ky: string, en: string]

// Counted words, keyed by the Russian «many» form (`t.count(n, [one, few, many])`): Kyrgyz does
// not change the noun after a number; English has one / other.
type CountedEntry = [ky: string, enOne: string, enOther: string]

export type { CountedEntry, Entry }
