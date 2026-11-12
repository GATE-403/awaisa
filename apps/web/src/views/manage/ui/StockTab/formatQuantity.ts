const formatQuantity = (value: number) =>
  value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })

export { formatQuantity }
