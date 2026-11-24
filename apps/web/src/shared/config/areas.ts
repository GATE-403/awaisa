/**
 * Bishkek's districts and landmarks people name when asked «where are you?» - a point inside each,
 * close enough to sort places by distance when the browser's location is not shared.
 */
const BISHKEK_AREAS = [
  { label: 'Centre, TsUM', lat: 42.8763, lng: 74.6113 },
  { label: 'Osh Bazaar', lat: 42.8746, lng: 74.5762 },
  { label: 'Vostok-5', lat: 42.8373, lng: 74.6574 },
  { label: 'Asanbay', lat: 42.8213, lng: 74.6262 },
  { label: 'Dzhal', lat: 42.8268, lng: 74.577 },
  { label: 'Kok-Zhar', lat: 42.8155, lng: 74.6073 },
  { label: 'Tunguch', lat: 42.8435, lng: 74.6312 },
  { label: 'Microdistricts 6-12', lat: 42.838, lng: 74.615 },
  { label: 'Kyzyl-Asker', lat: 42.865, lng: 74.645 },
  { label: 'Alamedin', lat: 42.8936, lng: 74.6292 },
  { label: 'East bus station', lat: 42.8757, lng: 74.6511 },
  { label: 'Archa-Beshik', lat: 42.896, lng: 74.526 },
] as const

export { BISHKEK_AREAS }
