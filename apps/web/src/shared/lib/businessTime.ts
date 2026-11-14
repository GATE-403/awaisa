// Every place is in Bishkek (the API keeps business time at UTC+6). A moment — a review's
// createdAt, a visit — is shown on that clock: formatted without a time zone, the server (UTC in
// production) and the browser print different days between 00:00 and 06:00 Bishkek time, and the
// page fails to hydrate.
const BUSINESS_TIME_ZONE = 'Asia/Bishkek'

export { BUSINESS_TIME_ZONE }
