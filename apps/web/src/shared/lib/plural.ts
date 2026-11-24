type PluralForms = [one: string, other: string]

// The word alone, for layouts that show the number separately («5» over «bookings»).
export const pluralWord = (count: number, [one, other]: PluralForms) => (count === 1 ? one : other)

export const pluralize = (count: number, forms: PluralForms) =>
  `${count} ${pluralWord(count, forms)}`
