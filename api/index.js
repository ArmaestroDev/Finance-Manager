require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { parseStatement, UnsupportedBankError } = require("./parseStatement");
// Require pdf-parse's library file directly to skip the package's top-level
// debug side-effect that tries to read a bundled sample PDF.
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

// Configuration
const APP_ID =
  process.env.ENABLE_BANKING_APP_ID || "3325a771-fed9-4e4a-b6c6-f41a1194c853";
const API_BASE = "https://api.enablebanking.com";
const REDIRECT_URL = process.env.REDIRECT_URL || "http://localhost:8081";

// CORS: only our own web app (REDIRECT_URL's origin, extra origins from
// ALLOWED_ORIGINS, comma-separated) and local dev may call the API from a
// browser, so other websites can't use this backend and eat into the hosting
// quota. Requests without an Origin header (native app, curl) are unaffected.
const originOf = (url) => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};
const ALLOWED_ORIGINS = new Set(
  [REDIRECT_URL, ...(process.env.ALLOWED_ORIGINS || "").split(",")]
    .map((u) => originOf(u.trim()))
    .filter(Boolean),
);
const LOCAL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const corsOptions = {
  origin: (origin, callback) =>
    callback(null, !origin || ALLOWED_ORIGINS.has(origin) || LOCAL_ORIGIN_RE.test(origin)),
};

const app = express();
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    env_check: {
      has_key: !!process.env.ENABLE_BANKING_PRIVATE_KEY,
      app_id_prefix: APP_ID.substring(0, 5),
    },
  });
});

// Load private key
let privateKey;
if (process.env.ENABLE_BANKING_PRIVATE_KEY) {
  // Production / Vercel: Key provided as environment variable content
  // Handle potentially escaped newlines from Vercel env var UI
  privateKey = process.env.ENABLE_BANKING_PRIVATE_KEY.replace(/\\n/g, "\n");
  console.log("✅ Private key found in environment variables");
} else {
  // Local development: Key loaded from file
  // Vercel serverless functions run in a different path, so we double check different locations if needed,
  // but usually we rely on Env vars in prod.
  const PRIVATE_KEY_PATH = path.resolve(__dirname, "..", `${APP_ID}.pem`);
  try {
    if (fs.existsSync(PRIVATE_KEY_PATH)) {
      privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");
      console.log("✅ Private key loaded from file");
    } else {
      // Only warn if we are NOT in production (because in prod we expect Env Var)
      if (process.env.NODE_ENV !== "production") {
        console.warn("⚠️  Private key file not found at:", PRIVATE_KEY_PATH);
      }
    }
  } catch (err) {
    console.error("❌ Failed to load private key:", err.message);
  }
}

if (!privateKey) {
  console.error("❌ FATAL: No private key found. API calls will fail.");
}

// Generate JWT for Enable Banking API
function generateJWT() {
  if (!privateKey) throw new Error("Missing Private Key");
  const now = Math.floor(Date.now() / 1000);
  const header = {
    typ: "JWT",
    alg: "RS256",
    kid: APP_ID,
  };
  const payload = {
    iss: "enablebanking.com",
    aud: "api.enablebanking.com",
    iat: now,
    exp: now + 3600, // 1 hour
  };
  return jwt.sign(payload, privateKey, { algorithm: "RS256", header });
}

// Helper: make authenticated request to Enable Banking API
async function apiRequest(method, endpoint, body = null) {
  const token = generateJWT();
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text.slice(0, 500) };
  }
  if (!response.ok) {
    throw { status: response.status, data };
  }
  return data;
}

// Send an upstream (Enable Banking) or internal error to the client. Enable
// Banking reports problems as { code, message, detail }, but the frontend reads
// `error` — normalise so the real reason reaches the UI instead of a generic
// "Failed to …" fallback.
function sendError(res, err, fallback = "Internal error") {
  const status = (err && err.status) || 500;
  const data = (err && err.data) || {};
  // Enable Banking puts a machine code in `error` ("WRONG_AUTHORIZATION_CODE")
  // and the human-readable text in `message`; prefer the latter.
  const message =
    data.message ||
    data.error ||
    (typeof data.detail === "string" ? data.detail : null) ||
    (err && err.message) ||
    fallback;
  res.status(status).json({
    ...data,
    error: message,
    ...(typeof data.error === "string" && data.error !== message
      ? { error_code: data.error }
      : {}),
  });
}

