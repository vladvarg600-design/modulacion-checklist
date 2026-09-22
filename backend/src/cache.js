const store = new Map();
const inflight = new Map();

const now = () => Date.now();

function normalizeTtl(ttlMs) {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new Error('ttlMs debe ser un numero positivo');
  }
  return ttlMs;
}

function get(key) {
  const entry = store.get(key);
  if (!entry) {
    return undefined;
  }
  if (now() >= entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

function set(key, value, ttlMs) {
  const expiresAt = now() + normalizeTtl(ttlMs);
  store.set(key, { value, expiresAt });
  return value;
}

function remove(key) {
  store.delete(key);
}

function clear() {
  store.clear();
  inflight.clear();
}

async function getOrRefill(key, ttlMs, factory) {
  const cachedValue = get(key);
  if (cachedValue !== undefined) {
    return cachedValue;
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending;
  }

  const promise = Promise.resolve()
    .then(factory)
    .then((value) => {
      if (value !== undefined) {
        set(key, value, ttlMs);
      }
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export { clear, get, getOrRefill, remove, set };
