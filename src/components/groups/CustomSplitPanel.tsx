'use client'

import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'

export type CustomSplitMode = 'exact' | 'percentage'

export type Member = {
  id: string
  name: string
}

export type CustomSplitValue = {
  memberId: string
  value: string
}

type CustomSplitPanelProps = {
  currency: string
  members: Member[]
  mode: CustomSplitMode
  values: CustomSplitValue[]
  totalAmount: number
  error?: string | null
  onModeChange: (mode: CustomSplitMode) => void
  onValueChange: (memberId: string, value: string) => void
  onFillEqual: () => void
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

export function CustomSplitPanel({
  currency,
  members,
  mode,
  values,
  totalAmount,
  error,
  onModeChange,
  onValueChange,
  onFillEqual,
}: CustomSplitPanelProps) {
  const totalEntered = values.reduce((sum, value) => sum + toNumber(value.value), 0)
  const expectedTotal = mode === 'percentage' ? 100 : totalAmount
  const remaining = expectedTotal - totalEntered

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="theme-chip inline-flex w-fit px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-light">
          {mode === 'percentage' ? 'Percentage split' : 'Exact split'}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === 'exact' ? 'primary' : 'secondary'}
            className="min-h-10 px-3 text-xs"
            onClick={() => onModeChange('exact')}
          >
            Amounts
          </Button>
          <Button
            type="button"
            variant={mode === 'percentage' ? 'primary' : 'secondary'}
            className="min-h-10 px-3 text-xs"
            onClick={() => onModeChange('percentage')}
          >
            Percents
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-light">
          Enter each person's share. The total must match the expense amount.
        </p>
        <button
          type="button"
          className="font-mono text-[0.7rem] font-bold uppercase tracking-wider text-primary"
          onClick={onFillEqual}
        >
          Fill equal
        </button>
      </div>

       <div className="space-y-3">
         {members.map((member) => {
           const rawValue = values.find((value) => value.memberId === member.id)?.value ?? ''
           const entered = toNumber(rawValue)
           const calculatedShare = mode === 'percentage' ? (totalAmount * entered) / 100 : entered

           return (
             <div
               key={member.id}
               className="theme-card grid gap-3 bg-surface-raised px-4 py-4 sm:grid-cols-[1fr_9rem]"
             >
               <div className="flex min-w-0 items-center gap-3">
                 <Avatar alt={member.name} fallback={member.name} size="sm" />
                 <div className="min-w-0">
                   <p className="truncate text-sm font-bold text-foreground">{member.name}</p>
                   <p className="mt-1 font-mono text-[0.625rem] font-bold uppercase tracking-widest text-muted">
                     {formatCurrency(calculatedShare || 0, currency)}
                   </p>
                 </div>
               </div>
               <div className="relative">
                 <input
                   type="number"
                   min="0"
                   step="0.01"
                   inputMode="decimal"
                   className="theme-input h-11 w-full px-3 pr-8 text-sm"
                   value={rawValue}
                   aria-label={`${member.name} ${mode === 'percentage' ? 'percentage' : 'amount'}`}
                   onChange={(event) => onValueChange(member.id, event.target.value)}
                 />
                 <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                   {mode === 'percentage' ? '%' : currency}
                 </span>
               </div>
             </div>
           )
         })}
       </div>

       <div className="mt-5 grid gap-3 sm:grid-cols-2">
         <div className="theme-card bg-surface-raised px-4 py-3">
           <p className="font-mono text-[0.625rem] font-bold uppercase tracking-widest text-muted">Entered</p>
           <p className="mt-1 font-display text-2xl text-primary">
             {mode === 'percentage' ? `${totalEntered.toFixed(2)}%` : formatCurrency(totalEntered, currency)}
           </p>
         </div>
         <div className="theme-card bg-surface-raised px-4 py-3">
           <p className="font-mono text-[0.625rem] font-bold uppercase tracking-widest text-muted">Remaining</p>
           <p className="mt-1 font-display text-2xl text-primary">
             {mode === 'percentage' ? `${remaining.toFixed(2)}%` : formatCurrency(remaining, currency)}
           </p>
         </div>
       </div>

       {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}
     </div>
   )
}
