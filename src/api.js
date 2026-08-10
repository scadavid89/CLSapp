/* Thin fetch client. Every call goes through here so auth redirects, error
   shapes, and the offline case are handled once. */

const BASE = import.meta.env.VITE_API_BASE || "/api";

async function call(method, path, body) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection.");
  }

  // Static Web Apps bounces an expired session to the login page; a 302 that
  // lands on HTML is a session timeout, not a data error.
  if (res.status === 401 || res.redirected) {
    throw new ApiError(401, "Your session expired. Sign in again.");
  }
  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }

  if (!res.ok) throw new ApiError(res.status, (data && data.error) || `Request failed (${res.status})`);
  return data;
}

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const api = {
  bootstrap: () => call("GET", "/bootstrap"),
  health: () => call("GET", "/health"),

  availability: (start, end, excludeQuote) =>
    call("GET", `/availability?start=${start}&end=${end}` + (excludeQuote ? `&excludeQuote=${excludeQuote}` : "")),

  saveAsset: (id, body) => call("PUT", `/assets/${encodeURIComponent(id)}`, body),
  receiveAssets: (body) => call("POST", "/assets", body),
  saveStock: (body) => call("POST", "/stock", body),
  saveProduct: (sku, body) => call("POST", `/products/${sku ? encodeURIComponent(sku) : ""}`, body),

  saveCustomer: (id, body) => call("POST", `/customers/${id ? encodeURIComponent(id) : ""}`, body),
  saveJobsite: (id, body) => call("POST", `/jobsites/${id ?? ""}`, body),

  saveQuote: (id, body) => call("POST", `/quotes/${id ? encodeURIComponent(id) : ""}`, body),
  quoteAction: (id, action, body) => call("POST", `/quotes/${encodeURIComponent(id)}/${action}`, body || {}),

  scanLookup: (tag) => call("GET", `/scan/${encodeURIComponent(tag)}`),
  checkOut: (body) => call("POST", "/scan/checkout", body),
  checkIn: (body) => call("POST", "/scan/checkin", body),
  movements: () => call("GET", "/movements"),

  depreciation: () => call("GET", "/reports/depreciation"),
  utilization: () => call("GET", "/reports/utilization"),
};
