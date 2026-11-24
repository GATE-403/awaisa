import type { Customer as CustomerView } from '@awaisa/contracts'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { Env } from '../config/env.js'
import { Customer } from './customer.entity.js'
import { toCustomerView } from './customer-view.js'

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async rename(customer: Customer, name: string): Promise<CustomerView> {
    await this.customers.update({ id: customer.id }, { name })

    return toCustomerView({ ...customer, name }, this.config.get('ADMIN_PHONES', { infer: true }))
  }
}
