export type UpiApp = 'gpay' | 'phonepe' | 'paytm'

export type UpiPaymentParams = {
  app: UpiApp
  payeeUpiId: string
  payeeName: string
  amount: number
  currency?: string
  note?: string
}

const appSchemes: Record<UpiApp, string> = {
  gpay: 'gpay://upi/pay',
  phonepe: 'phonepe://pay',
  paytm: 'paytmmp://pay',
}

export const upiApps: Array<{ id: UpiApp; label: string }> = [
  { id: 'gpay', label: 'GPay' },
  { id: 'phonepe', label: 'PhonePe' },
  { id: 'paytm', label: 'Paytm' },
]

export function normalizeUpiId(value: string) {
  return value.trim().toLowerCase()
}

export function isValidUpiId(value: string) {
  return /^[a-z0-9._-]+@[a-z0-9.-]+$/i.test(normalizeUpiId(value))
}

export function buildUpiDeepLink({
  app,
  payeeUpiId,
  payeeName,
  amount,
  currency = 'INR',
  note,
}: UpiPaymentParams) {
  const params = new URLSearchParams({
    pa: normalizeUpiId(payeeUpiId),
    pn: payeeName.trim() || 'ShareSplit member',
    am: amount.toFixed(2),
    cu: currency,
  })

  if (note?.trim()) params.set('tn', note.trim())

  return `${appSchemes[app]}?${params.toString()}`
}
