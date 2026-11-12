// CSV as exported from Altegio, YCLIENTS or Excel: «;» or «,» or tab between cells, quotes
// around cells with separators or line breaks, UTF-8 or Windows-1251, a BOM sometimes.

const decodeCsv = (buffer: ArrayBuffer) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    // Excel in Russian locales saves CSV in Windows-1251.
    return new TextDecoder('windows-1251').decode(buffer)
  }
}

const detectDelimiter = (firstLine: string) => {
  const counts = [';', ',', '\t'].map((delimiter) => ({
    delimiter,
    count: firstLine.split(delimiter).length,
  }))
  return counts.sort((first, second) => second.count - first.count)[0].delimiter
}

const parseCsv = (raw: string): string[][] => {
  const text = raw.replace(/^﻿/, '')
  const delimiter = detectDelimiter(text.split(/\r?\n/, 1)[0] ?? '')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let isQuoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (isQuoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (char === '"') {
        isQuoted = false
      } else {
        cell += char
      }
    } else if (char === '"' && cell === '') {
      isQuoted = true
    } else if (char === delimiter) {
      row.push(cell.trim())
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

/** The column whose header looks like one of the names (first exact, then partial match). */
const findColumn = (headers: string[], names: string[]) => {
  const normalized = headers.map((header) => header.toLowerCase().replace(/ё/g, 'е').trim())
  const exact = normalized.findIndex((header) => names.includes(header))
  if (exact !== -1) return exact
  return normalized.findIndex((header) => names.some((name) => header.includes(name)))
}

export { decodeCsv, findColumn, parseCsv }
