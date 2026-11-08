import type { Customer } from './customer.entity.js'

type CustomerView = {
  id: string
  phone: string
  name: string
  isAdmin: boolean
}

const toCustomerView = (customer: Customer, adminPhones: string[]): CustomerView => ({
  id: customer.id,
  phone: customer.phone,
  name: customer.name,
  isAdmin: adminPhones.includes(customer.phone),
})

export type { CustomerView }
export { toCustomerView }
