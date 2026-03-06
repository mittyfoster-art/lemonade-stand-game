import '@testing-library/jest-dom/vitest'

// Provide a working localStorage for jsdom environments where the native
// implementation may be incomplete (Node 22+ --localstorage-file issue).
const localStorageStore: Record<string, string> = {}
const localStorageMock: Storage = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => { localStorageStore[key] = String(value) },
  removeItem: (key: string) => { delete localStorageStore[key] },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]) },
  get length() { return Object.keys(localStorageStore).length },
  key: (index: number) => Object.keys(localStorageStore)[index] ?? null,
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
