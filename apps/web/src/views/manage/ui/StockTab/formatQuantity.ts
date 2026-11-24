const formatQuantity = (value: number) =>
  value.toLocaleString('en-GB', { maximumFractionDigits: 2 })

export { formatQuantity }
