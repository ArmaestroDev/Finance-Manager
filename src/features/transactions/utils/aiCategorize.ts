// Pure helpers for AI auto-categorization / budget detection responses.
// Kept free of React so they can be unit-tested with mocked AI output.
import type { Transaction } from "../../../services/enableBanking";
import { SYSTEM_IGNORE_ID } from "./systemCategories";
import { cleanRemittanceInfo, getStableTxId, getTransactionAmount } from "./transactions";

export interface CategoryRef {
  id: string;
  name: string;
  color: string;
  system?: "ignore";
}

// Extract a JSON value from an LLM reply. Handles ```json fences and prose
// before/after the payload ("Here is the result: {...}").
export function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // fall through to bracket extraction
  }
  const firstObj = cleaned.indexOf("{");
  const firstArr = cleaned.indexOf("[");
  const candidates: [number, string][] = [];
  if (firstObj >= 0) candidates.push([firstObj, "}"]);
  if (firstArr >= 0) candidates.push([firstArr, "]"]);
  candidates.sort((a, b) => a[0] - b[0]);
  for (const [start, closer] of candidates) {
    const end = cleaned.lastIndexOf(closer);
    if (end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        // try next candidate
      }
    }
  }
  throw new SyntaxError("No JSON found in AI response");
}

// A category the user (or the AI) made for money coming in. Users name it
// "Gehalt", "Lohn & Gehalt", "Einnahmen", "Salary"…, not only "Einkommen";
// recognising those keeps their category instead of creating "Einkommen".
const INCOME_NAME_RE =
  /(^|[^\p{L}])(einkommen|einkünfte|einnahmen?|gehalt|gehälter|lohn|löhne|income|salary|salaries|wages?|earnings|revenue)([^\p{L}]|$)/iu;

export const isIncomeName = (name: string) => INCOME_NAME_RE.test(name.trim());

const IGNORE_WORDS = new Set(["ignore", "ignored", "ignorieren", "ignoriert"]);

export interface ResolveResult {
  /** txId → existing category id */
  assignments: Record<string, string>;
  /** txId → name of a category that must be created first */
  pendingByName: Record<string, string>;
  /** Unique (case-insensitive) names of categories to create, in order. */
  newCategoryNames: string[];
}

/**
 * Turn the AI's `{ txId: categoryIdOrNewName | null }` map into concrete
 * assignments, enforcing the income/expense sign rule:
 *  - positive amounts may only go to the Income category (or Ignore);
 *  - negative amounts may never go to Income.
 */
export function resolveAiAssignments(
  raw: Record<string, unknown>,
  amountsById: Map<string, number>,
  categories: CategoryRef[],
  language: string,
): ResolveResult {
  const assignments: Record<string, string> = {};
  const pendingByName: Record<string, string> = {};
  const newNames = new Map<string, string>(); // lower → display

  const findByName = (name: string) =>
    categories.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
  const incomeCat = categories.find((c) => isIncomeName(c.name));
  const incomeName = language === "en" ? "Income" : "Einkommen";

  const assignNew = (txId: string, name: string) => {
    const key = name.trim().toLowerCase();
    if (!newNames.has(key)) newNames.set(key, name.trim());
    pendingByName[txId] = newNames.get(key)!;
  };

  for (const [txId, value] of Object.entries(raw)) {
    if (typeof value !== "string" || !value.trim()) continue;
    const amount = amountsById.get(txId);
    if (amount === undefined || !Number.isFinite(amount)) continue;
    const isNeg = amount < 0;

    // Self-transfers / investment buys → the system Ignore category, for
    // either sign. Accept its id even if the caller's list lacks it, and the
    // bare word the model sometimes returns instead of the id.
    const ignoreCat = categories.find((c) => c.system === "ignore");
    if (value === SYSTEM_IGNORE_ID || IGNORE_WORDS.has(value.trim().toLowerCase())) {
      assignments[txId] = ignoreCat?.id ?? SYSTEM_IGNORE_ID;
      continue;
    }
    const existing = categories.find((c) => c.id === value) ?? findByName(value);
    if (existing?.system === "ignore") {
      assignments[txId] = existing.id;
      continue;
    }

    const targetIsIncome = existing ? isIncomeName(existing.name) : isIncomeName(value);

    if (!isNeg && !(existing && targetIsIncome)) {
      // Positive amount pointed at an expense category, or at a new name →
      // the one Income category (no second "Salary" next to "Gehalt").
      if (incomeCat) assignments[txId] = incomeCat.id;
      else assignNew(txId, incomeName);
      continue;
    }
    if (isNeg && targetIsIncome) continue; // expense can't be income

    if (existing) {
      assignments[txId] = existing.id;
    } else if (/^cat_/.test(value)) {
      // Unknown category id (hallucinated) — don't turn it into a name.
      continue;
    } else {
      assignNew(txId, value);
    }
  }

  return { assignments, pendingByName, newCategoryNames: [...newNames.values()] };
}

