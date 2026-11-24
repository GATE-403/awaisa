// TypeORM's `query()` on Postgres answers `[rows, affected]` for UPDATE / DELETE … RETURNING
// and plain rows for everything else.
const returnedRows = <T = Record<string, unknown>>(result: unknown) =>
  (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result) as T[]

// Postgres sends numeric and bigint as strings and an empty aggregate as null.
const toNumber = (value: unknown) => Number(value ?? 0)

export { returnedRows, toNumber }
