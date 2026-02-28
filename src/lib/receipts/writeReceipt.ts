import { z } from "zod";

export const ReceiptKind = z.enum(["simulate", "score", "safety", "execute", "preview"]);
export type ReceiptKind = z.infer<typeof ReceiptKind>;

export type WriteReceiptParams = {
  kind: ReceiptKind;
  symbol: string;
  asof_utc: string;
  request_id?: string;
  idempotency_key?: string;
  determinism_hash?: string;
  engine_version?: string;
  config_hash?: string;
  input: unknown;
  output: unknown;
  warnings?: string[];
  degraded?: boolean;
};

export async function writeReceiptPg(
  db: { query: (sql: string, params?: unknown[]) => Promise<any> },
  receipt: WriteReceiptParams
) {
  const sql = `
    insert into receipts
    (kind, symbol, asof_utc, request_id, idempotency_key, determinism_hash, engine_version, config_hash, input, output, warnings, degraded)
    values
    ($1, $2, $3::timestamptz, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12)
    returning id
  `;

  const params = [
    receipt.kind,
    receipt.symbol,
    receipt.asof_utc,
    receipt.request_id ?? null,
    receipt.idempotency_key ?? null,
    receipt.determinism_hash ?? null,
    receipt.engine_version ?? null,
    receipt.config_hash ?? null,
    JSON.stringify(receipt.input ?? {}),
    JSON.stringify(receipt.output ?? {}),
    JSON.stringify(receipt.warnings ?? []),
    Boolean(receipt.degraded),
  ];

  const out = await db.query(sql, params);
  return out?.rows?.[0]?.id;
}
