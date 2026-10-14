// Same-origin "/api" when deployed (Vercel), the local Express server in
// development. `window.location` is undefined on native, hence the `?.`.
export const API_BASE =
  typeof window !== "undefined" &&
  window.location?.hostname &&
  window.location.hostname !== "localhost"
    ? "/api"
    : "http://localhost:3001/api";

// Build an Error from a failed backend response. Non-JSON bodies (proxy
// errors, HTML 502 pages) used to throw a SyntaxError that hid the real
// cause; the HTTP status is attached so callers can branch on it (e.g. 422).
async function responseError(response: Response, fallback: string): Promise<Error & { status: number }> {
  let message = fallback;
  try {
    const body = await response.json();
    message = body?.error || body?.message || body?.detail || fallback;
    if (typeof message !== "string") message = JSON.stringify(message);
  } catch {
    // body not JSON
  }
  const err = new Error(`${message} (${response.status})`) as Error & { status: number };
  err.status = response.status;
  return err;
}

export interface AccountId {
  iban?: string;
  other?: { identification?: string };
}

export interface Account {
  uid: string;
  account_id: AccountId;
  name?: string;
  currency?: string;
  product?: string;
  cash_account_type?: string;
}

export interface Balance {
  name: string;
  balance_amount: {
    currency: string;
    amount: string;
  };
  balance_type: string;
  reference_date?: string;
}

export interface Transaction {
  transaction_id?: string;
  booking_date?: string;
  value_date?: string;
  transaction_amount: {
    currency: string;
    amount: string;
  };
  creditor?: {
    name?: string;
  };
  debtor?: {
    name?: string;
  };
  /** Counterparty / own account identifiers as sent by Enable Banking. */
  creditor_account?: AccountId | null;
  debtor_account?: AccountId | null;
  remittance_information?: string[];
  credit_debit_indicator?: string;
  /** ISO 18245 merchant category code (card payments). */
  merchant_category_code?: string | null;
  /** Bank's own booking code, e.g. { description: "Lastschrift", code: "PMNT", sub_code: "…" }. */
  bank_transaction_code?: { description?: string | null; code?: string | null; sub_code?: string | null } | null;
  /** Note the account holder added in their banking app. */
  note?: string | null;
  transaction_date?: string;
  // App-local field: set when a transaction was imported from a bank statement
  // PDF, used to trace/delete by source file. Not part of the Enable Banking API.
  statement_id?: string;
  /** App-local field: IDs of transactions linked as reimbursements/refunds
   *  to this expense. The parent expense stores child txIds here. */
  linkedTransactionIds?: string[];
}

export interface SessionData {
  session_id: string;
  accounts: Account[];
  aspsp: {
    name: string;
    country: string;
  };
}

// Start bank authorization - returns a URL to redirect the user to
export async function startAuth(
  aspspName: string,
  aspspCountry: string,
): Promise<{ url: string; authorization_id: string }> {
  const response = await fetch(`${API_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aspspName, aspspCountry }),
  });
  if (!response.ok) {
    throw await responseError(response, "Failed to start authorization");
  }
  return response.json();
}

// Exchange auth code for session with accounts
export async function createSession(code: string): Promise<SessionData> {
  const response = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    throw await responseError(response, "Failed to create session");
  }
  return response.json();
}

// Get account balances
export async function getBalances(
  accountId: string,
): Promise<{ balances: Balance[] }> {
  const response = await fetch(`${API_BASE}/accounts/${encodeURIComponent(accountId)}/balances`);
  if (!response.ok) {
    throw await responseError(response, "Failed to fetch balances");
  }
  return response.json();
}

// Pick the most recently reported balance from an Enable Banking response.
// The /balances endpoint returns multiple entries (e.g. CLAV closing-booked,
// XPCD expected, ITAV interim available) — each with its own reference_date.
// We always want the freshest figure regardless of type, so we sort by
// reference_date desc and fall back to insertion order when dates are missing.
export function pickLatestBalance(balances: Balance[]): Balance | undefined {
  if (!balances || balances.length === 0) return undefined;
  return [...balances].sort((a, b) => {
    const da = a.reference_date || "";
    const db = b.reference_date || "";
    return db.localeCompare(da);
  })[0];
}

// Get account transactions
export async function getTransactions(
  accountId: string,
  dateFrom?: string,
  dateTo?: string,
  continuationKey?: string,
): Promise<{
  transactions:
    | Transaction[]
    | { booked: Transaction[]; pending?: Transaction[] };
  continuation_key?: string;
}> {
  const params = new URLSearchParams();
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  if (continuationKey) params.set("continuation_key", continuationKey);
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(
    `${API_BASE}/accounts/${encodeURIComponent(accountId)}/transactions${query}`,
  );
  if (!response.ok) {
    throw await responseError(response, "Failed to fetch transactions");
  }
  return response.json();
}

// List available banks
export async function getASPSPs(
  country: string,
): Promise<{ aspsps: { name: string; country: string }[] }> {
  const response = await fetch(`${API_BASE}/aspsps?country=${encodeURIComponent(country)}`);
  if (!response.ok) {
    throw await responseError(response, "Failed to fetch banks");
  }
  return response.json();
}
