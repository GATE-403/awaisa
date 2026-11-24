'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { useToast } from '@awaisa/ui/Toast'
import { ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { type FormEvent, useEffect, useState } from 'react'
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
import { useFormat } from '@/shared/i18n'
import { localizePath } from '@/shared/i18n/locales'
import { useLocale } from '@/shared/i18n/navigation'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { formatCount, SALE_METHODS, saleMethodLabel } from '@/views/manage/lib/cashFormat'
import { useCanSeeMoney } from '@/views/manage/model/useManageRole'
import { unitLabel } from '@/views/manage/ui/StockTab/stockUnits'

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
// off the stock at once; the toast offers "Undo", which puts them back.
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
  const format = useFormat()
  const toast = useToast()
  const { t } = useLingui()
  const locale = useLocale()
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
      toast.show({ title: t`Sale cancelled`, type: 'success' })
    } catch (error) {
      toast.show({ title: t`Not cancelled`, description: getErrorMessage(error), type: 'error' })
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
        title: t`Sold for ${ph({ amount: format.price(sale.total) })}`,
        description: sale.items.map((item) => item.name).join(', '),
        type: 'success',
        action: { label: t`Undo`, onClick: () => void undo(sale) },
      })
      onClose()
    } catch (error) {
      toast.show({ title: t`Sale failed`, description: getErrorMessage(error), type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const sellers = [
    { value: NO_SELLER, label: t`Not specified` },
    ...specialists
      .filter((specialist) => specialist.isActive !== false)
      .map((specialist) => ({ value: specialist.id, label: specialist.name })),
  ]

  return (
    <Sheet
      title={booking ? t`Products for the visit` : t`Sale`}
      onClose={onClose}
      action={{
        label: t`Sell`,
        form: FORM_ID,
        disabled: lines.length === 0 || Boolean(overdrawn) || isSaving,
      }}
    >
      {products && products.length === 0 ? (
        <EmptyState
          variant='inline'
          title={t`No products for sale`}
          text={t`Mark a stock item “Sold to clients” and set its price.`}
          action={
            isOwner ? (
              <ButtonLink
                href={localizePath(`/manage/${slug}?tab=stock`, locale)}
                size='sm'
                variant='secondary'
              >
                {t`Open stock`}
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
          <section className={sheet.group} aria-label={t`Products`}>
            <SectionCaption>{t`Products`}</SectionCaption>
            <div className={sheet.list}>
              {(products ?? []).map((product) => (
                <label key={product.id} className={sheet.row}>
                  <span>
                    {product.name}
                    <span className={sheet.rowHint}>
                      {t`${ph({ price: format.price(product.salePrice ?? 0) })} · ${ph({ count: formatCount(format, product.quantity) })} ${ph({ unit: unitLabel(product.unit, t) })} left`}
                    </span>
                  </span>
                  <span className={sheet.rowControl}>
                    <Input
                      variant='plain'
                      aria-label={t`How many: ${ph({ name: product.name })}`}
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
                    <span className={sheet.suffix}>{unitLabel(product.unit, t)}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className={sheet.groupFooter}>
              {overdrawn
                ? t`Only ${ph({ count: formatCount(format, overdrawn.product.quantity) })} ${ph({ unit: unitLabel(overdrawn.product.unit, t) })} in stock: ${ph({ name: overdrawn.product.name })}.`
                : total > 0
                  ? booking
                    ? t`Total ${ph({ amount: format.price(Math.round(total)) })}, paid with the visit.`
                    : t`Total ${ph({ amount: format.price(Math.round(total)) })}.`
                  : t`Enter how many were sold.`}
            </p>
          </section>

          <section className={sheet.group} aria-label={t`Payment`}>
            <div className={sheet.list}>
              {!booking && (
                <>
                  <label className={sheet.row}>
                    <span className={sheet.rowLabel}>{t`Client`}</span>
                    <span className={sheet.rowControl}>
                      <Input
                        variant='plain'
                        aria-label={t`Client phone`}
                        type='tel'
                        inputMode='tel'
                        placeholder={t`Optional`}
                        value={phone}
                        onValueChange={(value) => setPhone(maskPhoneInput(value))}
                      />
                    </span>
                  </label>
                  {phone !== '' && (
                    <label className={sheet.row}>
                      <span className={sheet.rowLabel}>{t`Name`}</span>
                      <span className={sheet.rowControl}>
                        <Input
                          variant='plain'
                          aria-label={t`Client name`}
                          placeholder={t`Optional`}
                          value={name}
                          onValueChange={setName}
                        />
                      </span>
                    </label>
                  )}
                </>
              )}
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t`Sold by`}</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label={t`Who sold it`}
                    items={sellers}
                    value={sellerId}
                    onValueChange={(value) => value && setSellerId(value)}
                  />
                </span>
              </div>
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t`Method`}</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label={t`Payment method`}
                    items={SALE_METHODS.map((item) => ({
                      ...item,
                      label: saleMethodLabel(item.value, t),
                    }))}
                    value={paymentMethod}
                    onValueChange={(value) => value && setPaymentMethod(value)}
                  />
                </span>
              </div>
              {!booking && branches.length > 1 && (
                <div className={sheet.row}>
                  <span className={sheet.rowLabel}>{t`Branch`}</span>
                  <span className={sheet.rowControl}>
                    <Select
                      variant='plain'
                      aria-label={t`Branch`}
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
