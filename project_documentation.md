# Finance Manager — Complete Project Documentation

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Folder Tree](#4-folder-tree)
5. [Backend (API Server)](#5-backend-api-server)
6. [Frontend (React Native App)](#6-frontend-react-native-app)
7. [State Management (Contexts)](#7-state-management-contexts)
8. [Custom Hooks (Business Logic)](#8-custom-hooks-business-logic)
9. [Services Layer](#9-services-layer)
10. [Shared Utilities & Constants](#10-shared-utilities--constants)
11. [UI Components](#11-ui-components)
12. [Screens (App Router)](#12-screens-app-router)
13. [Data Flow Diagrams](#13-data-flow-diagrams)
14. [Deployment](#14-deployment)
15. [Environment Variables](#15-environment-variables)
16. [Running Locally](#16-running-locally)

---

## 1. Project Overview

Finance Manager is a cross-platform personal finance application built with **React Native** and **Expo**. It enables users to:

- **Connect real bank accounts** via the Enable Banking Open Banking API (PSD2-compliant)
- **Create manual accounts** for cash, wallets, or banks not in the Open Banking network
- **Import bank statements** from PDF files (ING-DiBa, generic German banks) and CSV exports with an interactive column-mapping UI
- **View and filter transactions** by date range with a persistent date filter and category/statement filters
- **Categorize transactions** manually or using **AI-powered auto-categorization** via Google's Gemini API
- **Track debts** owed to/by people and institutions with net balance calculation
- **Simulate ETF investment strategies** with compound interest charts and saveable profiles
- **View financial statistics** including income/expense/net breakdowns and category pie charts
- **Protect balances** behind a 5-digit PIN with a privacy toggle
- **Switch themes** between System, Light, and Dark mode
- **Switch languages** between English and German
- **Set a main/primary account** for the dashboard view

The app features a **responsive design pattern** with separate `desktop/` and `mobile/` component variants for each feature, selecting the appropriate layout based on `Platform.OS`.

The app runs on **iOS**, **Android**, and **Web**. The web version is deployed on **Vercel** with a serverless Express backend.

---

## 2. Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.81.5 | Cross-platform mobile framework |
| Expo | SDK 54 | Build toolchain, dev server, native modules |
| Expo Router | 6.0.23 | File-based navigation (tabs, stacks) |
| React | 19.1.0 | UI rendering engine |
| TypeScript | 5.9.2 | Static type safety |
| react-native-gifted-charts | 1.4.74 | Line/pie charts for stats and investment graphs |
| react-native-reanimated | 4.1.1 | Native-driven animations |
| react-native-gesture-handler | 2.28.0 | Touch gesture recognition |
| react-native-ui-datepicker | 3.1.2 | Date range selection in filter modals |
| @react-native-async-storage | 2.2.0 | Persistent local key-value storage |
| expo-haptics | 15.0.8 | Tactile feedback on tab presses |
| expo-web-browser | 15.0.10 | In-app browser for bank OAuth flows (native) |
| expo-document-picker | 14.0.8 | File picking for PDF/CSV bank statement import |
| expo-file-system | 19.0.21 | Native file system access for reading imported files |
| expo-linear-gradient | 15.0.8 | Gradient backgrounds |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Express | 4.21.2 | HTTP server and routing |
| jsonwebtoken | 9.0.2 | RS256 JWT generation for Enable Banking API auth |
| pdf-parse | 1.1.4 | PDF text extraction for bank statement parsing |
| cors | 2.8.6 | Cross-Origin Resource Sharing middleware |
| dotenv | 16.4.5 | Environment variable loading |
| Node.js | — | Runtime for the API proxy server |

### External APIs
| API | Usage |
|---|---|
| Enable Banking API | Open Banking: bank authorization, account balances, transactions |
| Google Gemini API (2.5 Flash) | AI-powered transaction categorization |

### Deployment
| Platform | Purpose |
|---|---|
| Vercel | Hosts the static web bundle + serverless API functions |
| GitHub | Source control (`ArmaestroDev/Finance-Manager`) |

---

## 3. Architecture

### High-Level Pattern

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          Expo Router (app/)                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ │
│  │ Dashboard │ │ Accounts │ │  Debts   │ │ Invest │ │Connect.│ │ Settings │ │
│  │  (tabs)  │ │  (tabs)  │ │  (tabs)  │ │ (tabs) │ │ (tabs) │ │ (stack)  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ └───┬────┘ └────┬─────┘ │
│       └─────────────┴────────────┴────────────┴──────────┴───────────┘       │
│       │                                                                      │
│  ┌────▼────────────────────────────────────────────────────────────────────┐  │
│  │                     React Context Providers (8)                         │  │
│  │  Settings | DateFilter | Accounts | Categories |                        │  │
│  │  Debts | Transactions | BankStatements | ImportQueue                    │  │
│  └────┬──────────────────────────────────────────────────────────────┬────┘  │
│       │                                                              │       │
│  ┌────▼──────────────────────┐  ┌────────────────────────────────────▼────┐  │
│  │     Custom Hooks          │  │     Responsive UI Components           │  │
│  │  (business logic layer)   │  │  desktop/ ←→ mobile/ variants          │  │
│  └────┬──────────────────────┘  └─────────────────────────────────────────┘  │
│       │                                                                      │
│  ┌────▼────────────────────────────────────────────────────────────────────┐  │
│  │  Services Layer                                                         │  │
│  │  enableBanking.ts (HTTP → /api/*) | parseCsv.ts | processStatement.ts   │  │
│  └────┬────────────────────────────────────────────────────────────────────┘  │
└───────┼──────────────────────────────────────────────────────────────────────┘
        │  HTTP (fetch)
┌───────▼──────────────────────────────────────────────────────────────────────┐
│  Express Backend (api/index.js)                                              │
│  JWT-authenticated proxy → Enable Banking REST API                           │
│  PDF Statement Parser → api/parseStatement.js → api/parsers/*                │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Feature-sliced architecture** — Code is organized by feature domain (`accounts`, `debts`, `invest`, `transactions`, `dashboard`, `import`) rather than by technical type.
2. **Responsive desktop/mobile split** — Each feature has `desktop/` and `mobile/` subdirectories containing platform-optimized component variants. A root-level barrel file (e.g., `AccountsScreen.tsx`) re-exports the correct variant based on `Platform.OS`.
3. **Smart/Dumb component separation** — Business logic lives in custom hooks and contexts; screens and components handle only rendering.
4. **Context API for global state** — Eight React Contexts manage persistent data domains (settings, date filters, accounts, categories, debts, transactions, bank statements, import queue).
5. **Backend as a proxy** — The Express server never stores user data; it signs JWT tokens, forwards requests to Enable Banking, and parses PDF bank statements. All user data lives on-device in AsyncStorage.
6. **Offline-first with cache fallback** — Connected account transactions are cached locally. If the API fails, cached data is served.
7. **Background import queue** — Bank statement imports process sequentially via a reducer-based queue with an overlay showing progress across the entire app.

---

## 4. Folder Tree

```
finance-manager/
├── api/                          # Express backend (Vercel serverless function)
│   ├── index.js                  # All API routes, JWT auth, and PDF parse endpoint
│   ├── parseStatement.js         # Statement parser dispatcher (detects bank, routes to parser)
│   └── parsers/                  # Bank-specific PDF statement parsers
│       ├── shared.js             # Shared utilities: parseGermanAmount, normalizeLines, checkBalanceDelta
│       ├── ingDiba.js            # ING-DiBa Girokonto PDF parser
│       └── genericGerman.js      # Generic German bank statement PDF parser (fallback)
│
├── app/                          # Expo Router — screens & navigation
│   ├── _layout.tsx               # Root layout: wraps app in all 8 Context Providers + ImportQueueOverlay
│   ├── settings.tsx              # Settings screen (dashboard, language, theme, API key, privacy)
│   ├── (tabs)/                   # Bottom tab navigator group
│   │   ├── _layout.tsx           # Tab bar configuration (5 tabs)
│   │   ├── index.tsx             # Dashboard / Home tab
│   │   ├── accounts.tsx          # Accounts tab
│   │   ├── debts.tsx             # Debts tab
│   │   ├── invest.tsx            # Investment calculator tab
│   │   └── connections.tsx       # Bank connections tab
│   └── account/
│       └── [id].tsx              # Dynamic route: single account detail view
│
├── src/                          # Application source code (feature-organized)
│   ├── constants/                # Global constants
│   │   ├── Strings.ts            # i18n translation strings (EN + DE)
│   │   └── theme.ts              # Color palette (light/dark) with semantic tokens, font stacks
│   │
│   ├── services/                 # External API clients
│   │   └── enableBanking.ts      # HTTP client for the Express proxy API
│   │
│   ├── shared/                   # Cross-feature shared code
│   │   ├── context/
│   │   │   ├── SettingsContext.tsx    # Language, PIN, Gemini key, balance hiding, theme, main account
│   │   │   └── DateFilterContext.tsx  # Global date range filter state (persisted to AsyncStorage)
│   │   ├── hooks/
│   │   │   ├── use-color-scheme.ts    # System dark/light mode detection (native)
│   │   │   ├── use-color-scheme.web.ts # System dark/light mode detection (web)
│   │   │   └── use-theme-color.ts     # Resolves theme-aware colors
│   │   ├── components/
│   │   │   ├── TransactionStatsSummary.tsx  # Shared income/expense/net summary bar
│   │   │   ├── CategoryFilterBar.tsx   # Re-export barrel (→ desktop or mobile variant)
│   │   │   ├── DateFilterModal.tsx     # Re-export barrel (→ desktop or mobile variant)
│   │   │   ├── InputGroup.tsx          # Re-export barrel (→ desktop or mobile variant)
│   │   │   ├── haptic-tab.tsx          # Tab bar button with haptic feedback
│   │   │   ├── desktop/
│   │   │   │   ├── CategoryFilterBar.tsx  # Desktop category filter pills
│   │   │   │   ├── DateFilterModal.tsx    # Desktop date range picker modal
│   │   │   │   └── InputGroup.tsx         # Desktop labeled text input
│   │   │   ├── mobile/
│   │   │   │   ├── CategoryFilterBar.tsx  # Mobile category filter pills
│   │   │   │   ├── DateFilterModal.tsx    # Mobile date range picker modal
│   │   │   │   └── InputGroup.tsx         # Mobile labeled text input
│   │   │   └── ui/
│   │   │       └── icon-symbol.tsx    # Platform-adaptive icon wrapper (SF Symbols / Material)
│   │   ├── types/                # Shared TypeScript type definitions (empty — types are co-located)
│   │   └── utils/
│   │       ├── date.ts               # Date formatting: DD-MM-YYYY ↔ YYYY-MM-DD
│   │       └── financeHelpers.ts     # Re-exports + formatAmount + cleanRemittanceInfo
│   │
│   └── features/                 # Feature modules
│       ├── accounts/             # Bank accounts management
│       │   ├── context/
│       │   │   └── AccountsContext.tsx    # Global account state + balance fetching
│       │   ├── hooks/
│       │   │   ├── useAccountsScreen.ts  # Accounts screen logic (sections, modals, totals)
│       │   │   ├── useAccountStats.ts    # Income/expense computation per account
│       │   │   └── useBankConnections.ts # Open Banking OAuth flow + session management
│       │   └── components/
│       │       ├── AccountsScreen.tsx       # Re-export barrel
│       │       ├── AccountDetailScreen.tsx  # Re-export barrel
│       │       ├── ConnectionsScreen.tsx    # Re-export barrel
│       │       ├── AddAccountModal.tsx      # Re-export barrel
│       │       ├── AccountCategoryModal.tsx # Re-export barrel
│       │       ├── BankSelectionModal.tsx   # Re-export barrel
│       │       ├── CashModal.tsx            # Re-export barrel
│       │       ├── desktop/                 # Desktop variants of all components
│       │       │   ├── AccountsScreen.tsx
│       │       │   ├── AccountDetailScreen.tsx
│       │       │   ├── ConnectionsScreen.tsx
│       │       │   ├── AddAccountModal.tsx
│       │       │   ├── AccountCategoryModal.tsx
│       │       │   ├── BankSelectionModal.tsx
│       │       │   └── CashModal.tsx
│       │       └── mobile/                  # Mobile variants of all components
│       │           ├── AccountsScreen.tsx
│       │           ├── AccountDetailScreen.tsx
│       │           ├── ConnectionsScreen.tsx
│       │           ├── AddAccountModal.tsx
│       │           ├── AccountCategoryModal.tsx
│       │           ├── BankSelectionModal.tsx
│       │           └── CashModal.tsx
│       │
│       ├── dashboard/            # Home screen / financial overview
│       │   ├── hooks/
│       │   │   ├── useFinanceData.ts     # Aggregates transactions from all accounts
│       │   │   └── useFinanceStats.ts    # Computes totals, category breakdowns, pie data
│       │   └── components/
│       │       ├── DashboardScreen.tsx    # Re-export barrel
│       │       ├── BalanceCard.tsx        # Re-export barrel
│       │       ├── StatsOverview.tsx      # Re-export barrel
│       │       ├── desktop/
│       │       │   ├── DashboardScreen.tsx
│       │       │   ├── BalanceCard.tsx
│       │       │   └── StatsOverview.tsx
│       │       └── mobile/
│       │           ├── DashboardScreen.tsx
│       │           ├── BalanceCard.tsx
│       │           └── StatsOverview.tsx
│       │
│       ├── debts/                # Debt tracking
│       │   ├── context/
│       │   │   └── DebtsContext.tsx       # Entities (people) + debt items state
│       │   └── components/
│       │       ├── DebtsScreen.tsx        # Re-export barrel
│       │       ├── AddDebtModal.tsx       # Re-export barrel
│       │       ├── DebtDetailModal.tsx    # Re-export barrel
│       │       ├── ManagePeopleModal.tsx  # Re-export barrel
│       │       ├── desktop/              # Desktop variants
│       │       │   ├── DebtsScreen.tsx
│       │       │   ├── AddDebtModal.tsx
│       │       │   ├── DebtDetailModal.tsx
│       │       │   └── ManagePeopleModal.tsx
│       │       └── mobile/               # Mobile variants
│       │           ├── DebtsScreen.tsx
│       │           ├── AddDebtModal.tsx
│       │           ├── DebtDetailModal.tsx
│       │           └── ManagePeopleModal.tsx
│       │
│       ├── invest/               # ETF savings calculator
│       │   ├── hooks/
│       │   │   └── useInvestCalculator.ts # Compound interest math + profile CRUD
│       │   └── components/
│       │       ├── InvestScreen.tsx         # Re-export barrel
│       │       ├── InvestProfileModal.tsx   # Re-export barrel
│       │       ├── ManageProfilesModal.tsx  # Re-export barrel
│       │       ├── desktop/                # Desktop variants
│       │       │   ├── InvestScreen.tsx
│       │       │   ├── InvestProfileModal.tsx
│       │       │   └── ManageProfilesModal.tsx
│       │       └── mobile/                 # Mobile variants
│       │           ├── InvestScreen.tsx
│       │           ├── InvestProfileModal.tsx
│       │           └── ManageProfilesModal.tsx
│       │
│       ├── transactions/        # Transaction display + categorization
│       │   ├── context/
│       │   │   ├── CategoriesContext.tsx       # Category CRUD + transaction-category mapping
│       │   │   └── TransactionsContext.tsx     # Centralized transaction loading, CRUD, & import
│       │   ├── hooks/
│       │   │   ├── useAccountTransactions.ts   # Load, cache, CRUD transactions for one account
│       │   │   └── useAutoCategorize.ts        # Gemini AI auto-categorization logic
│       │   ├── utils/
│       │   │   └── transactions.ts             # getStableTxId() + getTransactionAmount()
│       │   └── components/
│       │       ├── AddTransactionModal.tsx      # Re-export barrel
│       │       ├── EditTransactionModal.tsx     # Re-export barrel
│       │       ├── TransactionDetailModal.tsx   # Re-export barrel
│       │       ├── TransactionItem.tsx          # Re-export barrel
│       │       ├── TransactionsScreen.tsx       # Re-export barrel
│       │       ├── CategoryManageModal.tsx      # Re-export barrel
│       │       ├── desktop/                    # Desktop variants
│       │       │   ├── AddTransactionModal.tsx
│       │       │   ├── EditTransactionModal.tsx
│       │       │   ├── TransactionDetailModal.tsx
│       │       │   ├── TransactionItem.tsx
│       │       │   ├── TransactionsScreen.tsx
│       │       │   └── CategoryManageModal.tsx
│       │       └── mobile/                     # Mobile variants
│       │           ├── AddTransactionModal.tsx
│       │           ├── EditTransactionModal.tsx
│       │           ├── TransactionDetailModal.tsx
│       │           ├── TransactionItem.tsx
│       │           ├── TransactionsScreen.tsx
│       │           └── CategoryManageModal.tsx
│       │
│       └── import/              # Bank statement import (PDF + CSV)
│           ├── context/
│           │   ├── BankStatementsContext.tsx   # Persisted metadata of imported statements
│           │   └── ImportQueueContext.tsx      # Background processing queue for statement files
│           ├── services/
│           │   ├── parseCsv.ts                # CSV parsing, delimiter detection, column mapping engine
│           │   └── processStatement.ts        # PDF statement → backend API → Transaction[]
│           └── components/
│               ├── CsvMappingModal.tsx         # Interactive CSV column-to-role mapping modal
│               ├── ImportQueueOverlay.tsx       # Re-export barrel
│               ├── StatementsModal.tsx          # Re-export barrel
│               ├── desktop/
│               │   ├── ImportQueueOverlay.tsx  # Desktop floating progress overlay
│               │   └── StatementsModal.tsx     # Desktop statements management modal
│               └── mobile/
│                   ├── ImportQueueOverlay.tsx  # Mobile floating progress overlay
│                   └── StatementsModal.tsx     # Mobile statements management modal
│
├── pipeline/                    # Python LLM pipeline for statement parsing prototyping
│   ├── pipeline.py              # Multi-stage Gemini API pipeline
│   ├── config.json              # Pipeline configuration
│   ├── prompts/                 # Prompt templates
│   └── outputs/                 # Generated outputs
│
├── assets/images/               # Static images (icons, splash, logos)
├── dist/                        # Build output for Vercel web deployment
├── .vscode/                     # VS Code workspace settings
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── app.json                     # Expo configuration (name, plugins, splash)
├── vercel.json                  # Vercel routing and deployment config
├── DEPLOY.md                    # Deployment instructions
├── CLAUDE.md                    # AI assistant context file
└── project_documentation.md     # This file
```

---

## 5. Backend (API Server)

### File: `api/index.js`

The backend is a single Express application that acts as an **authenticated proxy** between the React Native frontend and the [Enable Banking API](https://enablebanking.com), and also provides a **bank statement PDF parser** endpoint..

### How JWT Authentication Works

1. On every API call, the server generates a short-lived JWT (1 hour expiry) signed with the app's RSA private key.
2. The JWT contains:
   - `iss`: "enablebanking.com"
   - `aud`: "api.enablebanking.com"
   - `kid`: The application ID (used by Enable Banking to find the matching public key)
3. This JWT is sent as a `Bearer` token in the `Authorization` header to `https://api.enablebanking.com`.

### Private Key Loading

| Environment | Method |
|---|---|
| **Local development** | Loaded from `{APP_ID}.pem` file in the project root |
| **Vercel production** | Read from `ENABLE_BANKING_PRIVATE_KEY` environment variable, with escaped newlines (`\\n`) converted to real newlines |

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check — returns key availability status |
| `GET` | `/api/aspsps?country=DE` | Lists available banks (ASPSPs) for a country |
| `POST` | `/api/auth` | Initiates OAuth bank authorization; returns redirect URL |
| `POST` | `/api/sessions` | Exchanges OAuth `code` for a session with linked accounts |
| `GET` | `/api/sessions/:sessionId` | Retrieves session details (accounts list) |
| `GET` | `/api/accounts/:accountId/balances` | Fetches account balance (types: CLAV, XPCD) |
| `GET` | `/api/accounts/:accountId/transactions` | Fetches transactions with date filtering and pagination via `continuation_key` |
| `POST` | `/api/parse-statement` | Parses a PDF bank statement (base64-encoded) and returns extracted transactions |

### PDF Statement Parsing Pipeline

The `/api/parse-statement` endpoint accepts a base64-encoded PDF and filename, then:

1. Decodes the PDF buffer and extracts raw text using `pdf-parse`
2. Dispatches to the parser chain defined in `api/parseStatement.js`
3. Returns structured transaction data with metadata

**Parser Architecture** (`api/parseStatement.js`):
- Maintains an ordered list of parsers: `[ingDiba, genericGerman]`
- Each parser exposes `detect(rawText)` and `parse(rawText)`
- Bank-specific parsers run first; the generic fallback catches all remaining formats
- If a parser detects but extracts zero transactions, the chain continues

**Bank-Specific Parsers** (`api/parsers/`):

| Parser | File | Detection | Notes |
|---|---|---|---|
| ING-DiBa | `ingDiba.js` | `/ING-DiBa/i` or Girokonto+Buchung header | State-machine parser: tracks table-start/table-end markers, handles collapsed whitespace from pdf-parse |
| Generic German | `genericGerman.js` | Always returns `true` (fallback) | Best-effort parser for DD.MM.YYYY + description + German amount format. Always emits `parseWarning` |

**Shared Utilities** (`api/parsers/shared.js`):
- `parseGermanAmount(str)` — Converts German format (`1.234,56`) to float
- `normalizeLines(rawText)` — Splits, trims, filters empty lines
- `checkBalanceDelta(old, new, txs)` — Validates that sum of transactions matches statement balance delta (within ±0.01)

### Dual-Mode Server

```javascript
// Only listen on a port when run directly (npm run server)
if (require.main === module) {
  app.listen(PORT, () => { ... });
}
// When imported by Vercel, it uses the exported Express app as a serverless function
module.exports = app;
```

---

## 6. Frontend (React Native App)

### Navigation Structure

The app uses **Expo Router's file-based routing**:

```
app/_layout.tsx          → Root Stack (wraps everything in 8 Context Providers)
  └── app/(tabs)/_layout.tsx → Bottom Tab Navigator (5 tabs)
        ├── index.tsx        → Dashboard (Home)
        ├── accounts.tsx     → Accounts
        ├── debts.tsx        → Debts
        ├── invest.tsx       → Investment Calculator
        └── connections.tsx  → Bank Connections
  └── app/account/[id].tsx   → Account Detail (dynamic route, pushed onto stack)
  └── app/settings.tsx       → Settings (pushed onto stack from Dashboard)
```

### Root Layout (`app/_layout.tsx`)

The root layout wraps the entire app in eight Context Providers in this exact order:

```
SettingsProvider
  → DateFilterProvider
    → AccountsProvider
      → CategoriesProvider
        → DebtsProvider
          → TransactionsProvider
            → BankStatementsProvider
              → ImportQueueProvider
                → RootLayoutInner (ThemeProvider + Stack + ImportQueueOverlay)
```

It also:
- Renders the `ImportQueueOverlay` globally (visible during any screen while imports process)
- Injects a global CSS rule to hide scrollbars on web
- Handles **OAuth popup callbacks on web**: when a bank auth popup redirects back, the root layout detects the `code` URL parameter and posts it back to the main window via `window.opener.postMessage`

### Tab Layout (`app/(tabs)/_layout.tsx`)

Configures 5 bottom tabs with:
- SF Symbol icons (iOS) / Material icons (fallback)
- Haptic feedback on tab press via `HapticTab`
- i18n-translated tab labels
- Theme-aware tint colors
- Hidden tab labels (`tabBarShowLabel: false`)

### Responsive Component Pattern

Every visual component has a barrel file at its feature root that re-exports the platform-appropriate variant:

```typescript
// src/features/accounts/components/AccountsScreen.tsx (barrel)
import { Platform } from 'react-native';
export const AccountsScreen = Platform.OS === 'web'
  ? require('./desktop/AccountsScreen').AccountsScreen
  : require('./mobile/AccountsScreen').AccountsScreen;
```

The `desktop/` variant is optimized for wide viewports (multi-column layouts, larger modals, hover states), while `mobile/` is optimized for touch (bottom sheets, swipe gestures, compact layouts).

---

## 7. State Management (Contexts)

### 7.1 `SettingsContext` (`src/shared/context/SettingsContext.tsx`)

Manages user preferences persisted to AsyncStorage.

| State | Type | Description |
|---|---|---|
| `isBalanceHidden` | `boolean` | Whether all monetary values are masked |
| `userPin` | `string \| null` | 5-digit PIN for balance protection |
| `geminiApiKey` | `string \| null` | User's Google Gemini API key for AI categorization |
| `language` | `"en" \| "de"` | Active UI language |
| `mainAccountId` | `string \| null` | User-selected primary account for dashboard display |
| `theme` | `"system" \| "light" \| "dark"` | App appearance mode |
| `i18n` | `object` | Resolved string map (`Strings[language]`) |

**Key behavior**: Toggling balance visibility requires PIN creation (first time) or PIN verification (subsequent). PINs are exactly 5 numeric digits.

### 7.2 `DateFilterContext` (`src/shared/context/DateFilterContext.tsx`)

Global, persisted date range filter shared across Dashboard, Account Detail, and Transactions views.

| State | Type | Description |
|---|---|---|
| `filterDateFrom` | `string` | Start date in `DD-MM-YYYY` UI format |
| `filterDateTo` | `string` | End date in `DD-MM-YYYY` UI format |
| `refreshSignal` | `number` | Counter incremented on date change to trigger data reloads |
| `selectedCategoryId` | `string \| null` | Active category filter |
| `selectedStatementId` | `string \| null` | Active statement filter |

**Key behavior**:
- Defaults to 1st of current month → today on first load
- All filter state (dates, category ID, statement ID) is persisted to AsyncStorage under `date_filter_state`
- `applyPreset(days | "year")` provides quick preset filters
- Returns `null` (renders nothing) until initialization completes

### 7.3 `AccountsContext` (`src/features/accounts/context/AccountsContext.tsx`)

Central hub for all financial accounts.

| State | Type | Description |
|---|---|---|
| `accounts` | `UnifiedAccount[]` | Merged list of connected bank accounts + manual accounts |
| `cashBalance` | `number` | User's "cash at hand" amount |
| `isLoading` | `boolean` | Initial data loading state |
| `isRefreshing` | `boolean` | Pull-to-refresh state |

**Data types**:
- `UnifiedAccount` — Normalized account with `id`, `type` ("connected" | "manual"), `name`, `category` ("Giro" | "Savings" | "Stock"), `balance`, `currency`, `bankName`, optional `iban`
- `ManualAccount` — User-created account stored in AsyncStorage
- `StoredSession` — Persisted Enable Banking session with `sessionId`, `bankName`, `accounts[]`

**Refresh flow**:
1. Load cached accounts from AsyncStorage for instant rendering
2. Fetch fresh balances from Enable Banking API for connected accounts (in parallel)
3. Merge with manual accounts
4. Cache the final result

### 7.4 `TransactionsContext` (`src/features/transactions/context/TransactionsContext.tsx`)

Centralized transaction management — loading, CRUD, import, and in-memory state.

| State | Type | Description |
|---|---|---|
| `transactionsByAccount` | `Record<string, Transaction[]>` | Date-filtered transactions keyed by account ID |
| `isLoading` | `boolean` | Whether transactions are being fetched |
| `globalError` | `string \| null` | Error message displayed via Alert |

**Key operations**:
- `refreshTransactions()` — Reloads all transactions for every account (manual from storage, connected from API with cache merge)
- `addManualTransaction()` / `updateManualTransaction()` / `deleteManualTransaction()` — CRUD for manual account transactions, auto-adjusts account balance
- `importBankStatement(accountId, txs, isManual, statementId)` — Imports transactions with composite-key deduplication (date + amount + description), prevents duplicate imports
- `deleteTransactionsByIds(accountId, txIds, isManual)` — Bulk delete by transaction IDs (used for statement cascade deletion)

**Deduplication logic**: Uses a composite key `"date|amount|description"` (with `[Imported]` prefix stripped, lowercase, whitespace-normalized) to prevent re-importing the same transactions. This handles both re-uploads (new IDs each time) and legitimate same-day transactions (different descriptions).

**Loading modal**: Renders a transparent full-screen modal with a spinner while loading.

### 7.5 `CategoriesContext` (`src/features/transactions/context/CategoriesContext.tsx`)

Manages transaction categories and the mapping of transactions to categories.

| State | Type | Description |
|---|---|---|
| `categories` | `TransactionCategory[]` | User's category definitions (`id`, `name`, `color`) |
| `transactionCategoryMap` | `Record<string, string>` | Maps `transactionId → categoryId` |

**Key operations**: Single and bulk category creation, single and bulk assignment, category deletion with cascading map cleanup.

**Color palette**: 12 predefined colors for new categories (`#FF6B6B`, `#FF8E53`, `#FFC93C`, etc.)

### 7.6 `DebtsContext` (`src/features/debts/context/DebtsContext.tsx`)

Tracks people/institutions and individual debt entries.

| State | Type | Description |
|---|---|---|
| `entities` | `DebtEntity[]` | People or institutions (each has `id`, `name`, `type`) |
| `debts` | `DebtItem[]` | Individual debt records (`amount`, `description`, `type`: I_OWE / OWES_ME, `date`) |

**Key logic**: `getNetBalance(entityId)` computes net position by summing `OWES_ME` amounts and subtracting `I_OWE` amounts. Positive = they owe me; negative = I owe them.

### 7.7 `BankStatementsContext` (`src/features/import/context/BankStatementsContext.tsx`)

Persists metadata about imported bank statement files.

| State | Type | Description |
|---|---|---|
| `statements` | `BankStatement[]` | All imported statement records |

**`BankStatement` type**:

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique statement ID (prefixed `stmt_`) |
| `accountId` | `string` | Target account |
| `fileName` | `string` | Original file name |
| `uploadedAt` | `string` | ISO date string |
| `bank` | `string` | Detected bank name (e.g., "ING-DiBa", "Generic (German)") |
| `period` | `string \| null` | Statement period (e.g., "01.02.2026 bis 28.02.2026") |
| `iban` | `string \| null` | Detected IBAN |
| `importedTxIds` | `string[]` | Transaction IDs created during import |
| `skippedCount` | `number` | Number of duplicate transactions skipped |
| `parseWarning` | `string \| null` | Parser warnings (e.g., balance check failure) |

**Key operations**: `addStatement()`, `deleteStatement()`, `getStatementsForAccount(accountId)`.

### 7.8 `ImportQueueContext` (`src/features/import/context/ImportQueueContext.tsx`)

Background processing queue for bank statement imports using `useReducer`.

| State | Type | Description |
|---|---|---|
| `items` | `QueueItem[]` | All queued import jobs with status tracking |

**`QueueItem` states**: `idle` → `processing` → `completed` or `failed`

**Queue actions**: `ADD_ITEMS`, `UPDATE_STATUS`, `UPDATE_PROGRESS`, `REMOVE_ITEM`, `RETRY_ITEM`

**Background processor**: An interval-based loop (500ms tick) picks the next `idle` item and:
1. Reads the file as base64 (FileReader on web, expo-file-system on native)
2. Sends to `/api/parse-statement` backend endpoint
3. Calls `TransactionsContext.importBankStatement()` with the parsed transactions
4. Calls `BankStatementsContext.addStatement()` with metadata
5. Updates progress (10% → 70% → 100%) and status

**Design**: Sequential processing (one at a time) with no artificial cooldown. The `isProcessingRef` guard prevents concurrent parsing.

---

## 8. Custom Hooks (Business Logic)

### 8.1 `useFinanceData` (Dashboard)

Aggregates transactions from **all accounts** for the dashboard stats view.

- Reads from the centralized `TransactionsContext.transactionsByAccount` map
- Merges all account transactions into a single flat array
- No longer fetches independently — relies on the shared `TransactionsContext` for data

### 8.2 `useFinanceStats` (Dashboard)

Pure computation hook — takes all transactions and produces:

| Output | Computation |
|---|---|
| `totalAssets` | Sum of all positive account balances + positive cash |
| `totalLiabilities` | Sum of all negative account balances |
| `totalIncome` | Sum of positive transaction amounts (categorized only) |
| `totalExpenses` | Sum of negative transaction amounts (categorized only) |
| `categoryBreakdown` | Expenses grouped by category with amounts |
| `pieData` | Formatted data for the pie chart component |

**Important**: Uncategorized transactions are explicitly excluded from income/expense stats.

### 8.3 `useAccountTransactions` (Account Detail)

Full CRUD for transactions on a single account.

- **Load**: API fetch with caching for connected accounts; AsyncStorage for manual
- **Pagination**: Fetches up to 5 continuation pages
- **Add/Edit/Delete**: Manual transactions only — updates AsyncStorage and adjusts account balance
- **Category management**: Read/write account category metadata
- **Balance sync**: After loading transactions, fetches fresh balance from API and updates the global context

### 8.4 `useAccountsScreen` (Accounts Tab)

Orchestrates the accounts list screen:

- Groups accounts into sections by category (`Giro`, `Savings`, `Stock`)
- Manages modal states (cash edit, add account)
- Computes `totalBankBalance` and `totalNetWorth`
- Provides `formatAmount()` with German locale (`de-DE`, EUR)

### 8.5 `useBankConnections` (Connections Tab)

Handles the complete Open Banking connection flow:

1. **Bank discovery**: Fetches ASPSP list from `/api/aspsps?country=DE`, provides search/filter
2. **OAuth initiation**: Calls `/api/auth` → opens bank login in browser popup (web) or in-app browser (native)
3. **Code handling**: Listens for OAuth callback via deep links (native) or `window.postMessage` (web popup)
4. **Session creation**: Exchanges code via `/api/sessions` → stores session with accounts in AsyncStorage
5. **Manual code entry**: Fallback option if browser redirect fails

### 8.6 `useAccountStats` (Account Detail)

Computes per-account income and expenses from the transaction list. Uncategorized transactions are excluded.

### 8.7 `useInvestCalculator` (Invest Tab)

Compound interest calculator with profile management:

- **Inputs**: Initial investment, monthly contribution, duration (years), expected return rate (%)
- **Calculation**: Monthly compounding formula: `value = (value + monthly) × (1 + monthlyRate)` iterated over all months
- **Output**: Year-by-year data points for line charts, final value, total invested, total gain
- **Profiles**: Save/load/delete named investment scenarios to AsyncStorage. Each profile stores all input parameters plus a name and color.
- **Default values**: €1,000 initial, €150/month, 10 years, 7.09% return

### 8.8 `useAutoCategorize` (Transaction AI)

Sends uncategorized transactions to Google Gemini 2.5 Flash for intelligent categorization:

1. **Filters** transactions from the last 3 months that lack categories
2. **Batches** them in groups of 50 to stay within token limits
3. **Constructs a prompt** that includes existing category IDs/names and transaction details (creditor, debtor, amount, reference)
4. **Validates AI output**:
   - Checks if assigned category IDs actually exist
   - Creates new categories when the AI suggests category names that don't exist yet
   - Enforces income/expense consistency: positive amounts → Income category, negative amounts → expense categories
   - Respects the user's language preference (German/English) for new category names
5. **Bulk assigns** all validated categorizations in one batch operation

---

## 9. Services Layer

### File: `src/services/enableBanking.ts`

The HTTP client that communicates with the Express backend. All functions use `fetch()`.

**API Base URL logic**:
```typescript
const API_BASE =
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "/api"                          // Production: relative path on Vercel
    : "http://localhost:3001/api";    // Dev: local Express server
```

### Exported Functions

| Function | Method | Endpoint | Returns |
|---|---|---|---|
| `startAuth(aspspName, aspspCountry)` | `POST` | `/api/auth` | `{ url, authorization_id }` |
| `createSession(code)` | `POST` | `/api/sessions` | `SessionData { session_id, accounts[], aspsp }` |
| `getBalances(accountId)` | `GET` | `/api/accounts/:id/balances` | `{ balances: Balance[] }` |
| `getTransactions(accountId, dateFrom?, dateTo?, continuationKey?)` | `GET` | `/api/accounts/:id/transactions` | `{ transactions, continuation_key? }` |
| `getASPSPs(country)` | `GET` | `/api/aspsps?country=` | `{ aspsps: [{ name, country }] }` |

### Exported TypeScript Interfaces

- `Account` — Bank account from Enable Banking (uid, account_id with IBAN, name, currency)
- `Balance` — Account balance (balance_amount, balance_type like CLAV/XPCD)
- `Transaction` — Transaction record (amount, dates, creditor/debtor, remittance info)
- `SessionData` — OAuth session result with linked accounts

### File: `src/features/import/services/processStatement.ts`

Handles reading files and sending them to the backend for PDF parsing.

| Function | Description |
|---|---|
| `parseStatementWithBackend(item, statementId, currency)` | Reads file as base64, POSTs to `/api/parse-statement`, normalizes response into `Transaction[]` with `import_pdf_{statementId}_{index}` IDs |

**Platform-specific file reading**:
- **Web**: Uses `FileReader.readAsDataURL()` on the `File` object stored in the queue item
- **Native**: Uses `expo-file-system` `readAsStringAsync()` with base64 encoding

### File: `src/features/import/services/parseCsv.ts`

Client-side CSV parsing engine for bank export files.

| Function | Description |
|---|---|
| `detectDelimiter(text)` | Auto-detects `;`, `,`, or `\t` by counting occurrences in first 5 lines |
| `parseCsv(text, delimiter?)` | Parses CSV with RFC-4180 quote handling, auto-detects header row (scans first 15 lines for row with most fields) |
| `autoDetectRoles(headers)` | Maps column headers to roles using German+English regex patterns (e.g., `Buchung` → `date`, `Betrag` → `amount`) |
| `detectDateFormat(rows, dateCol)` | Detects `DD.MM.YYYY`, `YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY` from sample rows |
| `detectAmountFormat(rows, amountCols)` | Detects `de` (1.234,56) vs `en` (1,234.56) by checking last separator |
| `rowsToTransactions(rows, mapping, currency, fileName)` | Converts CSV rows to `Transaction[]` using the confirmed mapping. Supports single `amount` column or split `debit`/`credit` columns |

**CSV Field Roles**: `ignore`, `date`, `description`, `amount`, `debit`, `credit`, `valueDate`

---

## 10. Shared Utilities & Constants

### `src/constants/Strings.ts`

Complete i18n string map with `en` and `de` keys. Contains translated strings covering every screen and modal. Organized by feature section (Tabs, Home, Accounts, Debts, Invest, Connections, Account Details, Settings, Appearance, Import).

### `src/constants/theme.ts`

- **Colors**: Full semantic token set for both light and dark modes:
  - Light: `#1E1B4B` text, `#FAFAFA` background, `#FFFFFF` surface, `#8E1E5E` tint/primary
  - Dark: `#FDF4F8` text, `#111827` background, `#1F2937` surface, `#FDF4F8` tint/primary
  - Semantic: `income` (#10B981), `expense` (#F43F5E), `border`, `textSecondary`, `icon`, `primaryLight`
- **Fonts**: Platform-specific font stacks for `sans`, `serif`, `rounded`, and `mono`

### `src/shared/utils/date.ts`

Two conversion functions for the two date formats used in the app:

| Function | Input | Output | Used For |
|---|---|---|---|
| `toUiDate(Date)` | JS `Date` object | `"DD-MM-YYYY"` | Display in UI text fields |
| `toApiDate(string)` | `"DD-MM-YYYY"` | `"YYYY-MM-DD"` | Enable Banking API queries |

### `src/shared/utils/financeHelpers.ts`

Re-exports utilities from across the codebase + defines:

- `formatAmount(number)` — Formats as EUR with German locale (`1.234,56 €`)
- `cleanRemittanceInfo(string[])` — Extracts readable text from raw bank remittance data, handling `remittanceinformation:` prefixed strings

### `src/features/transactions/utils/transactions.ts`

Two critical functions used throughout the stats and categorization system:

- `getStableTxId(tx)` — Returns `transaction_id` if available, otherwise generates a deterministic key from `booking_date + amount + creditor/debtor name`. This ensures transactions without IDs (e.g., pending) can still be tracked.
- `getTransactionAmount(tx)` — Normalizes the amount using the `credit_debit_indicator` field:
  - `DBIT` → always negative (expense)
  - `CRDT` → always positive (income)
  - Fallback: If there's a creditor but no debtor and amount is positive, flip to negative

---

## 11. UI Components

### Shared Components (`src/shared/components/`)

| Component | Description |
|---|---|
| `TransactionStatsSummary` | Horizontal income / expense / net summary bar with color-coded values. Used across dashboard and account detail screens. |
| `CategoryFilterBar` | Horizontal scrollable row of category pills with "All" option. Tap a pill to filter transactions by that category. Platform-split (desktop/mobile). |
| `DateFilterModal` | Modal with `react-native-ui-datepicker` for selecting a custom date range. Uses `dayjs`. Platform-split (desktop/mobile). |
| `InputGroup` | Reusable labeled text input with styling props. Platform-split (desktop/mobile). |
| `haptic-tab` | Custom `TabBarButton` that triggers haptic feedback (`Haptics.impactAsync`) on press. |
| `ui/icon-symbol` | Cross-platform icon: uses SF Symbols (`expo-symbols`) on iOS, falls back to `MaterialIcons` on other platforms. |

### Feature Components

#### Accounts
| Component | Description |
|---|---|
| `AccountsScreen` | SectionList grouped by category (Giro/Savings/Stock). Shows net worth card, cash balance, bank assets. Pull-to-refresh supported. |
| `AccountDetailScreen` | Full transaction list for one account. Date filter presets, category filter bar, statement filter, add/edit/delete transactions. AI auto-categorize button. PDF/CSV import buttons. |
| `ConnectionsScreen` | Lists connected banks with account counts. "Connect Bank" button opens the OAuth flow. |
| `AddAccountModal` | Form with name, initial balance, and category picker for manual accounts. |
| `AccountCategoryModal` | Simple picker to reassign an account's category. |
| `BankSelectionModal` | Searchable list of ~300+ German banks from Enable Banking. |
| `CashModal` | Numeric input to update the "cash at hand" balance. |

#### Dashboard
| Component | Description |
|---|---|
| `DashboardScreen` | Overview with BalanceCards for assets/liabilities, date-filtered statistics, settings gear icon. |
| `BalanceCard` | Colored card showing a label and amount (e.g., "Total Assets: €12,345.67"). |
| `StatsOverview` | Two-column income/expense display + pie chart of expense categories using `react-native-gifted-charts`. |

#### Debts
| Component | Description |
|---|---|
| `DebtsScreen` | FlatList of people/institutions with net balances. Color-coded (green = they owe me, red = I owe them). Summary card with total net position. |
| `AddDebtModal` | Form with person picker, amount, description, direction toggle (I owe / they owe me). |
| `DebtDetailModal` | Shows net balance for one person and a chronological history of all debt entries. |
| `ManagePeopleModal` | CRUD interface for people/institutions with swipe-to-edit inline. |

#### Invest
| Component | Description |
|---|---|
| `InvestScreen` | Four input sliders/fields (initial, monthly, years, return rate), result cards (total value, invested, gain), and a dual-line chart showing growth over time. |
| `InvestProfileModal` | Save current calculator state as a named profile with color selection. |
| `ManageProfilesModal` | List saved profiles with tap-to-apply, edit, and delete. |

#### Transactions
| Component | Description |
|---|---|
| `TransactionsScreen` | Full transaction list with date grouping, category filters, and search. |
| `TransactionItem` | Single row showing creditor/debtor name, remittance info, date, amount (color-coded), and category dot. |
| `AddTransactionModal` | Title + amount form for creating manual transactions. |
| `EditTransactionModal` | Pre-filled form for modifying transaction title and amount. |
| `TransactionDetailModal` | Full detail view with category assignment support. |
| `CategoryManageModal` | Create categories with name + color picker. Edit/delete existing. Colored dot preview. |

#### Import (Bank Statements)
| Component | Description |
|---|---|
| `CsvMappingModal` | Interactive column mapper for CSV imports. Shows header detection, delimiter/date/amount format selectors, per-column role assignment with dropdown, data preview table, and live import count. |
| `StatementsModal` | Lists all imported statements for an account with metadata (bank, period, imported/skipped counts). Allows statement deletion with cascade (removes associated transactions). |
| `ImportQueueOverlay` | App-wide floating overlay showing import progress. Displays per-file status (processing/completed/failed), progress bars, and retry/dismiss controls. Auto-hides when empty. |

---

## 12. Screens (App Router)

### `app/(tabs)/index.tsx` — Dashboard
Renders `DashboardScreen` from `src/features/dashboard`. Shows financial overview with total assets, liabilities, income/expense stats, and category breakdowns.

### `app/(tabs)/accounts.tsx` — Accounts
Renders `AccountsScreen` from `src/features/accounts`. Lists all accounts grouped by category with balance totals.

### `app/(tabs)/debts.tsx` — Debts
Renders `DebtsScreen` from `src/features/debts`. Tracks money owed to/from people.

### `app/(tabs)/invest.tsx` — Invest
Renders `InvestScreen` from `src/features/invest`. ETF compound interest calculator with charts.

### `app/(tabs)/connections.tsx` — Connections
Renders `ConnectionsScreen` from `src/features/accounts`. Manages Open Banking bank connections.

### `app/account/[id].tsx` — Account Detail
Dynamic route that renders `AccountDetailScreen`. Takes `id` and `type` (connected/manual) as route params. Shows transactions, stats, category management, and statement import for a single account.

### `app/settings.tsx` — Settings
Self-contained settings screen with five sections:
- **Dashboard**: Main account selection
- **Language**: EN/DE toggle
- **Appearance**: System/Light/Dark theme picker
- **AI Integration**: Gemini API key entry
- **Privacy**: Balance hiding toggle + PIN management (create/change)

---

## 13. Data Flow Diagrams

### Bank Connection Flow

```
User taps "Connect Bank"
  → BankSelectionModal opens → User selects bank
  → useBankConnections.handleSelectBank()
  → POST /api/auth { aspspName, aspspCountry }
  → Backend generates JWT → POST to Enable Banking /auth
  → Returns { url } → Opens in popup (web) or in-app browser (native)
  → User completes bank login → Redirected back with ?code=xxx
  → Code captured via postMessage (web) or deep link (native)
  → useBankConnections.handleAuthCode(code)
  → POST /api/sessions { code }
  → Backend → POST to Enable Banking /sessions
  → Returns session with accounts[]
  → Session saved to AsyncStorage
  → AccountsContext.refreshAccounts() triggered
  → Balances fetched for new accounts
  → UI updates
```

### Transaction Loading Flow

```
DateFilterContext changes (date range or refresh signal)
  → TransactionsContext.loadAllTransactions()
  → For each account in AccountsContext.accounts:
      → If manual account:
          → Load from AsyncStorage "manual_transactions_{id}"
          → Apply date filter
      → If connected account:
          → Load cache from AsyncStorage first
          → Fetch fresh from GET /api/accounts/:id/transactions
          → Handle pagination (continuation_key, up to 5 pages)
          → Merge API + cached txs (deduplication by composite key)
          → Cache merged result to AsyncStorage
          → Apply date filter for in-memory display
          → Async: fetch fresh balance and update AccountsContext
  → Set transactionsByAccount in state
  → All screens reading from TransactionsContext update automatically
```

### PDF Bank Statement Import Flow

```
User taps "Import PDF" in account detail screen
  → expo-document-picker opens file browser
  → User selects one or more PDF files
  → ImportQueueContext.addFiles() creates QueueItems with status "idle"
  → ImportQueueOverlay appears globally showing queued files

Background processor loop (every 500ms):
  → Picks next "idle" item → sets status to "processing"
  → readFileAsBase64(item)
      → Web: FileReader.readAsDataURL() on File object
      → Native: expo-file-system readAsStringAsync(uri, base64)
  → POST /api/parse-statement { base64, fileName }
  → Backend:
      → pdf-parse extracts text
      → parseStatement.js detects bank (ING-DiBa? Generic German?)
      → Bank-specific parser extracts transactions, IBAN, period, balances
      → Runs balance delta check (warns if doesn't match)
      → Returns { bank, iban, period, transactions[], parseWarning }
  → Frontend normalizes to Transaction[] with IDs "import_pdf_{statementId}_{index}"
  → TransactionsContext.importBankStatement(accountId, txs, isManual, statementId)
      → Composite-key deduplication against existing transactions
      → Stores new transactions to AsyncStorage
      → Updates in-memory map
      → Returns { importedTxIds, skippedCount }
  → BankStatementsContext.addStatement({ id, accountId, fileName, bank, period, ... })
  → ImportQueueOverlay shows "completed" with imported/skipped counts
  → User can dismiss items or retry failed ones
```

### CSV Bank Statement Import Flow

```
User taps "Import CSV" in account detail screen
  → expo-document-picker opens file browser
  → User selects a CSV file
  → File content read as text
  → CsvMappingModal opens with:
      → Auto-detected delimiter (;, comma, tab)
      → Auto-detected header row (row with most fields in first 15 lines)
      → Auto-mapped column roles (regex on header names)
      → Auto-detected date format and amount format
  → User reviews/adjusts column roles, date format, amount format
  → Live preview shows first 5 rows + import count
  → User confirms import
  → rowsToTransactions() converts rows to Transaction[]
  → TransactionsContext.importBankStatement() handles deduplication and storage
```

### AI Auto-Categorization Flow

```
User taps "Auto-Categorize (AI)" in account detail
  → useAutoCategorize.autoCategorizeTransactions()
  → Check geminiApiKey exists (redirect to settings if not)
  → Filter uncategorized transactions from last 3 months
  → Batch into groups of 50
  → For each batch:
      → Build prompt with existing categories + transaction data
      → POST to Gemini 2.5 Flash API
      → Parse JSON response (strip markdown code blocks)
      → Validate: cross-check category IDs, enforce income/expense rules
      → Create new categories if AI suggested names that don't exist
      → Bulk assign via CategoriesContext.bulkAssignCategories()
  → Alert with count of categorized transactions
```

---

## 14. Deployment

### Vercel Configuration (`vercel.json`)

```json
{
  "version": 2,
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- **API routes** (`/api/*`) are routed to the Express serverless function in `api/index.js`
- **All other routes** are served as the SPA (`index.html`) for client-side routing

### Build Command

```bash
npm run build    # → expo export -p web → outputs to dist/
```

### Important: The `api/` folder name

Vercel expects serverless functions in a folder called `api/`. **This folder must NOT be renamed** (e.g., to `server/`), or Vercel will not detect the backend functions and all API calls will return HTML instead of JSON.

---

## 15. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ENABLE_BANKING_PRIVATE_KEY` | Production | Full RSA private key PEM content (with `\\n` for newlines) |
| `ENABLE_BANKING_APP_ID` | Optional | Enable Banking app UUID (has a default fallback) |
| `REDIRECT_URL` | Optional | OAuth callback URL (defaults to `http://localhost:8081`) |

For local development, create a `.env` file in the project root:
```
REDIRECT_URL=http://localhost:8081
```

The private key is loaded from a `.pem` file locally (named `{APP_ID}.pem`).

---

## 16. Running Locally

### Start the development server (frontend)
```bash
npm run web       # Web browser
npm run ios       # iOS simulator
npm run android   # Android emulator
```

### Start the API server (backend)
```bash
npm run server    # Runs: node api/index.js → http://localhost:3001
```

**Both must be running** for connected bank account features and PDF statement import to work locally. The frontend auto-detects `localhost` and routes API calls to `http://localhost:3001/api`.

### All npm scripts

| Script | Command | Purpose |
|---|---|---|
| `start` | `expo start` | Start Expo dev server with QR code |
| `web` | `expo start --web` | Start with web browser |
| `ios` | `expo start --ios` | Start with iOS simulator |
| `android` | `expo start --android` | Start with Android emulator |
| `server` | `node api/index.js` | Start backend API proxy on port 3001 |
| `build` | `expo export -p web` | Build static web bundle to `dist/` |
| `lint` | `expo lint` | Run ESLint |
