import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { simplifyDebts } from './debt-simplification.ts'

describe('simplifyDebts', () => {
  it('handles a two-person case', () => {
    assert.deepEqual(
      simplifyDebts([
        { memberId: 'a', name: 'Asha', balance: 50 },
        { memberId: 'b', name: 'Bala', balance: -50 },
      ]),
      [
        {
          fromMemberId: 'b',
          fromName: 'Bala',
          toMemberId: 'a',
          toName: 'Asha',
          amount: 50,
        },
      ]
    )
  })

  it('simplifies a three-person circular debt into net settlement', () => {
    assert.deepEqual(
      simplifyDebts([
        { memberId: 'a', name: 'Asha', balance: 10 },
        { memberId: 'b', name: 'Bala', balance: 0 },
        { memberId: 'c', name: 'Chirag', balance: -10 },
      ]),
      [
        {
          fromMemberId: 'c',
          fromName: 'Chirag',
          toMemberId: 'a',
          toName: 'Asha',
          amount: 10,
        },
      ]
    )
  })

  it('returns no settlements for an already-settled group', () => {
    assert.deepEqual(
      simplifyDebts([
        { memberId: 'a', name: 'Asha', balance: 0 },
        { memberId: 'b', name: 'Bala', balance: 0 },
        { memberId: 'c', name: 'Chirag', balance: 0 },
      ]),
      []
    )
  })
})
