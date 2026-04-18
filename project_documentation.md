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
- **View and filter transactions** by date range with preset filters (30 days, 90 days, this year, custom)
- **Categorize transactions** manually or using **AI-powered auto-categorization** via Google's Gemini API
- **Track debts** owed to/by people and institutions with net balance calculation
- **Simulate ETF investment strategies** with compound interest charts and saveable profiles
- **View financial statistics** including income/expense breakdowns and category pie charts
- **Protect balances** behind a 5-digit PIN with a privacy toggle
- **Switch languages** between English and German

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
| expo-linear-gradient | 15.0.8 | Gradient backgrounds |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Express | 4.21.2 | HTTP server and routing |
| jsonwebtoken | 9.0.2 | RS256 JWT generation for Enable Banking API auth |
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
┌────────────────────────────────────────────────────────────────┐
│                        Expo Router (app/)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ │
│  │ Dashboard │ │ Accounts │ │  Debts   │ │ Invest │ │Connect.│ │
│  │  (tabs)  │ │  (tabs)  │ │  (tabs)  │ │ (tabs) │ │ (tabs) │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ └───┬────┘ │
│       │             │            │            │          │      │
│  ┌────▼─────────────▼────────────▼────────────▼──────────▼────┐ │
│  │              React Context Providers                       │ │
│  │  Settings | Accounts | Categories | Debts                  │ │
│  └────┬──────────────────────────────────────────────────┬────┘ │
│       │                                                  │      │
│  ┌────▼──────────────────────┐  ┌────────────────────────▼────┐ │
│  │     Custom Hooks          │  │     UI Components           │ │
│  │  (business logic layer)   │  │  (modals, cards, lists)     │ │
│  └────┬──────────────────────┘  └─────────────────────────────┘ │
│       │                                                         │
│  ┌────▼────────────────────────────────────────────────────────┐ │
│  │  Services Layer (enableBanking.ts)                          │ │
│  │  HTTP client → /api/* endpoints                             │ │
│  └────┬────────────────────────────────────────────────────────┘ │
└───────┼─────────────────────────────────────────────────────────┘
        │  HTTP (fetch)
┌───────▼─────────────────────────────────────────────────────────┐
│  Express Backend (api/index.js)                                 │
│  JWT-authenticated proxy → Enable Banking REST API              │
└─────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Feature-sliced architecture** — Code is organized by feature domain (`accounts`, `debts`, `invest`, `transactions`, `dashboard`) rather than by technical type.
2. **Smart/Dumb component separation** — Business logic lives in custom hooks; screens and components handle only rendering.
3. **Context API for global state** — Four React Contexts manage persistent data domains (accounts, categories, debts, settings).
4. **Backend as a proxy** — The Express server never stores user data; it only signs JWT tokens and forwards requests to Enable Banking. All user data lives on-device in AsyncStorage.
5. **Offline-first with cache fallback** — Connected account transactions are cached locally. If the API fails, cached data is served.

---

## 4. Folder Tree

```
finance-manager/
├── api/                          # Express backend (Vercel serverless function)
│   └── index.js                  # All API routes and JWT auth logic
│
├── app/                          # Expo Router — screens & navigation
│   ├── _layout.tsx               # Root layout: wraps app in all Context Providers
│   ├── settings.tsx              # Settings screen (PIN, language, API key)
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
│   │   └── theme.ts              # Color palette (light/dark) and font stacks
│   │
│   ├── services/                 # External API clients
│   │   └── enableBanking.ts      # HTTP client for the Express proxy API
│   │
│   ├── shared/                   # Cross-feature shared code
│   │   ├── context/
│   │   │   └── SettingsContext.tsx    # Language, PIN, Gemini key, balance hiding
│   │   ├── hooks/
│   │   │   ├── use-color-scheme.ts    # System dark/light mode detection (native)
│   │   │   ├── use-color-scheme.web.ts # System dark/light mode detection (web)
│   │   │   └── use-theme-color.ts     # Resolves theme-aware colors
│   │   ├── components/
│   │   │   ├── CategoryFilterBar.tsx  # Horizontal scrollable category pills
│   │   │   ├── DateFilterModal.tsx    # Date range picker modal
│   │   │   ├── InputGroup.tsx         # Labeled text input component
│   │   │   ├── haptic-tab.tsx         # Tab bar button with haptic feedback
│   │   │   └── ui/
│   │   │       └── icon-symbol.tsx    # Platform-adaptive icon wrapper (SF Symbols / Material)
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
│       │       ├── AccountsScreen.tsx       # Accounts tab main UI
│       │       ├── AccountDetailScreen.tsx  # Single account transactions view
│       │       ├── ConnectionsScreen.tsx    # Bank connections tab UI
│       │       ├── AddAccountModal.tsx      # Create manual account form
│       │       ├── AccountCategoryModal.tsx # Change account category picker
│       │       ├── BankSelectionModal.tsx   # ASPSP bank list for Open Banking
│       │       └── CashModal.tsx            # Update cash balance modal
│       │
│       ├── dashboard/            # Home screen / financial overview
│       │   ├── hooks/
│       │   │   ├── useFinanceData.ts     # Aggregates transactions from all accounts
│       │   │   └── useFinanceStats.ts    # Computes totals, category breakdowns, pie data
│       │   └── components/
│       │       ├── DashboardScreen.tsx    # Dashboard tab main UI
│       │       ├── BalanceCard.tsx        # Colored card showing total assets/liabilities
│       │       └── StatsOverview.tsx      # Income/expense bars + category pie chart
│       │
│       ├── debts/                # Debt tracking
│       │   ├── context/
│       │   │   └── DebtsContext.tsx       # Entities (people) + debt items state
│       │   └── components/
│       │       ├── DebtsScreen.tsx        # Debts tab main UI
│       │       ├── AddDebtModal.tsx       # Create new debt entry form
│       │       ├── DebtDetailModal.tsx    # View all debts for one person
│       │       └── ManagePeopleModal.tsx  # Add/rename/delete people/institutions
│       │
│       ├── invest/               # ETF savings calculator
│       │   ├── hooks/
│       │   │   └── useInvestCalculator.ts # Compound interest math + profile CRUD
│       │   └── components/
│       │       ├── InvestScreen.tsx         # Invest tab main UI
│       │       ├── InvestProfileModal.tsx   # Save/edit investment profile
│       │       └── ManageProfilesModal.tsx  # List/delete saved profiles
│       │
│       └── transactions/        # Transaction display + categorization
│           ├── context/
│           │   └── CategoriesContext.tsx    # Category CRUD + transaction-category mapping
│           ├── hooks/
│           │   ├── useAccountTransactions.ts # Load, cache, CRUD transactions for one account
│           │   └── useAutoCategorize.ts      # Gemini AI auto-categorization logic
│           ├── utils/
│           │   └── transactions.ts          # getStableTxId() + getTransactionAmount()
│           └── components/
│               ├── AddTransactionModal.tsx      # Create manual transaction form
│               ├── EditTransactionModal.tsx      # Edit existing transaction
│               ├── TransactionDetailModal.tsx   # Full transaction details overlay
│               ├── TransactionItem.tsx          # Single transaction row in a list
│               └── CategoryManageModal.tsx      # Create/edit/delete categories
│
├── assets/images/               # Static images (icons, splash, logos)
├── dist/                        # Build output for Vercel web deployment
├── .vscode/                     # VS Code workspace settings
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── app.json                     # Expo configuration (name, plugins, splash)
├── vercel.json                  # Vercel routing and deployment config
├── DEPLOY.md                    # Deployment instructions
└── project_documentation.md     # This file
```

---

## 5. Backend (API Server)

### File: `api/index.js`

The backend is a single Express application that acts as an **authenticated proxy** between the React Native frontend and the [Enable Banking API](https://enablebanking.com). It is required because the Enable Banking API uses **RS256 JWT authentication** with a private key that must never be exposed to the client.

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
app/_layout.tsx          → Root Stack (wraps everything in Context Providers)
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

The root layout wraps the entire app in the four Context Providers in this exact order:

```
SettingsProvider → AccountsProvider → CategoriesProvider → DebtsProvider
```

It also handles **OAuth popup callbacks on web**: when a bank auth popup redirects back, the root layout detects the `code` URL parameter and posts it back to the main window via `window.opener.postMessage`.

### Tab Layout (`app/(tabs)/_layout.tsx`)

Configures 5 bottom tabs with:
- SF Symbol icons (iOS) / Material icons (fallback)
- Haptic feedback on tab press via `HapticTab`
- i18n-translated tab labels
- Theme-aware tint colors

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
| `i18n` | `object` | Resolved string map (`Strings[language]`) |

**Key behavior**: Toggling balance visibility requires PIN creation (first time) or PIN verification (subsequent). PINs are exactly 5 numeric digits.

### 7.2 `AccountsContext` (`src/features/accounts/context/AccountsContext.tsx`)

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

### 7.3 `CategoriesContext` (`src/features/transactions/context/CategoriesContext.tsx`)

Manages transaction categories and the mapping of transactions to categories.

| State | Type | Description |
|---|---|---|
| `categories` | `TransactionCategory[]` | User's category definitions (`id`, `name`, `color`) |
| `transactionCategoryMap` | `Record<string, string>` | Maps `transactionId → categoryId` |

**Key operations**: Single and bulk category creation, single and bulk assignment, category deletion with cascading map cleanup.

**Color palette**: 12 predefined colors for new categories (`#FF6B6B`, `#FF8E53`, `#FFC93C`, etc.)

### 7.4 `DebtsContext` (`src/features/debts/context/DebtsContext.tsx`)

Tracks people/institutions and individual debt entries.

| State | Type | Description |
|---|---|---|
| `entities` | `DebtEntity[]` | People or institutions (each has `id`, `name`, `type`) |
| `debts` | `DebtItem[]` | Individual debt records (`amount`, `description`, `type`: I_OWE / OWES_ME, `date`) |

**Key logic**: `getNetBalance(entityId)` computes net position by summing `OWES_ME` amounts and subtracting `I_OWE` amounts. Positive = they owe me; negative = I owe them.

---

## 8. Custom Hooks (Business Logic)

### 8.1 `useFinanceData` (Dashboard)

Aggregates transactions from **all accounts** for the dashboard stats view.

- Iterates over every `UnifiedAccount` in the context
- For manual accounts: reads transactions from AsyncStorage
- For connected accounts: fetches from Enable Banking API via `getTransactions()`
- Handles pagination (up to 3 pages per account)
- Falls back to cached transactions if API calls fail
- Applies date range filtering (`filterDateFrom` → `filterDateTo`)

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

---

## 10. Shared Utilities & Constants

### `src/constants/Strings.ts`

Complete i18n string map with `en` and `de` keys. Contains ~80 translated strings covering every screen and modal. Organized by feature section (Tabs, Home, Accounts, Debts, Invest, Connections, Account Details, Settings).

### `src/constants/theme.ts`

- **Colors**: Light mode (`#11181C` text, `#fff` background, `#0a7ea4` tint) and Dark mode (`#ECEDEE` text, `#151718` background, `#fff` tint)
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
| `CategoryFilterBar` | Horizontal scrollable row of category pills with "All" option. Tap a pill to filter transactions by that category. |
| `DateFilterModal` | Modal with `react-native-ui-datepicker` for selecting a custom date range. Uses `dayjs`. |
| `InputGroup` | Reusable labeled text input with styling props. |
| `haptic-tab` | Custom `TabBarButton` that triggers haptic feedback (`Haptics.impactAsync`) on press. |
| `ui/icon-symbol` | Cross-platform icon: uses SF Symbols (`expo-symbols`) on iOS, falls back to `MaterialIcons` on other platforms. |

### Feature Components

#### Accounts
| Component | Description |
|---|---|
| `AccountsScreen` | SectionList grouped by category (Giro/Savings/Stock). Shows net worth card, cash balance, bank assets. Pull-to-refresh supported. |
| `AccountDetailScreen` | Full transaction list for one account. Date filter presets, category filter bar, add/edit/delete transactions. AI auto-categorize button. |
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
| `TransactionItem` | Single row showing creditor/debtor name, remittance info, date, amount (color-coded), and category dot. |
| `AddTransactionModal` | Title + amount form for creating manual transactions. |
| `EditTransactionModal` | Pre-filled form for modifying transaction title and amount. |
| `TransactionDetailModal` | Full detail view with category assignment support. |
| `CategoryManageModal` | Create categories with name + color picker. Edit/delete existing. Colored dot preview. |

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
Dynamic route that renders `AccountDetailScreen`. Takes `id` and `type` (connected/manual) as route params. Shows transactions, stats, and category management for a single account.

### `app/settings.tsx` — Settings
Self-contained settings screen with three sections:
- **Language**: EN/DE toggle
- **AI Integration**: Gemini API key entry
- **Privacy**: Balance hiding toggle with PIN management

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
Account detail screen opens with account ID
  → useAccountTransactions.loadTransactions()
  → If connected account:
      → Try loading from AsyncStorage cache first (instant render)
      → Fetch fresh from GET /api/accounts/:id/transactions
      → Handle pagination (continuation_key, up to 5 pages)
      → Cache full result to AsyncStorage
      → Apply date filter for UI display
      → Fetch fresh balance and update AccountsContext
  → If manual account:
      → Load from AsyncStorage key "manual_transactions_{id}"
      → Apply date filter
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

**Both must be running** for connected bank account features to work locally. The frontend auto-detects `localhost` and routes API calls to `http://localhost:3001/api`.

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
