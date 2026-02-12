const API_BASE = "http://localhost:3001/api";

export interface AccountId {
  iban?: string;
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
  remittance_information?: string[];
  credit_debit_indicator?: string;
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
    const err = await response.json();
    throw new Error(err.error || "Failed to start authorization");
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
    const err = await response.json();
    throw new Error(err.error || "Failed to create session");
  }
  return response.json();
}

// Get account balances
export async function getBalances(
  accountId: string,
): Promise<{ balances: Balance[] }> {
  const response = await fetch(`${API_BASE}/accounts/${accountId}/balances`);
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to fetch balances");
  }
  return response.json();
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
    `${API_BASE}/accounts/${accountId}/transactions${query}`,
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to fetch transactions");
  }
  return response.json();
}

// List available banks
export async function getASPSPs(
  country: string,
): Promise<{ aspsps: Array<{ name: string; country: string }> }> {
  const response = await fetch(`${API_BASE}/aspsps?country=${country}`);
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to fetch banks");
  }
  return response.json();
}
