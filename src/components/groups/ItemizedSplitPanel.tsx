'use client'

import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'

import type { Member } from './CustomSplitPanel'

export type ItemizedLineItem = {
  id: string
  description: string
  amount: string
  claimedBy: string[]
}

type ItemizedSplitPanelProps = {
  currency: string
  items: ItemizedLineItem[]
  members: Member[]
  totalAmount: number
  error?: string | null
  onAddItem: () => void
  onRemoveItem: (itemId: string) => void
  onItemChange: (itemId: string, updates: Partial<Omit<ItemizedLineItem, 'id'>>) => void
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

function toNumber(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function ItemizedSplitPanel({
  currency,
  items,
  members,
  totalAmount,
  error,
  onAddItem,
  onRemoveItem,
  onItemChange,
}: ItemizedSplitPanelProps) {
  const itemTotal = items.reduce((sum, item) => sum + toNumber(item.amount), 0)
  const remaining = totalAmount - itemTotal

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="theme-chip inline-flex w-fit px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-light">
          {items.length} line items
        </div>
        <Button type="button" className="min-h-10 px-4 text-xs" onClick={onAddItem}>
          Add item
        </Button>
      </div>

       <p className="mb-4 text-sm text-muted-light">
         An itemized split is the process of dividing a shared bill (like a restaurant receipt) so that each person pays exactly for the specific items they ordered or consumed, rather than splitting the total evenly.
       </p>

       <div className="space-y-4">
         {items.map((item, index) => {
           const itemAmount = toNumber(item.amount)
           const perClaim = item.claimedBy.length > 0 ? itemAmount / item.claimedBy.length : 0

           return (
             <div key={item.id} className="theme-card bg-surface-raised p-4">
               <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
                 <div>
                   <label
                     htmlFor={`${item.id}-description`}
                     className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-foreground"
                   >
                     Item {index + 1}
                   </label>
                   <input
                     id={`${item.id}-description`}
                     className="theme-input h-11 w-full px-3 text-sm"
                     placeholder="Pizza, tickets, cab"
                     value={item.description}
                     onChange={(event) => onItemChange(item.id, { description: event.target.value })}
                   />
                 </div>
                 <div>
                   <label
                     htmlFor={`${item.id}-amount`}
                     className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-foreground"
                   >
                     Amount
                   </label>
                   <input
                     id={`${item.id}-amount`}
                     type="number"
                     min="0"
                     step="0.01"
                     inputMode="decimal"
                     className="theme-input h-11 w-full px-3 text-sm"
                     placeholder="0.00"
                     value={item.amount}
                     onChange={(event) => onItemChange(item.id, { amount: event.target.value })}
                   />
                 </div>
                 <Button
                   type="button"
                   variant="secondary"
                   className="min-h-11 px-3 text-xs"
                   onClick={() => onRemoveItem(item.id)}
                   disabled={items.length === 1}
                 >
                   Remove
                 </Button>
               </div>

               <div className="mt-4">
                 <div className="mb-2 flex items-center justify-between gap-3">
                   <p className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">Claimed by</p>
                   <p className="text-xs text-muted-light">{formatCurrency(perClaim || 0, currency)} each</p>
                 </div>
                 <div className="grid gap-2 sm:grid-cols-2">
                   {members.map((member) => {
                     const checked = item.claimedBy.includes(member.id)
                     const nextClaimedBy = checked
                       ? item.claimedBy.filter((memberId) => memberId !== member.id)
                       : [...item.claimedBy, member.id]

                     return (
                       <label
                         key={member.id}
                         className="theme-card flex cursor-pointer items-center justify-between gap-3 bg-surface px-3 py-2"
                         style={{ touchAction: 'manipulation', minHeight: '44px' }}
                       >
                         <span className="flex min-w-0 items-center gap-2">
                           <Avatar alt={member.name} fallback={member.name} size="sm" />
                           <span className="truncate text-sm font-bold text-foreground">{member.name}</span>
                         </span>
                         <input
                           type="checkbox"
                           className="h-5 w-5 accent-[var(--color-primary)]"
                           checked={checked}
                           onChange={() => onItemChange(item.id, { claimedBy: nextClaimedBy })}
                         />
                       </label>
                     )
                   })}
                 </div>
               </div>
             </div>
           )
         })}
       </div>

       <div className="mt-5 grid gap-3 sm:grid-cols-2">
         <div className="theme-card bg-surface-raised px-4 py-3">
           <p className="font-mono text-[0.625rem] font-bold uppercase tracking-widest text-muted">Items total</p>
           <p className="mt-1 font-display text-2xl text-primary">{formatCurrency(itemTotal, currency)}</p>
         </div>
         <div className="theme-card bg-surface-raised px-4 py-3">
           <p className="font-mono text-[0.625rem] font-bold uppercase tracking-widest text-muted">Remaining</p>
           <p className="mt-1 font-display text-2xl text-primary">{formatCurrency(remaining, currency)}</p>
         </div>
       </div>

       {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}
     </div>
   )
}
