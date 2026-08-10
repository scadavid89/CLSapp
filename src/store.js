import { useState, useEffect, useCallback, useRef } from "react";
import { api, ApiError } from "./api.js";

/* Bootstrap loads the whole working set in one round trip — a few hundred
   rows. Mutations write to the database, then re-read, so what's on screen
   is what's stored. No optimistic local truth that can drift.
   Availability is the exception: it's asked of the server on demand, because
   a snapshot from page load goes stale the moment another desk quotes. */

const DATE_KEYS = new Set(["start", "end", "due", "created", "expires", "inSvc", "dispatchedAt"]);

function reviveDates(node) {
  if (Array.isArray(node)) return node.map(reviveDates);
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = DATE_KEYS.has(k) && typeof v === "string"
        ? new Date(v.slice(0, 10) + "T00:00:00")
        : reviveDates(v);
    }
    return out;
  }
  return node;
}

export function useStore() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");   // loading | ready | error
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(0);
  const [lastSaved, setLastSaved] = useState(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const load = useCallback(async () => {
    try {
      const raw = await api.bootstrap();
      if (!mounted.current) return;
      setData({
        ...raw,
        assets: reviveDates(raw.assets),
        quotes: reviveDates(raw.quotes),
        pools: raw.pools.map((p) => ({ ...p, inSvc: new Date(p.in_service_date) })),
      });
      setStatus("ready");
      setError(null);
    } catch (err) {
      if (!mounted.current) return;
      setError(err);
      setStatus("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Every mutation runs through here: it tracks in-flight saves for the
     status lamp, surfaces the server's message rather than a generic one,
     and reloads so derived numbers can't drift from the database. */
  const mutate = useCallback(async (fn) => {
    setSaving((n) => n + 1);
    try {
      const result = await fn();
      await load();
      setLastSaved(new Date());
      return result;
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, err.message));
      throw err;
    } finally {
      setSaving((n) => Math.max(0, n - 1));
    }
  }, [load]);

  const actions = {
    saveAsset: (id, body) => mutate(() => api.saveAsset(id, body)),
    receiveAssets: (body) => mutate(() => api.receiveAssets(body)),
    saveStock: (body) => mutate(() => api.saveStock(body)),
    saveProduct: (sku, body) => mutate(() => api.saveProduct(sku, body)),
    saveCustomer: (id, body) => mutate(() => api.saveCustomer(id, body)),
    saveJobsite: (id, body) => mutate(() => api.saveJobsite(id, body)),
    saveQuote: (id, body) => mutate(() => api.saveQuote(id, body)),
    quoteAction: (id, action, body) => mutate(() => api.quoteAction(id, action, body)),
    checkOut: (body) => mutate(() => api.checkOut(body)),
    checkIn: (body) => mutate(() => api.checkIn(body)),
    refresh: load,
    dismissError: () => setError(null),
  };

  return { data, status, error, saving, lastSaved, actions };
}

/* Availability, asked of the server for a window. Debounced, because the
   quote builder calls it on every keystroke. */
export function useAvailability(start, end, excludeQuote, enabled = true) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !start || !end) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await api.availability(iso(start), iso(end), excludeQuote);
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setRows(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [start && +start, end && +end, excludeQuote, enabled]);

  const bySku = {};
  (rows || []).forEach((r) => { bySku[r.sku] = r; });
  return { rows, bySku, loading };
}

const iso = (d) => (typeof d === "string" ? d : new Date(d).toISOString().slice(0, 10));
