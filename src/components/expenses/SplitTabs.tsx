/* src/components/expenses/SplitTabs.tsx */
'use client'

import { useMemo, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'

/**
 * Split tabs UI for expense splitting.
 * Shows three tabs: EQUAL, CUSTOM, ITEMIZED.
 * - EQUAL: displays equal share for each member.
 * - CUSTOM: allows editing amount per member (sums to total).
 * - ITEMIZED: allows adding items and assigning them to members.
 *
 * All styling uses CSS variable tokens only.
 */

type Member = {
  id: string
  name: string
}

type ItemizedLineItem = {
  id: string
  description: string
  amount: string
  claimedBy: string[]
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

function splitAmountEvenly(amount: number, memberCount: number) {
  const totalPaise = Math.round(amount * 100)
  const baseShare = Math.floor(totalPaise / memberCount)
  const remainder = totalPaise % memberCount

  return Array.from({ length: memberCount }, (_, index) => (baseShare + (index < remainder ? 1 : 0)) / 100)
}

function makeItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function SplitTabs({
  members,
  totalAmount,
  currency = 'INR',
  selectedMembers,
  onMemberToggle,
  onSelectAll,
}: {
  members: Member[]
  totalAmount: number
  currency?: string
  selectedMembers: string[]
  onMemberToggle: (memberId: string) => void
  onSelectAll: () => void
}) {
  const [activeTab, setActiveTab] = useState<'equal' | 'custom' | 'itemized'>('equal')
  const equalShare = members.length > 0 ? totalAmount / members.length : 0

  const splitMembers = useMemo(
    () => members.filter((member) => selectedMembers.includes(member.id)),
    [members, selectedMembers]
  )

  const splitEqualShare =
    splitMembers.length > 0 && Number.isFinite(totalAmount) && totalAmount > 0
      ? totalAmount / splitMembers.length
      : 0

  // CUSTOM split state
  const [customMode, setCustomMode] = useState<'exact' | 'percentage'>('exact')
  const [customValues, setCustomValues] = useState<{ memberId: string; value: string }[]>(
    members.map((member) => ({ memberId: member.id, value: '' }))
  )

  const setCustomValue = (memberId: string, value: string) => {
    setCustomValues((current) => current.map((entry) => (entry.memberId === memberId ? { ...entry, value } : entry)))
  }

  const fillCustomEqual = () => {
    if (!Number.isFinite(totalAmount) || totalAmount <= 0 || !members.length) return
    const values =
      customMode === 'percentage'
        ? splitAmountEvenly(100, members.length).map((share) => share.toFixed(2))
        : splitAmountEvenly(totalAmount, members.length).map((share) => share.toFixed(2))

    setCustomValues(members.map((member, index) => ({ memberId: member.id, value: values[index] ?? '' })))
  }

  const totalCustomEntered = customValues.reduce((sum, entry) => sum + toNumber(entry.value), 0)
  const expectedCustomTotal = customMode === 'percentage' ? 100 : totalAmount
  const isCustomBalanced = Math.abs(totalCustomEntered - expectedCustomTotal) < 0.01

  // ITEMIZED split state
  const [itemizedItems, setItemizedItems] = useState<ItemizedLineItem[]>([
    { id: makeItemId(), description: '', amount: '', claimedBy: members.map((member) => member.id) },
  ])

  const updateItem = (itemId: string, updates: Partial<Omit<ItemizedLineItem, 'id'>>) => {
    setItemizedItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...updates } : item)))
  }

  const addItem = () => {
    setItemizedItems((current) => [
      ...current,
      { id: makeItemId(), description: '', amount: '', claimedBy: members.map((member) => member.id) },
    ])
  }

  const removeItem = (itemId: string) => {
    setItemizedItems((current) => current.filter((item) => item.id !== itemId))
  }

  if (members.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex border-b border-muted divide-x divide-muted">
        {(['equal', 'custom', 'itemized'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 font-medium text-sm transition-colors ${
              activeTab === tab
                ? 'bg-primary text-surface'
                : 'bg-surface text-foreground hover:bg-muted'
            }`}
            style={{ touchAction: 'manipulation', minHeight: '44px' }}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'equal' && (
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              Split amongst
            </label>
            <button
              type="button"
              className="font-mono text-[0.7rem] font-bold uppercase tracking-wider text-primary"
              onClick={onSelectAll}
            >
              Select all
            </button>
          </div>
          <div className="space-y-3">
            {members.map((member) => {
              const checked = selectedMembers.includes(member.id)

              return (
                <label
                  key={member.id}
                  className="theme-card flex cursor-pointer items-center justify-between gap-4 bg-surface-raised px-4 py-3"
                  style={{ touchAction: 'manipulation', minHeight: '56px' }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar alt={member.name} fallback={member.name} size="sm" />
                    <div>
                      <p className="text-sm font-bold text-foreground">{member.name}</p>
                      <p className="font-mono text-[0.625rem] uppercase tracking-widest text-muted">Included in split</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    className="h-5 w-5 accent-[var(--color-primary)]"
                    onChange={() => onMemberToggle(member.id)}
                  />
                </label>
              )
            })}
          </div>
          <div className="pt-3 border-t border-muted">
            <div className="flex justify-between items-center">
              <span className="font-medium text-foreground text-sm">Total</span>
              <span className="font-mono font-medium text-primary text-sm">
                {formatCurrency(totalAmount, currency)}
              </span>
            </div>
            {splitMembers.length > 0 && (
              <div className="mt-2 text-xs text-muted-light">
                {splitMembers.length} member{splitMembers.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'custom' && (
        <Card className="p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="theme-chip inline-flex w-fit px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-light">
              {customMode === 'percentage' ? 'Percentage split' : 'Exact split'}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`theme-button px-3 py-2 text-xs ${customMode === 'exact' ? 'bg-primary text-ink' : 'bg-surface-raised text-foreground'}`}
                onClick={() => setCustomMode('exact')}
                style={{ touchAction: 'manipulation', minHeight: '44px' }}
              >
                Amounts
              </button>
              <button
                type="button"
                className={`theme-button px-3 py-2 text-xs ${customMode === 'percentage' ? 'bg-primary text-ink' : 'bg-surface-raised text-foreground'}`}
                onClick={() => setCustomMode('percentage')}
                style={{ touchAction: 'manipulation', minHeight: '44px' }}
              >
                Percents
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-light">
              Enter each person's share. The total must match the expense amount.
            </p>
            <button
              type="button"
              className="font-mono text-[0.7rem] font-bold uppercase tracking-wider text-primary"
              onClick={fillCustomEqual}
            >
              Fill equal
            </button>
          </div>

          <div className="space-y-3">
            {members.map((member) => {
              const rawValue = customValues.find((value) => value.memberId === member.id)?.value ?? ''
              const entered = toNumber(rawValue)
              const calculatedShare = customMode === 'percentage' ? (totalAmount * entered) / 100 : entered

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
                      aria-label={`${member.name} ${customMode === 'percentage' ? 'percentage' : 'amount'}`}
                      onChange={(event) => setCustomValue(member.id, event.target.value)}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                {customMode === 'percentage' ? '%' : currency}
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
                {customMode === 'percentage' ? `${totalCustomEntered.toFixed(2)}%` : formatCurrency(totalCustomEntered, currency)}
              </p>
            </div>
            <div className="theme-card bg-surface-raised px-4 py-3">
              <p className="font-mono text-[0.625rem] font-bold uppercase tracking-widest text-muted">Remaining</p>
              <p className={`mt-1 font-display text-2xl ${isCustomBalanced ? 'text-success' : 'text-error'}`}>
                {customMode === 'percentage' ? `${(100 - totalCustomEntered).toFixed(2)}%` : formatCurrency(expectedCustomTotal - totalCustomEntered, currency)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'itemized' && (
        <Card className="p-4">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="theme-chip inline-flex w-fit px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-light">
              {itemizedItems.length} line items
            </div>
            <button
              type="button"
              className="theme-button px-4 py-2 text-xs"
              onClick={addItem}
              style={{ touchAction: 'manipulation', minHeight: '44px' }}
            >
              Add item
            </button>
          </div>

          <p className="mb-4 text-sm text-muted-light">
            An itemized split is the process of dividing a shared bill (like a restaurant receipt) so that each person pays exactly for the specific items they ordered or consumed, rather than splitting the total evenly.
          </p>

          <div className="space-y-4">
            {itemizedItems.map((item, index) => {
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
                        onChange={(event) => updateItem(item.id, { description: event.target.value })}
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
                        onChange={(event) => updateItem(item.id, { amount: event.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      className="theme-button px-3 py-2 text-xs"
                      onClick={() => removeItem(item.id)}
                      disabled={itemizedItems.length === 1}
                      style={{ touchAction: 'manipulation', minHeight: '44px' }}
                    >
                      Remove
                    </button>
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
                              onChange={() => updateItem(item.id, { claimedBy: nextClaimedBy })}
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
              <p className="mt-1 font-display text-2xl text-primary">
                {formatCurrency(itemizedItems.reduce((sum, item) => sum + toNumber(item.amount), 0), currency)}
              </p>
            </div>
            <div className="theme-card bg-surface-raised px-4 py-3">
              <p className="font-mono text-[0.625rem] font-bold uppercase tracking-widest text-muted">Remaining</p>
              <p className="mt-1 font-display text-2xl text-primary">
                {formatCurrency(totalAmount - itemizedItems.reduce((sum, item) => sum + toNumber(item.amount), 0), currency)}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}