// 400 with the same { error, code } shape as every other error response.
function badRequest(res, message) {
  return res.status(400).json({ error: message, code: "BAD_REQUEST" });
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COUNTRY_RE = /^[A-Z]{2}$/;
const isNonEmptyString = (v, max = 500) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;

// GET /api/aspsps - List available banks
app.get("/api/aspsps", async (req, res) => {
  try {
    const { country } = req.query;
    if (country !== undefined && !COUNTRY_RE.test(String(country))) {
      return badRequest(res, "country must be a two-letter ISO code");
    }
    const endpoint = country
      ? `/aspsps?country=${encodeURIComponent(country)}`
      : "/aspsps";
    const data = await apiRequest("GET", endpoint);
    res.json(data);
  } catch (err) {
    console.error("Error fetching ASPSPs:", err);
    sendError(res, err, "Failed to fetch banks");
  }
});

// POST /api/auth - Start bank authorization
app.post("/api/auth", async (req, res) => {
  try {
    const { aspspName, aspspCountry } = req.body || {};
    if (!isNonEmptyString(aspspName) || !COUNTRY_RE.test(String(aspspCountry))) {
      return badRequest(res, "aspspName and a two-letter aspspCountry are required");
    }
    console.log("Starting auth for:", aspspName, aspspCountry);

    const body = {
      access: {
        valid_until: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 90 days
      },
      aspsp: {
        name: aspspName,
        country: aspspCountry,
      },
      state: `state_${Date.now()}`,
      // No psu_type: let the bank decide (personal vs business).
      redirect_url: REDIRECT_URL,
    };

    const data = await apiRequest("POST", "/auth", body);
    res.json(data);
  } catch (err) {
    console.error("Error starting auth:", err && err.data ? JSON.stringify(err.data) : err);
    sendError(res, err, "Failed to start authorization");
  }
});

// POST /api/sessions - Exchange auth code for session
app.post("/api/sessions", async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!isNonEmptyString(code, 2000)) {
      return badRequest(res, "Missing authorization code");
    }
    console.log("Exchanging code for session...");
    let data = await apiRequest("POST", "/sessions", { code });

    // Check if accounts are returned; if not, try fetching the session again explicitly
    if (!data.accounts || data.accounts.length === 0) {
      try {
        const refetchData = await apiRequest(
          "GET",
          `/sessions/${encodeURIComponent(data.session_id)}`,
        );
        if (refetchData.accounts && refetchData.accounts.length > 0) {
          data = refetchData;
        }
      } catch (fetchErr) {
        console.error("Refetch failed:", fetchErr);
      }
    }

    res.json(data);
  } catch (err) {
    console.error("Error creating session:", err && err.data ? JSON.stringify(err.data) : err);
    sendError(res, err, "Failed to create session");
  }
});

// GET /api/accounts/:accountId/balances - Fetch account balances
app.get("/api/accounts/:accountId/balances", async (req, res) => {
  try {
    const { accountId } = req.params;
    const data = await apiRequest(
      "GET",
      `/accounts/${encodeURIComponent(accountId)}/balances`,
    );
    res.json(data);
  } catch (err) {
    console.error("Error fetching balances:", err);
    sendError(res, err, "Failed to fetch balances");
  }
});

// GET /api/accounts/:accountId/transactions - Fetch account transactions
app.get("/api/accounts/:accountId/transactions", async (req, res) => {
  try {
    const { accountId } = req.params;
    const { date_from, date_to, continuation_key } = req.query;
    for (const [name, value] of [["date_from", date_from], ["date_to", date_to]]) {
      if (value !== undefined && !ISO_DATE_RE.test(String(value))) {
        return badRequest(res, `${name} must be YYYY-MM-DD`);
      }
    }
    let endpoint = `/accounts/${encodeURIComponent(accountId)}/transactions`;
    const params = new URLSearchParams();
    if (date_from) params.set("date_from", date_from);
    if (date_to) params.set("date_to", date_to);
    // Forward pagination — without this the client's continuation loop kept
    // re-fetching page 1 and older pages were never loaded.
    if (continuation_key) params.set("continuation_key", continuation_key);
    if (params.toString()) endpoint += `?${params.toString()}`;
    const data = await apiRequest("GET", endpoint);
    res.json(data);
  } catch (err) {
    console.error("Error fetching transactions:", err);
    sendError(res, err, "Failed to fetch transactions");
  }
});

// POST /api/parse-statement - Extract transactions from a bank statement PDF
app.post("/api/parse-statement", async (req, res) => {
  try {
    const { base64, fileName } = req.body || {};
    if (!base64 || typeof base64 !== "string") {
      return badRequest(res, "Missing base64 PDF payload");
    }
    const buffer = Buffer.from(base64, "base64");
    // Buffer.from silently drops invalid base64; check for the PDF magic bytes
    // so non-PDF uploads get a clear message instead of a pdf.js error.
    if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return res
        .status(422)
        .json({ error: "The file is not a PDF.", code: "INVALID_PDF" });
    }
    let pdfData;
    try {
      pdfData = await pdfParse(buffer);
    } catch (pdfErr) {
      // Corrupt / non-PDF upload is a client problem, not a server error.
      return res.status(422).json({
        error: `Could not read PDF: ${pdfErr.message || "invalid file"}`,
        code: "INVALID_PDF",
      });
    }
    const result = parseStatement(pdfData.text);
    res.json({
      ...result,
      fileName: fileName || null,
      pageCount: pdfData.numpages,
    });
  } catch (err) {
    if (err instanceof UnsupportedBankError) {
      return res
        .status(422)
        .json({ error: err.message, code: "UNSUPPORTED_BANK" });
    }
    console.error("parse-statement error:", err);
    sendError(res, err, "Failed to parse PDF statement");
  }
});

// GET /api/sessions/:sessionId - Get session data
app.get("/api/sessions/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const data = await apiRequest(
      "GET",
      `/sessions/${encodeURIComponent(sessionId)}`,
    );
    res.json(data);
  } catch (err) {
    console.error("Error fetching session:", err);
    sendError(res, err, "Failed to fetch session");
  }
});

// Unknown API route → JSON 404 (instead of Express' HTML page).
app.use("/api", (req, res) => {
  res.status(404).json({ error: `Unknown endpoint ${req.method} ${req.path}`, code: "NOT_FOUND" });
});

// Body-parser failures (malformed JSON, payload over the 10 MB limit) → JSON.
// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature.
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message =
    err.type === "entity.too.large"
      ? "The file is too large (max. ~7 MB PDF)."
      : status < 500
        ? err.message || "Bad request"
        : "Internal error";
  if (status >= 500) console.error("Unhandled API error:", err);
  res.status(status).json({ error: message, code: err.type || "INTERNAL" });
});

const PORT = process.env.PORT || 3001;

// Only listen if executed directly (not when imported as a module by Vercel)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Enable Banking proxy running on http://localhost:${PORT}`);
  });
}

module.exports = app;