// ── Prompt ──

export interface PromptTx {
  id: string;
  amount: number;
  date?: string;
  creditor?: string;
  debtor?: string;
  reference?: string;
  raw_reference?: string;
  /** ISO 18245 merchant category code. */
  mcc?: string;
  /** Bank booking code: "description (code/sub_code)". */
  bank_code?: string;
  /** The account holder's own note on the booking (from their bank). */
  note?: string;
}

const clean = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t && t.toLowerCase() !== "unknown" ? t : undefined;
};

/**
 * One transaction as the AI sees it. Empty fields are omitted (tokens), and
 * "Self" placeholders of manual/imported rows aren't sent as a party.
 */
export function toPromptTx(tx: Transaction): PromptTx {
  const remittanceFull = tx.remittance_information?.join(" ").trim() || "";
  const cleanRef = cleanRemittanceInfo(tx.remittance_information) || "";
  const party = (name: string | undefined) => {
    const n = clean(name);
    return n && n.toLowerCase() !== "self" ? n : undefined;
  };
  const btc = tx.bank_transaction_code;
  const codeParts = [clean(btc?.code ?? undefined), clean(btc?.sub_code ?? undefined)].filter(Boolean);
  const bankCode = [clean(btc?.description ?? undefined), codeParts.length ? `(${codeParts.join("/")})` : undefined]
    .filter(Boolean)
    .join(" ");
  const out: PromptTx = {
    id: getStableTxId(tx),
    amount: getTransactionAmount(tx),
    date: clean(tx.booking_date || tx.value_date),
    creditor: party(tx.creditor?.name),
    debtor: party(tx.debtor?.name),
    reference: clean(cleanRef),
    raw_reference: remittanceFull && remittanceFull !== cleanRef ? remittanceFull : undefined,
    mcc: clean(tx.merchant_category_code ?? undefined),
    bank_code: clean(bankCode),
    note: clean(tx.note ?? undefined),
  };
  for (const k of Object.keys(out) as (keyof PromptTx)[]) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

export interface PromptOwnContext {
  /** Account holder name(s) as reported by the bank. */
  holderNames: string[];
  /** Names of the user's own accounts (giro, savings, depot, cash, …). */
  accountNames: string[];
}

/**
 * The categorization prompt. Own IBANs are deliberately not sent: IBAN
 * matches are handled deterministically before the AI is called
 * (see selfTransfer.ts), so the model only needs names.
 */
export function buildCategorizePrompt({
  categories,
  transactions,
  language,
  own,
}: {
  categories: { id: string; name: string }[];
  transactions: PromptTx[];
  language: string;
  own: PromptOwnContext;
}): string {
  const holder = own.holderNames.length > 0 ? JSON.stringify(own.holderNames) : "unknown";
  const accountNames = own.accountNames.length > 0 ? JSON.stringify(own.accountNames) : "unknown";
  return `
You are an intelligent financial assistant.
Your goal is to categorize bank transactions into one of the provided categories.

Here are the available transaction categories:
${JSON.stringify(categories)}

ABOUT THE USER (the owner of these accounts):
- Account holder name(s): ${holder}
- The user's own accounts: ${accountNames}

Here is a list of uncategorized transactions:
${JSON.stringify(transactions)}

FIELDS (omitted when unknown): "creditor" receives the money, "debtor" sends it, "reference" is the cleaned remittance text, "raw_reference" the original one.
- "mcc" is the ISO 18245 merchant category code of a card payment (e.g. 5411 groceries/supermarkets, 5541 fuel, 5812 restaurants, 5814 fast food, 4111 public transport, 5912 pharmacies, 4899 streaming/cable). It is a STRONG signal for card payments — prefer it over a vague merchant name.
- "bank_code" is the bank's booking type (e.g. direct debit, standing order, card payment, salary).
- "note" is a note the user wrote on this booking themself. It is the HIGHEST-PRIORITY hint — follow it when it names a purpose.

INSTRUCTIONS:
1. Analyze each transaction (creditor, debtor, amount, reference, mcc, bank_code, note).
2. Assign the MOST APPROPRIATE category ID from the available list.
3. If a transaction clearly fits a category (e.g., "Rewe" -> Groceries, "Shell" -> Gas), ASSIGN IT.
3a. PAYMENT INTERMEDIARIES: if the counterparty is a payment service rather than the actual shop (PayPal, Klarna, Stripe, SumUp, Adyen, Mollie, Apple, Google Pay, Amazon Payments, Unzer, or a reference like "PP.1234.PP"), categorize by the ACTUAL MERCHANT named in the reference text, not by the intermediary. Example: creditor "PayPal (Europe) S.a.r.l." with reference "PP.1234.PP . Spotify AB, Ihr Einkauf bei Spotify AB" is a Spotify payment → subscriptions/media. Only if no merchant is named, fall back to the best guess from the amount and other fields.
4. CRITICAL RULE FOR INCOME VS EXPENSE:
   - Note the "amount" field we provided. If the amount has a MINUS sign (-) before it (e.g. -45.00), it is an EXPENSE. You MUST assign it to an expense category. You MUST NOT assign it to the Income category.
   - If the amount is POSITIVE (no minus sign, e.g. 100.00), it is INCOME. You MUST assign it to the category representing Income (e.g., "Einkommen", "Gehalt", "Income"). Do NOT assign it to anything else.
4a. TRANSFERS TO OR FROM THE USER THEMSELF MUST BE IGNORED — this rule overrides rule 4.
   - A transaction is a self-transfer when money moves between the user's OWN accounts, for example:
     * the counterparty (creditor for an expense, debtor for an income) is the account holder named above, in any spelling or order ("Max Mustermann", "MUSTERMANN, MAX", "M. Mustermann");
     * creditor and debtor are the same person;
     * the counterparty or reference names one of the user's own accounts listed above (e.g. a savings account, depot, credit card, PayPal top-up from the user's own account);
     * the reference says "Umbuchung", "Übertrag", "Eigenübertrag", "Kontoübertrag", "Übertrag auf Tagesgeld", "own account transfer", or "Self".
   - Assign the category id "${SYSTEM_IGNORE_ID}" to every self-transfer, whether the amount is positive or negative. Never assign Income or an expense category to a self-transfer.
   - Transfers to or from OTHER people (friends, family members with a different first name, landlords) are NOT self-transfers.
4b. INVESTMENT BUYS MUST BE IGNORED.
   - If a transaction is a PURCHASE OF INVESTMENTS / ETFs / STOCKS (creditor is a broker like "Trade Republic", "Scalable", "Comdirect Depot", "DEGIRO", "IBKR", or the remittance includes an ISIN reference like "DE000..." or "US..."), assign "${SYSTEM_IGNORE_ID}".
   - These transactions net out and double-count net worth — do NOT split them between Income and Expense.
5. If NO existing category fits, BUT you are confident it belongs to a common category, you may suggest a NEW category name.
IMPORTANT: Aim for a COMPACT list of categories. Do not create granular categories like "Coffee" or "Gym"; instead consolidate into "Lifestyle" or "Leisure". Ideally, keep the TOTAL number of categories around 6-7 if possible. Prefer broader categories like "Shopping", "Mobility", "Living", "Lifestyle".
6. If a transaction is ambiguous or absolutely does not fit any category (existing or new), assign null.
7. Return a STRICT valid JSON object where keys are transaction IDs and values are either:
   - An existing category ID (string starting with "cat_")
   - A NEW category name (string, human readable, e.g. "Gym"). IMPORTANT: The new category name MUST be in the language "${language === "de" ? "German (Deutsch)" : "English"}".
   - null

Example output format:
{
  "tx_123": "cat_456",
  "tx_789": "New Category Name",
  "tx_555": "${SYSTEM_IGNORE_ID}",
  "tx_000": null
}
`;
}

/**
 * JSON schema of the categorization answer: one key per transaction id, value
 * a category id / new category name, or null. Used for providers with
 * structured output (Ollama `format`), which then can't return prose, skip ids
 * or invent keys.
 */
export function buildCategorizeSchema(txIds: string[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const id of txIds) properties[id] = { type: ["string", "null"] };
  return {
    type: "object",
    properties,
    required: txIds,
    additionalProperties: false,
  };
}
