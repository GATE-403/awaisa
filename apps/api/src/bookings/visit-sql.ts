// SQL pieces for a visit of one or several services. The booking's first service is joined as
// usual (`s` on `b."service_id"`); services added to the visit live in `booking_extras`.

/** What the services added to the visit cost now (0 for a visit of one service). */
const extrasPrice = (booking = 'b') =>
  `COALESCE((SELECT SUM(xs."price") FROM "booking_extras" bx
    JOIN "services" xs ON xs."id" = bx."service_id" WHERE bx."booking_id" = ${booking}."id"), 0)`

/** The whole visit's price: its first service plus the ones added to it. */
const visitPrice = (booking = 'b', service = 's') =>
  `(${service}."price" + ${extrasPrice(booking)})`

/**
 * One row per service of the visit (`<alias>."service_id"`), for counting services or sharing a
 * visit's money between them: `JOIN LATERAL ${visitLines()} l ON true`.
 */
const visitLines = (booking = 'b') =>
  `(SELECT ${booking}."service_id" AS "service_id" UNION ALL
    SELECT bx."service_id" FROM "booking_extras" bx WHERE bx."booking_id" = ${booking}."id")`

/**
 * The share of the visit's money that falls on one of its services (`line`), by price: the
 * whole visit for a visit of one service, an equal share when everything was free.
 */
const lineShare = (line = 'ls', booking = 'b', service = 's') =>
  `(CASE WHEN ${visitPrice(booking, service)} > 0
     THEN ${line}."price"::numeric / ${visitPrice(booking, service)}
     ELSE 1.0 / (1 + (SELECT COUNT(*) FROM "booking_extras" bx WHERE bx."booking_id" = ${booking}."id")) END)`

/** Every service's name of the visit joined with « + », the way views say it. */
const visitNames = (booking = 'b', service = 's') =>
  `concat_ws(' + ', ${service}."name", (SELECT string_agg(xs."name", ' + ' ORDER BY bx."position")
    FROM "booking_extras" bx JOIN "services" xs ON xs."id" = bx."service_id"
    WHERE bx."booking_id" = ${booking}."id"))`

export { extrasPrice, lineShare, visitLines, visitNames, visitPrice }
