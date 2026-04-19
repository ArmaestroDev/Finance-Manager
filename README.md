# Finance Manager

**Finance Manager** is a modern, cross-platform personal finance application built with **React Native (Expo)**. It provides a unified view of your financial health by aggregating data from your bank accounts via Open Banking APIs, importing bank statements (PDF & CSV), tracking manual assets, managing debts, and simulating investment strategies — all in real-time.

Designed for privacy and performance, it runs seamlessly on **iOS**, **Android**, and **Web**, with a serverless backend optimized for **Vercel**.

---

## 🚀 Key Features

- **Unified Dashboard**: Total assets and liabilities at a glance, with income/expense stats and category breakdown pie charts.
- **Bank Integration**: Securely connect to thousands of European banks via the **Enable Banking API** (PSD2 Open Banking).
- **Bank Statement Import**:
  - **PDF Import**: Upload PDF bank statements — supports ING-DiBa natively with a generic German bank fallback (Sparkasse, DKB, Commerzbank, Volksbank, etc.).
  - **CSV Import**: Interactive column-mapping UI with auto-detected delimiters, date/amount formats, and live preview.
  - **Duplicate Detection**: Composite-key deduplication prevents re-importing the same transactions.
  - **Background Processing**: Multi-file PDF imports are queued and processed sequentially with a global progress overlay.
- **Smart Categorization**:
  - **AI Auto-Categorization**: Google Gemini 2.5 Flash intelligently categorizes uncategorized transactions in batches.
  - **Manual Control**: Create, edit, and assign custom categories with color-coded dots.
- **Manual Accounts**: Track cash, wallets, or off-grid assets with full transaction CRUD.
- **Debt Tracking**: Track money owed to/from people and institutions with net balance calculation.
- **Investment Calculator**: Compound interest ETF simulator with saveable profiles and growth charts.
- **Cross-Platform**:
  - **Mobile**: Native performance on iOS and Android with touch-optimized layouts.
  - **Desktop/Web**: Wide-viewport layouts with responsive component variants.
- **Privacy First**:
  - **Zero-Persistence Backend**: The server acts only as a secure proxy — no user data stored.
  - **Local Storage**: All data lives on-device in `AsyncStorage`.
  - **Balance Protection**: Hide monetary values behind a 5-digit PIN.
- **Customization**:
  - **Themes**: System, Light, and Dark mode support.
  - **Languages**: English and German localization.
  - **Main Account**: Set a primary account for the dashboard view.

## 🛠️ Technology Stack

- **Frontend**: React Native 0.81, Expo SDK 54, Expo Router 6, TypeScript 5.9.
- **AI**: Google Gemini 2.5 Flash (via user-provided API key).
- **Backend**: Node.js, Express (Vercel Serverless Functions), pdf-parse.
- **API**: Enable Banking (Open Banking / PSD2).
- **Styling**: Native StyleSheet with semantic theme tokens (light/dark).
- **Storage**: `@react-native-async-storage/async-storage` for local persistence.
- **Charts**: `react-native-gifted-charts` for pie charts and line graphs.

## ⚡ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [npm](https://www.npmjs.com/)
- [Expo Go](https://expo.dev/client) app (for mobile testing)

### Installation

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/ArmaestroDev/Finance-Manager.git
    cd Finance-Manager
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env` file in the root directory:
    ```
    REDIRECT_URL=http://localhost:8081
    ```

    Place your Enable Banking private key as `{APP_ID}.pem` in the project root.

### Running Locally

- **Start the frontend**:

  ```bash
  npm run web       # Web browser
  npm run ios       # iOS simulator
  npm run android   # Android emulator
  ```

- **Start the backend**:
  ```bash
  npm run server    # Express API on http://localhost:3001
  ```

> **Note**: Both frontend and backend must be running for bank connection features and PDF statement import to work locally. The frontend auto-detects `localhost` and routes API calls to `http://localhost:3001/api`.

## 🌍 Deployment

This project is optimized for deployment on **Vercel** (Frontend + Backend).

For detailed, step-by-step deployment instructions, see [DEPLOY.md](./DEPLOY.md).

### Quick Vercel Setup

1.  Push your code to **GitHub**.
2.  Import the project into **Vercel**.
3.  Set **Environment Variables** in Vercel Dashboard:
    - `ENABLE_BANKING_PRIVATE_KEY` — RSA PEM content (with `\n` for newlines)
    - `ENABLE_BANKING_APP_ID` — Your Enable Banking App UUID
    - `REDIRECT_URL` — Your Vercel deployment URL
4.  Deploy!

> ⚠️ The `api/` directory **must not be renamed** — Vercel requires this exact path to detect serverless functions.

## 📂 Project Structure

```
finance-manager/
├── api/                          # Backend (Express / Vercel Serverless)
│   ├── index.js                  # All API routes + JWT auth
│   ├── parseStatement.js         # PDF parser dispatcher
│   └── parsers/                  # Bank-specific PDF parsers
├── app/                          # Expo Router — screens & navigation
│   ├── _layout.tsx               # Root layout (8 Context Providers)
│   ├── settings.tsx              # Settings screen
│   ├── (tabs)/                   # Bottom tab navigator (5 tabs)
│   └── account/[id].tsx          # Account detail (dynamic route)
├── src/                          # Application source code
│   ├── constants/                # i18n strings, theme colors
│   ├── services/                 # Enable Banking HTTP client
│   ├── shared/                   # Cross-feature contexts, hooks, components
│   └── features/                 # Feature modules
│       ├── accounts/             # Bank accounts management
│       ├── dashboard/            # Home screen & stats
│       ├── debts/                # Debt tracking
│       ├── invest/               # ETF savings calculator
│       ├── transactions/         # Transaction display & AI categorization
│       └── import/               # Bank statement import (PDF + CSV)
└── vercel.json                   # Vercel routing configuration
```

For comprehensive technical documentation, see [project_documentation.md](./project_documentation.md).

## 📄 License

This project is open-source and available under the **MIT License**.
