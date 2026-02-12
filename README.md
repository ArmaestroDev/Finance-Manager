# Finance Manager

**Finance Manager** is a modern, cross-platform personal finance application built with **React Native (Expo)**. It provides a unified view of your financial health by aggregating data from your bank accounts via Open Banking APIs, tracking manual assets, and calculating your total net worth in real-time.

Designed for privacy and performance, it runs seamlessly on **iOS**, **Android**, and **Web**, with a serverless backend optimized for **Vercel**.

---

## 🚀 Key Features

- **Unified Dashboard**: Get a snapshot of your Total Net Worth, broken down by asset class (Giro, Savings, Stocks, Cash).
- **Bank Integration**: Securely connect to thousands of banks across Europe using the **Enable Banking API**.
- **Smart Sync**: Real-time balance updates with a manual refresh option to bypass caching layers.
- **Smart Categorization**:
  - **Auto-Categorization**: Uses **Google Gemini AI** to automatically suggest categories for your transactions.
  - **Manual Control**: Easily recategorize transactions with a smart, searchable interface.
- **Manual Accounts**: Track physical cash, precious metals, or off-grid assets manually.
- **Cross-Platform**:
  - **Mobile**: Native performance on iOS and Android.
  - **Web**: Fully responsive web app with special handling for Safari/iPad popup blockers.
- **Privacy First**:
  - **Zero-Persistence Backend**: The server acts only as a secure proxy for API keys.
  - **Local Storage**: Session keys and cached balances are stored securely on your device.
- **Customization**: Automatic Dark/Light mode support and English/German localization.

## 🛠️ Technology Stack

- **Frontend**: React Native, Expo, Expo Router, TypeScript.
- **AI**: Google Gemini (via `google-generative-ai`).
- **Backend**: Node.js, Express (deployed as Vercel Serverless Functions).
- **API**: Enable Banking (Open Banking/PSD2).
- **Styling**: Native StyleSheet with systematic theming.
- **Storage**: `AsyncStorage` for local persistence.

## ⚡ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [npm](https://www.npmjs.com/) or `yarn`
- [Expo Go](https://expo.dev/client) app (for mobile testing)

### Installation

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/ArmaestroDev/Finanz-Manager.git
    cd Finanz-Manager
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env` file in the root directory (mapped from `.env.example` if available) or set these variables in your deployment environment:
    - `ENABLE_BANKING_APP_ID`: Your Enable Banking App ID.
    - `ENABLE_BANKING_PRIVATE_KEY`: Your private key content (PEM format).
    - `REDIRECT_URL`: The URL where the bank redirects back to (e.g., `https://your-app.vercel.app`).
    - `EXPO_PUBLIC_GEMINI_API_KEY`: Your Google Gemini API Key (for AI categorization).

### Running Locally

- **Start the frontend**:

  ```bash
  npm start
  ```

  - Press `w` for Web.
  - Press `i` for iOS Simulator.
  - Press `a` for Android Emulator.
  - Scan the QR code with **Expo Go** for physical devices.

- **Start the backend (dev mode)**:
  ```bash
  npm run server
  ```

## 🌍 Deployment

This project is optimized for deployment on **Vercel** (Frontend + Backend).

For detailed, step-by-step deployment instructions, please refer to [DEPLOY.md](./DEPLOY.md).

### Quick Vercel Setup

1.  Push your code to **GitHub**.
2.  Import the project into **Vercel**.
3.  Set the **Framework Preset** to `Other` (or leave default if auto-detected).
4.  Add your Environment Variables (`ENABLE_BANKING_...`) in the Vercel Dashboard.
5.  Deploy!

## 📂 Project Structure

```
finance-manager/
├── api/                  # Backend Serverless Functions (Express)
├── app/                  # Frontend Screens (Expo Router)
│   ├── (tabs)/           # Main Tab Navigation (Home, Accounts, etc.)
│   └── account/          # Account Details Screens
├── assets/               # Images and Icons
├── components/           # Reusable UI Components
├── context/              # Global State (Accounts, Settings)
├── hooks/                # Custom React Hooks
├── services/             # API Client (Enable Banking)
└── vercel.json           # Vercel Routing Configuration
```

## 📄 License

This project is open-source and available under the **MIT License**.
