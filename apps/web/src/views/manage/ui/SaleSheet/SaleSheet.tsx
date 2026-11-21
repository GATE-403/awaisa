'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { useToast } from '@awaisa/ui/Toast'
import { type FormEvent, useEffect, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { getErrorMessage } from '@/shared/api/apiError'
import { cancelSale, createSale, getCashDesk } from '@/shared/api/clientApi'
import type {
  AdminBooking,
  Branch,
  Sale,
  SalePaymentMethod,
  Specialist,
  StockItem,
} from '@/shared/api/types'
import { maskAmountInput, maskPhoneInput } from '@/shared/lib/inputMasks'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { formatCount, SALE_METHODS } from '@/views/manage/lib/cashFormat'
import { useCanSeeMoney } from '@/views/manage/model/useManageRole'

interface SaleSheetProps {
  slug: string
  specialists: Specialist[]
  branches: Branch[]
  /** Sold with this visit: its client, master and branch; paid together with it. */
  booking?: AdminBooking | null
  /** A client picked elsewhere (the client card). */
  client?: { phone: string; name: string } | null
  /** The branch whose till is open, for a sale on its own. */
  branchId?: string | null
  method?: SalePaymentMethod
  onClose: () => void
  /** After a sale and after its undo from the toast. */
  onChange?: (sale: Sale) => void
}

const FORM_ID = 'sale-form'
const NO_SELLER = 'none'

const toQuantity = (value: string) => Number(value.replace(',', '.') || 0)

// Selling products from the shelf: how many of each, who sold, how it was paid. Products go
// off the stock at once; the toast offers «Вернуть», which puts them back.
export const SaleSheet = ({
  slug,
  specialists,
  branches,
  booking = null,
  client = null,
  branchId = null,
  method = 'cash',
  onClose,
  onChange,
}: SaleSheetProps) => {
  const toast = useToast()
  const isOwner = useCanSeeMoney()
  const [products, setProducts] = useState<StockItem[] | null>(null)
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [phone, setPhone] = useState(client ? maskPhoneInput(client.phone) : '')
  const [name, setName] = useState(client?.name ?? '')
  const [sellerId, setSellerId] = useState(booking?.specialistId ?? NO_SELLER)
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>(method)
  const [branch, setBranch] = useState(branchId ?? branches[0]?.id ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const lines = (products ?? [])
    .map((product) => ({ product, quantity: toQuantity(quantities[product.id] ?? '') }))
    .filter((line) => line.quantity > 0)
  const total = lines.reduce((sum, line) => sum + line.quantity * (line.product.salePrice ?? 0), 0)
  const overdrawn = lines.find((line) => line.quantity > line.product.quantity)

  useEffect(() => {
    const controller = new AbortController()
    getCashDesk(slug, controller.signal)
      .then((desk) => setProducts(desk.products))
      .catch(() => setProducts([]))
    return () => controller.abort()
  }, [slug])

  const undo = async (sale: Sale) => {
    try {
      onChange?.(await cancelSale(slug, sale.id))
      toast.show({ title: 'Продажа отменена', type: 'success' })
    } catch (error) {
      toast.show({ title: 'Не отменилась', description: getErrorMessage(error), type: 'error' })
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (lines.length === 0 || overdrawn) return
    setIsSaving(true)
    try {
      const sale = await createSale(slug, {
        bookingId: booking?.id ?? null,
        branchId: booking ? null : branch || null,
        customerPhone: booking ? null : phone.replace(/\s/g, '') || null,
        customerName: booking ? null : name.trim() || null,
        sellerId: sellerId === NO_SELLER ? null : sellerId,
        paymentMethod,
        items: lines.map((line) => ({ itemId: line.product.id, quantity: line.quantity })),
      })
      onChange?.(sale)
      toast.show({
        title: `Продано на ${formatPrice(sale.total)}`,
        description: sale.items.map((item) => item.name).join(', '),
        type: 'success',
        action: { label: 'Вернуть', onClick: () => void undo(sale) },
      })
      onClose()
    } catch (error) {
      toast.show({ title: 'Не продалось', description: getErrorMessage(error), type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const sellers = [
    { value: NO_SELLER, label: 'Не указан' },
    ...specialists
      .filter((specialist) => specialist.isActive !== false)
      .map((specialist) => ({ value: specialist.id, label: specialist.name })),
  ]

  return (
    <Sheet
      title={booking ? 'Товары к визиту' : 'Продажа'}
      onClose={onClose}
      action={{
        label: 'Продать',
        form: FORM_ID,
        disabled: lines.length === 0 || Boolean(overdrawn) || isSaving,
      }}
    >
      {products && products.length === 0 ? (
        <EmptyState
          variant='inline'
          title='Нет товаров для продажи'
          text='Отметьте позицию на складе «Продаётся клиентам» и укажите цену.'
          action={
            isOwner ? (
              <ButtonLink href={`/manage/${slug}?tab=stock`} size='sm' variant='secondary'>
                Открыть склад
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
          <section className={sheet.group} aria-label='Товары'>
            <SectionCaption>Товары</SectionCaption>
            <div className={sheet.list}>
              {(products ?? []).map((product) => (
                <label key={product.id} className={sheet.row}>
                  <span>
                    {product.name}
                    <span className={sheet.rowHint}>
                      {formatPrice(product.salePrice ?? 0)} · осталось{' '}
                      {formatCount(product.quantity)} {product.unit}
                    </span>
                  </span>
                  <span className={sheet.rowControl}>
                    <Input
                      variant='plain'
                      aria-label={`Сколько: ${product.name}`}
                      inputMode='decimal'
                      placeholder='0'
                      value={quantities[product.id] ?? ''}
                      onValueChange={(value) =>
                        setQuantities((current) => ({
                          ...current,
                          [product.id]: value.replace(/[^\d,.]/g, '').slice(0, 6),
                        }))
                      }
                    />
                    <span className={sheet.suffix}>{product.unit}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className={sheet.groupFooter}>
              {overdrawn
                ? `На складе только ${formatCount(overdrawn.product.quantity)} ${overdrawn.product.unit}: ${overdrawn.product.name}.`
                : total > 0
                  ? `Итого ${maskAmountInput(String(Math.round(total)))} сом${booking ? ', оплата вместе с визитом' : ''}.`
                  : 'Укажите, сколько продано.'}
            </p>
          </section>

          <section className={sheet.group} aria-label='Оплата'>
            <div className={sheet.list}>
              {!booking && (
                <>
                  <label className={sheet.row}>
                    <span className={sheet.rowLabel}>Клиент</span>
                    <span className={sheet.rowControl}>
                      <Input
                        variant='plain'
                        aria-label='Телефон клиента'
                        type='tel'
                        inputMode='tel'
                        placeholder='Необязательно'
                        value={phone}
                        onValueChange={(value) => setPhone(maskPhoneInput(value))}
                      />
                    </span>
                  </label>
                  {phone !== '' && (
                    <label className={sheet.row}>
                      <span className={sheet.rowLabel}>Имя</span>
                      <span className={sheet.rowControl}>
                        <Input
                          variant='plain'
                          aria-label='Имя клиента'
                          placeholder='Необязательно'
                          value={name}
                          onValueChange={setName}
                        />
                      </span>
                    </label>
                  )}
                </>
              )}
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>Продал</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label='Кто продал'
                    items={sellers}
                    value={sellerId}
                    onValueChange={(value) => value && setSellerId(value)}
                  />
                </span>
              </div>
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>Способ</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label='Способ оплаты'
                    items={SALE_METHODS}
                    value={paymentMethod}
                    onValueChange={(value) => value && setPaymentMethod(value)}
                  />
                </span>
              </div>
              {!booking && branches.length > 1 && (
                <div className={sheet.row}>
                  <span className={sheet.rowLabel}>Филиал</span>
                  <span className={sheet.rowControl}>
                    <Select
                      variant='plain'
                      aria-label='Филиал'
                      items={branches.map((item) => ({ value: item.id, label: item.name }))}
                      value={branch}
                      onValueChange={(value) => value && setBranch(value)}
                    />
                  </span>
                </div>
              )}
            </div>
          </section>
        </form>
      )}
    </Sheet>
  )
}
