require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.options("*", cors());
app.use(express.json());

// Configuration
const APP_ID =
  process.env.ENABLE_BANKING_APP_ID || "3325a771-fed9-4e4a-b6c6-f41a1194c853";
const API_BASE = "https://api.enablebanking.com";
const REDIRECT_URL = process.env.REDIRECT_URL || "http://localhost:8081";

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
  const data = await response.json();
  if (!response.ok) {
    throw { status: response.status, data };
  }
  return data;
}

// GET /api/aspsps - List available banks
app.get("/api/aspsps", async (req, res) => {
  try {
    const { country } = req.query;
    const endpoint = country ? `/aspsps?country=${country}` : "/aspsps";
    const data = await apiRequest("GET", endpoint);
    res.json(data);
  } catch (err) {
    console.error("Error fetching ASPSPs:", err);
    res.status(err.status || 500).json(err.data || { error: "Internal error" });
  }
});

// POST /api/auth - Start bank authorization
app.post("/api/auth", async (req, res) => {
  try {
    const { aspspName, aspspCountry } = req.body;
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
      redirect_url: REDIRECT_URL,
      psu_type: "personal", // Explicitly request personal accounts
    };

    console.log("Auth request body:", JSON.stringify(body, null, 2));

    const data = await apiRequest("POST", "/auth", body);
    res.json(data);
  } catch (err) {
    console.error("Error starting auth:", JSON.stringify(err, null, 2));
    res.status(err.status || 500).json(err.data || { error: "Internal error" });
  }
});

// POST /api/sessions - Exchange auth code for session
app.post("/api/sessions", async (req, res) => {
  try {
    const { code } = req.body;
    console.log("Exchanging code for session...");
    const data = await apiRequest("POST", "/sessions", { code });
    console.log(
      "Session created. Accounts found:",
      data.accounts ? data.accounts.length : 0,
    );
    // Log the first account to see structure if it exists
    if (data.accounts && data.accounts.length > 0) {
      console.log("Sample account:", JSON.stringify(data.accounts[0], null, 2));
    } else {
      console.log(
        "Full session data (no accounts?):",
        JSON.stringify(data, null, 2),
      );
    }
    res.json(data);
  } catch (err) {
    console.error("Error creating session:", JSON.stringify(err, null, 2));
    res.status(err.status || 500).json(err.data || { error: "Internal error" });
  }
});

// GET /api/accounts/:accountId/balances - Fetch account balances
app.get("/api/accounts/:accountId/balances", async (req, res) => {
  try {
    const { accountId } = req.params;
    const data = await apiRequest("GET", `/accounts/${accountId}/balances`);
    res.json(data);
  } catch (err) {
    console.error("Error fetching balances:", err);
    res.status(err.status || 500).json(err.data || { error: "Internal error" });
  }
});

// GET /api/accounts/:accountId/transactions - Fetch account transactions
app.get("/api/accounts/:accountId/transactions", async (req, res) => {
  try {
    const { accountId } = req.params;
    const { date_from, date_to } = req.query;
    let endpoint = `/accounts/${accountId}/transactions`;
    const params = new URLSearchParams();
    if (date_from) params.set("date_from", date_from);
    if (date_to) params.set("date_to", date_to);
    if (params.toString()) endpoint += `?${params.toString()}`;
    const data = await apiRequest("GET", endpoint);
    res.json(data);
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(err.status || 500).json(err.data || { error: "Internal error" });
  }
});

// GET /api/sessions/:sessionId - Get session data
app.get("/api/sessions/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const data = await apiRequest("GET", `/sessions/${sessionId}`);
    res.json(data);
  } catch (err) {
    console.error("Error fetching session:", err);
    res.status(err.status || 500).json(err.data || { error: "Internal error" });
  }
});

const PORT = process.env.PORT || 3001;

// Only listen if executed directly (not when imported as a module by Vercel)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Enable Banking proxy running on http://localhost:${PORT}`);
  });
}

module.exports = app;
