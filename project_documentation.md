# Finance Manager - Project Documentation

## 1. Overview and Architecture
The Finance Manager is a comprehensive personal finance tracking application built across web and mobile platforms using React Native and Expo. It allows users to track accounts, debts, categorize spending, calculate investment strategies, and view statistical overviews.

### Architectural Patterns
- **Dumb/Smart Component Pattern**: Presentation UI components are placed in `/components` and feature-specific components in `/app/components`. Business logic resides in hooks (`/hooks`) and Contexts (`/context`).
- **State Management**: The app uses the React Context API to manage global data (Accounts, Categories, Debts, and Settings) and propagate state changes reactively throughout the UI trees.
- **Routing**: Expo Router (version 6) is utilized for file-based routing. The `app` directory serves as both the navigation endpoint collection and layout manager.
- **Micro Backend**: An embedded Express server (`/api/index.js`) processes proxy jobs or data manipulation that goes beyond isolated client-level features.
- **Local Persistence**: State and user data is likely persisted to the local device using `@react-native-async-storage/async-storage`.

## 2. Tech Stack Setup
**Frameworks & Core Tools:**
- **React Native** (0.81.5) / **Expo** (SDK 54)
- **Expo Router**: App-wide file-based navigation
- **React** (19.1.0)
- **Language**: TypeScript

**UI & Data Visualization:**
- **react-native-gifted-charts**: Robust financial charts logic and UI.
- **react-native-reanimated** & **react-native-gesture-handler**: Native-driven animations and gesture interfaces.
- **react-native-ui-datepicker**: Clean date and date range selection.

**Backend & Environment:**
- **Express, CORS, JWT**: In `api/index.js` to serve a RESTful node instance.
- **Dotenv**: Environment variable tracking.

## 3. Broad Directory Structure
- `/app`: Main application screens and routing layouts.
- `/api`: Minimal Node/Express API logic.
- `/assets`: Static resources (Images, splash screens, fonts).
- `/components`: Abstract UI components (Cards, lists, charts).
- `/constants`: Global static parameters (Colors, Themes, Strings).
- `/context`: React Context Providers mapping out state buckets.
- `/hooks`: Custom React hooks isolating business logic, stats calculations, and theme control.
- `/dist`: Build artifacts specifically structured for React Native Web deployments via Vercel.

---

## 4. Specific File & Folder Functionalities

### `/app` (Screens & Navigation)
- `_layout.tsx`: Root layout configuration establishing all global context providers wrapper.
- `(tabs)/_layout.tsx`: Defines the application's main Tab-based bottom navigation architecture.
- `(tabs)/index.tsx`: Main Dashboard view, displaying overview cards and latest transaction summaries.
- `(tabs)/accounts.tsx`: View all linked/added accounts.
- `(tabs)/connections.tsx`: View external bank integrations and synchronization points.
- `(tabs)/debts.tsx`: Tracking liabilities like loans, mortgages, and credit balances.
- `(tabs)/invest.tsx`: Calculations and tracking for stock/managed investment accounts.
- `account/[id].tsx`: Detailed view for exploring a solitary account by UUID or identifier.
- `settings.tsx`: Global user preference setup.
- `todo.md`: Project-specific ongoing developer requirements.

#### `/app/components` (Screen-Specific Components)
- Contains modular UI segments specific to screens: `AddAccountModal`, `BankSelectionModal`, `CashModal`.

#### `/app/hooks` & `/app/utils` (Feature-Scope Helpers)
- Dedicated controllers and utilities specifically handling complex screen flows:
  - `useAccountsScreen.ts`, `useBankConnections.ts`
  - Validation arrays: `date.ts`, `financeHelpers.ts`, `transactions.ts`

### `/components` (Global Reusable UI)
- **Modals:** Form elements encapsulated inside overlays (`AddTransactionModal`, `EditTransactionModal`, `AddDebtModal`, `CategoryManageModal`, etc.).
- **Data Rendering:** `BalanceCard.tsx` (Summary views), `TransactionItem.tsx` (Individual row displays), `StatsOverview.tsx` (Dashboards).
- **Navigation/UX:** `CategoryFilterBar.tsx` (Filtering views by parameters), `haptic-tab.tsx` (Tab bar enhancement with tactile returns).

### `/context` (Global State Definitions)
- `AccountsContext.tsx`: In charge of banking profiles and financial instances.
- `CategoriesContext.tsx`: Tracks personalized categories for budgeting logic.
- `DebtsContext.tsx`: State holder for specific isolated liabilities calculations.
- `SettingsContext.tsx`: App-wide properties such as UI parameters and active preferences.

### `/hooks` (Business Logic & Stats Aggregation)
- **Core Processors**: `useAccountStats.ts` and `useFinanceStats.ts` actively parse transaction contexts and generate numbers suitable for `StatsOverview.tsx`.
- **Data Consumers**: `useAccountTransactions.ts`, `useFinanceData.ts`.
- **Automation Calculators**: `useAutoCategorize.ts` processes automated categorizations. `useInvestCalculator.ts` provides predictive logic for assets.

### `/api` (Express Component)
- `index.js`: Running in a standalone process (`npm run server`), this serves API endpoint logic and interfaces securely with external requirements or processes authentication using `jsonwebtoken`.

### Root Configuration Resources
- `package.json` & `package-lock.json`: NPM package tracker and running scripts `(npm run ios)`
- `app.json`: Expo configurations setting out name, splash mapping and orientation restraints.
- `tsconfig.json`: TypeScript configurations strictly resolving types inside `/hooks` and `/components`.
- `vercel.json` & `DEPLOY.md`: Instructions and settings tracking parameters required to deploy the unbundled web iteration on Vercel platforms.
