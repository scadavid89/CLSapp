import sql from "mssql";
import { DefaultAzureCredential } from "@azure/identity";

/* One pool for the whole process. Functions reuses the worker between
   invocations, so re-connecting per request is the single easiest way to
   exhaust an Azure SQL connection limit. */
let poolPromise = null;

async function buildConfig() {
  const base = {
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DATABASE,
    options: { encrypt: true, trustServerCertificate: false, enableArithAbort: true },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    requestTimeout: 30000,
    connectionTimeout: 30000,
  };

  // Managed identity in Azure; username/password only for local dev.
  if (process.env.SQL_PASSWORD) {
    return { ...base, user: process.env.SQL_USER, password: process.env.SQL_PASSWORD };
  }
  const credential = new DefaultAzureCredential();
  const token = await credential.getToken("https://database.windows.net/.default");
  return {
    ...base,
    authentication: { type: "azure-active-directory-access-token", options: { token: token.token } },
  };
}

export async function getPool() {
  if (!poolPromise) {
    poolPromise = buildConfig()
      .then((cfg) => new sql.ConnectionPool(cfg).connect())
      .catch((err) => { poolPromise = null; throw err; });
  }
  return poolPromise;
}

export async function query(text, params = {}) {
  const pool = await getPool();
  const req = pool.request();
  for (const [k, v] of Object.entries(params)) req.input(k, v);
  const res = await req.query(text);
  return res.recordset;
}

export async function proc(name, params = {}) {
  const pool = await getPool();
  const req = pool.request();
  for (const [k, v] of Object.entries(params)) req.input(k, v);
  const res = await req.execute(name);
  return res.recordset;
}

/* Runs a set of statements inside one transaction. Either the whole
   check-out lands or none of it does — half a load is worse than none. */
export async function transaction(fn) {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const result = await fn((text, params = {}) => {
      const req = new sql.Request(tx);
      for (const [k, v] of Object.entries(params)) req.input(k, v);
      return req.query(text).then((r) => r.recordset);
    });
    await tx.commit();
    return result;
  } catch (err) {
    try { await tx.rollback(); } catch { /* already rolled back */ }
    throw err;
  }
}

export { sql };
