/* Static Web Apps puts the signed-in principal on every request as a
   base64 header. The front end can hide buttons; only this decides. */

const ROLE_RANK = { customer: 0, yard: 1, dispatch: 2, ops: 3, finance: 3, admin: 4 };

export function principal(request) {
  if (process.env.AUTH_DISABLED === "true") {
    return { upn: "local@dev", roles: ["admin"], provider: "local" };
  }
  const header = request.headers.get("x-ms-client-principal");
  if (!header) return null;
  try {
    const p = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
    return {
      upn: (p.userDetails || "").toLowerCase(),
      roles: p.userRoles || [],
      provider: p.identityProvider,
      subject: p.userId,
    };
  } catch {
    return null;
  }
}

export function requireRole(request, allowed) {
  const user = principal(request);
  if (!user) throw httpError(401, "Sign in to continue");
  if (!allowed.some((r) => user.roles.includes(r))) {
    throw httpError(403, "Your role does not permit this");
  }
  return user;
}

export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

/* Wraps a handler so thrown errors become clean JSON instead of a 500
   with a stack trace in the body. */
export function handler(fn) {
  return async (request, context) => {
    try {
      const body = await fn(request, context);
      return { status: 200, jsonBody: body === undefined ? { ok: true } : body };
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) context.error(err);
      return { status, jsonBody: { error: err.message || "Unexpected error" } };
    }
  };
}

export function scopeToCustomer(user) {
  return user.roles.includes("customer") && !user.roles.includes("admin");
}
