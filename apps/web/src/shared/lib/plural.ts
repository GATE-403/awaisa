type PluralForms = [one: string, few: string, many: string]

export const pluralize = (count: number, [one, few, many]: PluralForms) => {
  const lastDigit = count % 10
  const lastTwo = count % 100
  if (lastDigit === 1 && lastTwo !== 11) return `${count} ${one}`
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${count} ${few}`

  return `${count} ${many}`
}
