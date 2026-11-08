import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { Customer } from '../customers/customer.entity.js'
import { Business } from './business.entity.js'

type MemberRole = 'owner' | 'staff'

@Entity({ name: 'business_members' })
export class BusinessMember {
  @PrimaryColumn({ name: 'business_id', type: 'uuid' })
  businessId: string

  @PrimaryColumn({ name: 'customer_id', type: 'uuid' })
  customerId: string

  @Column({ type: 'varchar', length: 16, default: 'owner' })
  role: MemberRole

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business?: Business

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer
}

export type { MemberRole }
