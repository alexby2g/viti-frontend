import assert from 'node:assert/strict'
import { createDraftSync, draftStorageKey } from '../src/utils/vitiDraftSync.js'

class MemoryStorage {
  #data = new Map()
  getItem(key) { return this.#data.has(key) ? this.#data.get(key) : null }
  setItem(key, value) { this.#data.set(key, String(value)) }
  removeItem(key) { this.#data.delete(key) }
}

const storage = new MemoryStorage()
const sync = createDraftSync('SOL-TEST-001', storage)

assert.equal(sync.key, draftStorageKey('SOL-TEST-001'))
assert.equal(sync.read(), null)
assert.equal(sync.status(0, true), 'empty')

sync.markDirty(4, { step: 2, respuestas: { nombre: 'VITI' } })
assert.equal(sync.status(4, true), 'pending')
assert.equal(sync.hasConflict(4), false)
assert.equal(sync.hasConflict(5), true)
assert.equal(sync.status(5, true), 'conflict')
assert.equal(sync.status(5, false), 'offline-pending')
assert.equal(sync.read().dirty, true)
assert.equal(sync.read().server_revision, 4)

sync.markSynced(5, { step: 2, saved_at: '2026-08-27T01:00:00.000Z' })
assert.equal(sync.hasConflict(5), false)
assert.equal(sync.status(5, true), 'synced')
assert.equal(sync.status(5, false), 'offline')
assert.equal(sync.read().dirty, false)
assert.equal(sync.read().server_revision, 5)

sync.recoverServer(6, { step: 3 })
assert.equal(sync.status(6, true), 'synced')
assert.equal(sync.read().server_revision, 6)

sync.clear()
assert.equal(sync.read(), null)
assert.equal(sync.status(0, true), 'empty')

console.log('VITI draft sync check: OK')
