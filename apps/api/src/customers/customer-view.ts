import type { Customer } from './customer.entity.js'

type CustomerView = {
  id: string
  phone: string
  name: string
  isAdmin: boolean
  avatarUrl: string | null
}

const toCustomerView = (customer: Customer, adminPhones: string[]): CustomerView => ({
  id: customer.id,
  phone: customer.phone,
  name: customer.name,
  isAdmin: adminPhones.includes(customer.phone),
  avatarUrl: customer.avatarUrl ?? null,
})

export type { CustomerView }
export { toCustomerView }
