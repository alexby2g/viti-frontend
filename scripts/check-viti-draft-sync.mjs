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

sync.markDirty(4, { step: 2, respuestas: { nombre: 'VITI' } })
assert.equal(sync.hasConflict(4), false)
assert.equal(sync.hasConflict(5), true)
assert.equal(sync.read().dirty, true)
assert.equal(sync.read().server_revision, 4)

sync.markSynced(5, { step: 2 })
assert.equal(sync.hasConflict(5), false)
assert.equal(sync.read().dirty, false)
assert.equal(sync.read().server_revision, 5)

sync.clear()
assert.equal(sync.read(), null)

console.log('VITI draft sync check: OK')
