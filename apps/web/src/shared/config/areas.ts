/**
 * Bishkek's districts and landmarks people name when asked «где вы?» — a point inside each,
 * close enough to sort places by distance when the browser's location is not shared.
 */
const BISHKEK_AREAS = [
  { label: 'Центр, ЦУМ', lat: 42.8763, lng: 74.6113 },
  { label: 'Ошский рынок', lat: 42.8746, lng: 74.5762 },
  { label: 'Восток-5', lat: 42.8373, lng: 74.6574 },
  { label: 'Асанбай', lat: 42.8213, lng: 74.6262 },
  { label: 'Джал', lat: 42.8268, lng: 74.577 },
  { label: 'Кок-Жар', lat: 42.8155, lng: 74.6073 },
  { label: 'Тунгуч', lat: 42.8435, lng: 74.6312 },
  { label: 'Микрорайоны 6–12', lat: 42.838, lng: 74.615 },
  { label: 'Кызыл-Аскер', lat: 42.865, lng: 74.645 },
  { label: 'Аламедин', lat: 42.8936, lng: 74.6292 },
  { label: 'Восточный автовокзал', lat: 42.8757, lng: 74.6511 },
  { label: 'Арча-Бешик', lat: 42.896, lng: 74.526 },
] as const

export { BISHKEK_AREAS }
