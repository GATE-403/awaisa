// A reload of a booking opened over a page goes back to that page and opens the booking again
// (`BookingReturnOnReload`): the sheet was on screen before the reload, so it comes back in place
// instead of sliding up a second time. Read while rendering, cleared by the sheet's effect (an
// initializer that cleared it would see it only once, and Strict Mode calls it twice).
let isAlreadyUp = false

const noteSheetAlreadyUp = () => {
  isAlreadyUp = true
}

const isSheetAlreadyUp = () => isAlreadyUp

const clearSheetAlreadyUp = () => {
  isAlreadyUp = false
}

export { clearSheetAlreadyUp, isSheetAlreadyUp, noteSheetAlreadyUp }
