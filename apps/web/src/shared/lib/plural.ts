type PluralForms = [one: string, few: string, many: string]

// The word alone, for layouts that show the number separately («5» over «записей»).
export const pluralWord = (count: number, [one, few, many]: PluralForms) => {
  const lastDigit = count % 10
  const lastTwo = count % 100
  if (lastDigit === 1 && lastTwo !== 11) return one
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return few

  return many
}

export const pluralize = (count: number, forms: PluralForms) =>
  `${count} ${pluralWord(count, forms)}`
