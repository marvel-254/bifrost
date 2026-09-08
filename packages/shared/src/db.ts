import { neon } from '@neondatabase/serverless';

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface ProviderApiKey {
  id: string;
  provider: string;
  api_key: string;
  label: string | null;
  enabled: boolean;
  priority: number;
  last_used_at: string | null;
  last_error: string | null;
  error_count: number;
  success_count: number;
  avg_latency_ms: number | null;
  created_at: string;
  updated_at: string;
}

export interface GatewayKey {
  id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  tier: string;
  enabled: boolean;
  rate_limit_rpm: number;
  daily_limit_tokens: number;
  monthly_limit_cost: number;
  tokens_used_today: number;
  tokens_used_this_month: number;
  cost_this_month: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GatewaySetting {
  key: string;
  value: unknown;
  updated_at: string;
}

// ── Provider API Keys ──────────────────────────────────────────────────────

export async function getProviderKeys(provider: string): Promise<ProviderApiKey[]> {
  const sql = getSql();
  if (!sql) { console.error('db.getProviderKeys: no sql'); return []; }
  try {
    const rows = await sql`SELECT * FROM provider_api_keys WHERE provider = ${provider} AND enabled = true ORDER BY priority ASC, success_count DESC`;
    return rows as unknown as ProviderApiKey[];
  } catch (e) { console.error('db.getProviderKeys:', e instanceof Error ? e.message : String(e)); return []; }
}

export async function getAllProviderKeys(): Promise<ProviderApiKey[]> {
  const sql = getSql();
  if (!sql) { console.error('db.getAllProviderKeys: no sql'); return []; }
  try {
    const rows = await sql`SELECT * FROM provider_api_keys ORDER BY provider, priority ASC`;
    return rows as unknown as ProviderApiKey[];
  } catch (e) { console.error('db.getAllProviderKeys:', e instanceof Error ? e.message : String(e)); return []; }
}

export async function addProviderKey(data: { provider: string; api_key: string; label?: string; priority?: number }): Promise<ProviderApiKey | null> {
  const sql = getSql();
  if (!sql) { console.error('db.addProviderKey: no sql connection'); return null; }
  try {
    const rows = await sql`INSERT INTO provider_api_keys (provider, api_key, label, priority) VALUES (${data.provider}, ${data.api_key}, ${data.label || null}, ${data.priority ?? 0}) RETURNING *`;
    return rows[0] as unknown as ProviderApiKey;
  } catch (e) { console.error('db.addProviderKey:', e instanceof Error ? e.message : String(e)); return null; }
}

export async function updateProviderKey(id: string, data: Partial<{ api_key: string; label: string; enabled: boolean; priority: number }>): Promise<ProviderApiKey | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        sets.push(`${k} = $${idx}`);
        vals.push(v);
        idx++;
      }
    }
    if (sets.length === 0) return null;
    sets.push(`updated_at = now()`);
    const rows = await sql(
      `UPDATE provider_api_keys SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      [...vals, id],
      { fullResults: true }
    );
    return ((rows as unknown as { rows: ProviderApiKey[] }).rows[0] || null);
  } catch { return null; }
}

export async function deleteProviderKey(id: string): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    const result = await sql(
      `DELETE FROM provider_api_keys WHERE id = $1`,
      [id],
      { fullResults: true }
    );
    const full = result as unknown as { rowCount: number | null };
    return full.rowCount !== null && full.rowCount > 0;
  } catch { return false; }
}

export async function recordKeyUsage(id: string, success: boolean, latencyMs?: number): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  try {
    if (success) {
      await sql`UPDATE provider_api_keys SET success_count = success_count + 1, last_used_at = now(), avg_latency_ms = CASE WHEN avg_latency_ms IS NULL THEN ${latencyMs ?? 0} ELSE (avg_latency_ms + ${latencyMs ?? 0}) / 2 END, updated_at = now() WHERE id = ${id}`;
    } else {
      await sql`UPDATE provider_api_keys SET error_count = error_count + 1, last_error = now(), updated_at = now() WHERE id = ${id}`;
    }
  } catch { /* ignore */ }
}

// ── Gateway Keys ───────────────────────────────────────────────────────────

export async function getGatewayKeyByHash(keyHash: string): Promise<GatewayKey | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql`SELECT * FROM gateway_keys WHERE key_hash = ${keyHash} AND enabled = true`;
    return (rows[0] as unknown as GatewayKey) || null;
  } catch { return null; }
}

export async function getAllGatewayKeys(): Promise<GatewayKey[]> {
  const sql = getSql();
  if (!sql) { console.error('db.getAllGatewayKeys: no sql'); return []; }
  try {
    const rows = await sql`SELECT id, key_prefix, name, tier, enabled, rate_limit_rpm, daily_limit_tokens, monthly_limit_cost, tokens_used_today, tokens_used_this_month, cost_this_month, last_used_at, expires_at, created_at FROM gateway_keys ORDER BY created_at DESC`;
    return rows as unknown as GatewayKey[];
  } catch (e) { console.error('db.getAllGatewayKeys:', e instanceof Error ? e.message : String(e)); return []; }
}

export async function createGatewayKey(data: { key_hash: string; key_prefix: string; name: string; tier?: string; rate_limit_rpm?: number; daily_limit_tokens?: number; monthly_limit_cost?: number; expires_at?: string }): Promise<GatewayKey | null> {
  const sql = getSql();
  if (!sql) { console.error('db.createGatewayKey: no sql'); return null; }
  try {
    const rows = await sql`INSERT INTO gateway_keys (key_hash, key_prefix, name, tier, rate_limit_rpm, daily_limit_tokens, monthly_limit_cost, expires_at) VALUES (${data.key_hash}, ${data.key_prefix}, ${data.name}, ${data.tier ?? 'free'}, ${data.rate_limit_rpm ?? 60}, ${data.daily_limit_tokens ?? 1000000}, ${data.monthly_limit_cost ?? 10.00}, ${data.expires_at ?? null}) RETURNING *`;
    return rows[0] as unknown as GatewayKey;
  } catch (e) { console.error('db.createGatewayKey:', e instanceof Error ? e.message : String(e)); return null; }
}

export async function updateGatewayKeyUsage(id: string, tokens: number, cost: number): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  try {
    await sql`UPDATE gateway_keys SET tokens_used_today = tokens_used_today + ${tokens}, tokens_used_this_month = tokens_used_this_month + ${tokens}, cost_this_month = cost_this_month + ${cost}, last_used_at = now(), updated_at = now() WHERE id = ${id}`;
  } catch { /* ignore */ }
}

export async function deleteGatewayKey(id: string): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    const result = await sql(
      `DELETE FROM gateway_keys WHERE id = $1`,
      [id],
      { fullResults: true }
    );
    const full = result as unknown as { rowCount: number | null };
    return full.rowCount !== null && full.rowCount > 0;
  } catch { return false; }
}

// ── Gateway Settings ───────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<unknown | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql`SELECT value FROM gateway_settings WHERE key = ${key}`;
    return rows[0]?.value ?? null;
  } catch { return null; }
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  try {
    await sql`INSERT INTO gateway_settings (key, value, updated_at) VALUES (${key}, ${JSON.stringify(value)}, now()) ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(value)}, updated_at = now()`;
  } catch { /* ignore */ }
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const sql = getSql();
  if (!sql) return {};
  try {
    const rows = await sql`SELECT key, value FROM gateway_settings`;
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  } catch { return {}; }
}
