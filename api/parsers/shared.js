"use strict";

// Utilities shared by individual bank parsers.

function parseGermanAmount(str) {
  const normalized = String(str)
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function normalizeLines(rawText) {
  if (!rawText || typeof rawText !== "string") return [];
  return rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function checkBalanceDelta(oldBalance, newBalance, transactions) {
  if (oldBalance == null || newBalance == null) return null;
  const expectedDelta = Math.round((newBalance - oldBalance) * 100) / 100;
  const actualDelta =
    Math.round(transactions.reduce((s, t) => s + t.amount, 0) * 100) / 100;
  if (Math.abs(expectedDelta - actualDelta) > 0.01) {
    return `Balance check failed: expected delta ${expectedDelta.toFixed(2)}, got ${actualDelta.toFixed(2)} from ${transactions.length} transactions.`;
  }
  return null;
}

module.exports = {
  parseGermanAmount,
  normalizeLines,
  checkBalanceDelta,
};
