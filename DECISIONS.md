# DECISIONS

Hard calls made during the full test / UI overhaul / code-quality pass (October 2026).
For each decision: the context, the options considered, what was chosen, and why.

---

## 1. Functional review and bug fixes

### 1.1 Where to test without risking real data
- **Context:** The browser storage behind `localhost:8081` may hold real financial data. Testing means creating, editing and deleting accounts and transactions.
- **Options:**
  - (a) Snapshot 8081's storage, test there, then restore it.
  - (b) Test on a separate origin.
- **Choice:** (b). All destructive testing ran on `localhost:8083` (and UI work on `:8082`). Browser storage is per origin, so 8081 was never touched.
- **Why:**
  - A snapshot-and-restore can fail halfway through and lose data; a separate origin removes that risk entirely.
  - It also avoids stale-bundle confusion between parallel workers.

### 1.2 Reading numbers with a single "." (`parseLocaleNumber`)
- **Context:** Amount inputs used `parseFloat(x.replace(",", "."))`, so "1.234,56" became 1.234. The new shared parser (`src/shared/utils/number.ts`) must decide what "1.500" means: 1500 in German notation, or 1.5.
- **Options:**
  - (a) A dot followed by exactly 3 digits is a thousands separator.
  - (b) A single dot is always a decimal point. Several dots, or a mix of dots and commas, are resolved by position ("1.234,56" → 1234.56, "1,234.56" → 1234.56).
- **Choice:** (b).
- **Why:**
  - (a) silently turns "7.125" (an interest rate) into 7125 and "12.500" into 12500.
  - Every unambiguous German format ("1.234,56", "1.000,00", "12,50") is still read correctly.
  - "12.50" keeps working.

### 1.3 Which name a transaction shows (`pickTransactionTitle`)
- **Context:** Incomes showed "Self", or the user's own name, as their title.
- **Options:**
  - (a) Change what is stored when a transaction is created or imported.
  - (b) Change how the title is chosen when it's displayed.
- **Choice:** (b). The other party is picked by sign (payer for incomes, payee for expenses), "Self" is skipped, and the old "[Imported]" prefix is removed.
- **Why:**
  - It also fixes every transaction already stored on devices.
  - `getStableTxId` is unchanged, so existing category assignments keep their keys.

### 1.4 Saves racing the initial storage load
- **Context:** A change made before a context finished loading from storage could overwrite the stored data with an empty state. Changes also built on outdated state, so two changes in one handler kept only the second.
- **Options:**
  - (a) Show nothing until every context has loaded.
  - (b) Make each change wait for the initial load (`useReadyGate`), and keep a live copy of the data in each context.
- **Choice:** (b).
- **Why:**
  - No change to startup, rendering or the UI.
  - It removes both the data-wiping bug and the lost-change bug.

### 1.5 Origin check on the bank-auth `postMessage`
- **Context:** The bank-auth popup sends the auth code back to the app with target origin `"*"`.
- **Options:**
  - (a) Restrict it to the app's own origin.
  - (b) Keep `"*"`.
- **Choice:** (b) for now (tried (a), then reverted).
- **Why:**
  - `_layout.tsx` documents a cross-origin flow (the deployed Vercel popup returning to a localhost app) that (a) breaks.
  - The risk is low: only our own app opens the popup, and auth codes are single-use and already exchanged codes are ignored.
- **Revisit:** if that dev flow is dropped, restrict the origin.

### 1.6 Which error text the backend passes to the app
- **Context:** Enable Banking puts a machine-readable code in `error` and the readable explanation in `message`. The app displays `error`.
- **Choice:** The backend's `sendError` puts Enable Banking's `message` in `error` and keeps the original code as `error_code`.
- **Why:** Users see the real reason (e.g. "Wrong authorization code provided"), and the code is still available for logic.

### 1.7 Small logic fix inside a UI-owned file
- **Context:** The desktop account detail pane kept showing a transaction as it was before an edit. The code lives in a component file the UI agent was editing at the same time.
- **Options:**
  - (a) Refactor how the selected transaction is stored.
  - (b) Add a small effect that re-syncs the selection from the transaction list.
- **Choice:** (b), about 8 lines, with the file re-read right before editing.
- **Why:** Least overlap with parallel UI work. The mobile variant got the same fix during the UI pass.

### 1.8 How "Pay from account" payments count toward totals
- **Context:** A transaction can have linked child transactions of two kinds:
  - **Reimbursements:** positive incomes, e.g. a friend paying you back.
  - **"Pay from account" payments:** negative moves out of a manual account, marked Ignore, recording that a pot of money covered part of a bank expense.

  The dashboard and account stats subtracted only positive children from the parent expense. The detail screens and `getLinkedTotal`/`getNetExpense` subtracted the absolute value of all children. So the same expense showed two different net amounts.
- **Options:**
  - (a) Count every child, positive or negative, as reducing the expense.
  - (b) Count only reimbursements.
- **Choice:** (b), now consistent everywhere. `getLinkedTotal` (`TransactionLinksContext.tsx`) sums positive children only, and the detail screens use this shared helper instead of their own copies.
- **Why:**
  - Paying a bank expense from a savings or cash pot doesn't make it cheaper; the household still spent the full amount. Only the source of the money changes.
  - The child is marked Ignore and excluded from stats, so the full amount is counted exactly once.
  - Under (a), the dashboard would under-report spending by the funded amount.
  - Only reimbursements make an expense cheaper, which is also what the green "reimbursed" badge (`LinkedInfo`) shows.

---

## 2. UI overhaul

### 2.1 Type scale
- **Context:** The user said there was "too much small text". The design comps specified Body 14 / Label 10, but the code had drifted to 11–13px for body text.
- **Options:**
  - (a) Bump every size by the same proportion.
  - (b) Text sizes that change with platform or window size.
  - (c) One fixed, named scale, one step larger than the comps.
- **Choice:** (c). `FMType` in `src/constants/theme.ts`:
  - `micro` 11: only uppercase eyebrow labels and chart ticks.
  - `caption` 12: timestamps, hints, meta lines.
  - `small` 13: secondary text, chips.
  - `body` 14: body text, row titles.
  - `bodyLg` 15: emphasized text, desktop inputs.
  - `subhead` 16: card titles, mobile inputs.
  - `title` 17, `heading` 18, `h2` 20, `h1` 22: headings.
  - Hero numbers (24px and up) stay as literal values.
- **Why:**
  - Body text reaches 14px and secondary text 13px while keeping the dense, data-focused look the user likes.
  - Mobile inputs at 16px avoid iOS Safari zooming in when an input is focused.
  - Future tuning is one edit in one place.

### 2.2 How the new sizes were applied
- **Options:**
  - (a) Hand-edit about 600 values.
  - (b) Regex search-and-replace.
  - (c) A codemod that parses the TypeScript (AST).
- **Choice:** (c). About 560 `fontSize` literals in 82 files were moved onto the tokens.
- **Why:**
  - The codemod can see the other style properties next to each `fontSize`. So uppercase or tracked labels were bumped less, matching `lineHeight` values were rescaled, and imports were added safely.
  - The result is named tokens rather than new hard-coded numbers.
  - Layouts that broke were then fixed by hand.

### 2.3 Contrast
- **Options:**
  - (a) Fix colours one usage at a time.
  - (b) Fix the palette tokens.
- **Choice:** (b).
  - `inkMuted` and `warn` were fixed in every palette where they failed, all computed to at least 4.5:1 (WCAG AA). Purple light's muted text went from 2.2:1 to 5.1:1.
  - New `onAccent` token for text on accent-coloured fills.
- **Why:**
  - Muted text is used in hundreds of places, so a token fix covers all of them at once.
  - White text on the green palette's lime accent fails contrast, so hard-coded white on accent could never be correct.

### 2.4 Keep separate desktop/mobile components, or merge them?
- **Options:**
  - (a) Merge each pair into one responsive component.
  - (b) Keep the split, fix each variant, and share genuinely common pieces.
- **Choice:** (b). New shared pieces: `IconButton`, `DebtEntryRow`.
- **Why:**
  - The layouts really differ (e.g. a table on desktop vs. list rows on mobile).
  - Merging is a large, risky refactor and was out of proportion to "fix readability and polish".

### 2.5 Narrow desktop windows (955–1280px)
- **Options:**
  - (a) Switch to the mobile layout at a wider width.
  - (b) Let desktop grids and headers wrap.
- **Choice:** (b).
  - The dashboard grid becomes a single column below a 1280px window.
  - Account-detail headers wrap, which fixes the balance being covered by the action buttons.
- **Why:** Fixes the broken range without changing when the app switches to the mobile layout.

### 2.6 Alerts and confirmations on web
- **Context:** `Alert.alert` from React Native shows nothing in the browser. That affected about 20 call sites, including delete confirmations.
- **Options:**
  - (a) A custom in-app confirmation dialog.
  - (b) Extend `showAlert` to take the same arguments as `Alert.alert` and fall back to `window.alert` / `window.confirm` on web.
- **Choice:** (b).
- **Why:**
  - Every call site migrates with a mechanical rename, and the behaviour is predictable.
  - A themed in-app confirmation dialog is a possible later improvement.

### 2.7 Quick-Add actions
- **Context:** Every Quick-Add item only navigated to the Accounts screen.
- **Choice:** Deep links using `?qa=…`:
  - "Add transaction" and "Import statement" open their modals on the main account, or on Cash at Hand when the main account isn't a manual account.
  - "Manual account" and "Edit cash" open their modals on Accounts.
- **Why:** These are the only targets that can always accept a manual entry. Connected bank accounts are read-only.

---

## 3. Code-quality pass

### 3.1 Avoiding the settings flash at startup
- **Context:** Theme and language showed their defaults (light/German) until `SettingsContext` finished reading storage.
- **Options:**
  - (a) Render nothing inside `SettingsProvider` until it has loaded.
  - (b) Keep the other providers mounting (they load in parallel), but have `RootLayoutInner` return `null` and keep the Expo splash screen up until `isLoaded`.
- **Choice:** (b). `SettingsContext` exposes `isLoaded`, and `SplashScreen.hideAsync()` moved from "fonts loaded" to "settings loaded" (fonts already gate `RootLayout`).
- **Why:**
  - This is the standard Expo pattern.
  - Data loading isn't serialised behind settings.
  - With web static output the server and client both render `null` first, so there's no hydration mismatch.

### 3.2 Cleaning up when a manual account is deleted
- **Context:** Deleting an account left its category assignments, links and statements (with their PDFs) behind. `AccountsContext` also removed transaction storage, which belongs to another context.
- **Options:**
  - (a) Do everything inside `AccountsContext`. It sits above the other providers, so it can't call them.
  - (b) An orchestrating hook calls each owning context in turn.
- **Choice:** (b). `useAccountTransactions().handleDeleteAccount` calls, in order:
  1. `purgeAccountTransactions`, which returns the removed ids.
  2. `bulkAssignCategories(ids → null)`.
  3. `removeLinksFor(ids)`.
  4. `deleteStatementsForAccount`.
  5. `deleteManualAccount`.
- **Child transactions in other accounts:** "pay from account" children stored in another account keep their transaction and their Ignore category. Only the link and the auto-created marker are dropped, because the money really did leave that pot.

### 3.3 Where the account balance and sessions live
- **Context:** `TransactionsContext` wrote `manual_accounts` directly, then triggered a full `refreshAccounts()` (a network refetch of every bank balance). `useBankConnections` read and wrote `enablebanking_sessions` itself. Both domains belong to `AccountsContext`.
- **Choice:**
  - `AccountsContext.adjustManualBalance` handles balances, rounded to cents and read from storage, so back-to-back changes add up correctly.
  - `AccountsContext` also owns `sessions`, `saveSession` and `removeSession`.
- **Why:**
  - Each storage domain now has one owner, as CLAUDE.md requires.
  - Adding or editing a transaction no longer refetches every bank balance.

### 3.4 Failed PDF imports
- **Choice:** `importBankStatement` now throws on storage failure instead of returning "0 imported". The import queue marks the item as failed and shows the error. The CSV path (`handleImportBankStatement`) shows an error alert and returns `null`, and the "Imported N" message counts the rows actually imported, after dedupe.

### 3.5 "DD.MM." dates without a year (generic German parser)
- **Context:** Many banks print the transaction table without a year.
- **Rule:**
  - With a statement period ("vom 15.12.2025 bis 14.01.2026"), use whichever of the end year or the year before puts the date inside the period (±7 days for value-date slack). This handles statements that span New Year.
  - Without a period, use the latest full date in the document. A row whose date would fall after it (beyond the slack) gets the previous year.
  - If no full date exists at all, use the current year and show a parse warning.

### 3.6 Bank redirect landing in the main window
- **Context:** The bank always redirects to the app root. Only the connections screen handles the `?code=`, and the redirect was only handled when it arrived in a popup.
- **Choice:**
  - When the redirect arrives in the main window (no `window.opener`), `RootLayoutInner` routes to `/connections`, and `useBankConnections` reads the code from `Linking.getInitialURL()`.
  - Handled codes are now remembered in a module-level set, so remounting the screen doesn't resubmit an already used code.

### 3.7 Account names stored in English
- **Context:** The cash account is created as "Cash at Hand" and manual accounts store bank names like "Manual Account". Both showed in English in the German UI.
- **Choice:** Translate when displaying, through `accountDisplayName` and `accountBankLabel` in `accounts/utils/accountDisplay.ts`. Stored data is unchanged, and a name the user changed themselves is shown as typed.
- **Why:** Rewriting the stored names would make them stick to whichever language was active at the time.

### 3.8 Translations: one key per meaning, German required
- **Context:** `Strings.ts` had 241 English-only keys. They couldn't be used, because `i18n` is typed from the German block.
- **Choice:**
  - Fill in German for those keys rather than inventing duplicates.
  - Merge new keys through a locked script, so parallel workers couldn't overwrite each other.
  - Type the `i18n` props as `typeof Strings.de`, so a missing key fails `tsc` instead of silently showing English.
  - Delete the 73 keys nothing uses.

---

## 4. Round 2 — features

### 4.1 How far back to ask the bank API
- **Context:** The user wants to pick ranges of any length (e.g. 2 years), because imported statements reach further back than the bank API. Enable Banking publishes no per-bank history limit; PSD2 banks must serve 90 days without a fresh SCA, and many reject older `date_from` with a 422 (`WRONG_TRANSACTIONS_PERIOD`). Previously a long range produced an error alert and showed only the cache.
- **Options:**
  - (a) Always clamp the API request to the last 90 days.
  - (b) Ask for the full range first; on a range rejection, remember that the account is limited (for this app session) and retry from the 90-day window start.
  - (c) Use Enable Banking's `strategy=longest`.
- **Choice:** (b) (`utils/bankWindow.ts`, `TransactionsContext.loadConnectedAccount`). Range rejections are silent; a hint ("Bank data from <date> · import statements for older data", `RangeCoverageHint`) replaces the alert, and the date picker says how far bank data reaches.
- **Why:**
  - Some banks serve more history right after consent; (a) would never use it.
  - The cost of (b) is one rejected request per account and app session.
  - (c) ignores `date_to`, may page through years of data on every load, and isn't documented per bank.

### 4.2 Matching statement rows with bank rows
- **Context:** Statements and the API describe the same booking with different ids, titles and sometimes booking vs. value date. The old import rule skipped every statement row on any date that already had a transaction. That dropped real rows on manual accounts and didn't catch the API later fetching bookings that a statement had already imported (duplicates).
- **Options:**
  - (a) Keep the per-date rule.
  - (b) Fuzzy one-to-one matching: same signed amount in cents, and the same day, ±1 day, or ±3 days with a shared counterparty word (`utils/dedupe.ts`). Used at import time (skip the duplicate) and when API rows are merged into the cache (the API row replaces the statement row).
- **Choice:** (b). When an API row replaces a statement row, its category and links move to the new id (`TxIdChange` events: categories directly, links via `subscribeTxIdChanges`).
- **Why:** Works the same for every source. Two genuinely equal bookings (two 3.50 € coffees on one day) stay separate because matching is one-to-one. Moving categories and links means a refresh never loses the user's work.

### 4.3 Where links are resolved
- **Context:** Stats resolved reimbursement amounts against the list they were given: the dashboard's main account, or the open account, limited to the date range. A friend paying back into another account, or a few days after the range ended, didn't reduce the expense.
- **Choice:** `TransactionsContext` keeps the full stored history (`storedByAccount`; the date-filtered `transactionsByAccount` is derived from it). `TransactionLinksContext.linkIndex` resolves links against every stored transaction. All totals use one helper, `statAmountFor` (`utils/links.ts`):
  - Every linked child is excluded. A reimbursement isn't income, and a "pay from account" payment only moves money between the user's own pots (§1.8 unchanged).
  - A reimbursed expense counts at its net share, `max(0, paid − reimbursed)`.
  - Dashboard totals, account stats, flow series, budgets, recurring-spend detection and list subtotals all use this helper.
- **Over-reimbursement:** the net is capped at 0 and the surplus is shown as a hint but never counted as income. Counting it would turn a shared expense into "income" and break the budget view.

### 4.4 Self-transfers in AI categorization
- **Choice:** A deterministic pre-pass (`utils/selfTransfer.ts`) sends a transaction to Ignore before the AI is called when:
  - the counterparty IBAN is one of the user's own account IBANs;
  - creditor and debtor are the same name;
  - the counterparty is the account holder (from Enable Banking's account `name`, compared as an order-insensitive word set);
  - the text says "Umbuchung", "Übertrag", "Eigenübertrag" or similar.
  The prompt also gets the holder names and account names, plus an explicit rule that overrides the income/expense rule.
- **Why not send IBANs to the AI:** IBAN matching is exact, so the code does it better. Leaving IBANs out of the prompt keeps them out of third-party requests and saves tokens.
- **Single-word names** ("Max") are never treated as the holder, because that is too likely to be a different person.

---

## 5. Round 2 — Material redesign

### 5.1 Material 3 through our own design system, not a UI library
- **Context:** The user asked for a more coherent, "Google-like" look (Material UI: rounded buttons, less text). The app already has its own token set (`src/constants/theme.ts`) and primitives (`src/shared/design`) used by every screen, with five palettes in light and dark.
- **Options:**
  - (a) Adopt react-native-paper (M3 components for React Native) or MUI (web only).
  - (b) Implement the M3 rules (colour roles, shape scale, type roles, state layers, component anatomy) inside the existing design system.
- **Choice:** (b).
- **Why:**
  - MUI doesn't run on iOS/Android. Paper would mean rewriting about 80 screen and modal files against a second theming system that knows nothing about our palettes.
  - With (b), restyling `Button`, `Chip`, `Sheet`, `Field` and the shells changes every screen at once, and the palettes keep working.
  - The new primitives (`Card`, `ListItem`, `Avatar`, `SegmentedButtons`, `Fab`, `EmptyState`, `Switch`) follow the M3 specs, so screens get the M3 look without a dependency.

### 5.2 Generating M3 colour roles from the existing palettes
- **Context:** M3 needs about 30 tonal roles per scheme (primary/onPrimary/primaryContainer…, surfaceContainerLowest…Highest, outline/outlineVariant, error…). The old palettes had 18 hand-picked colours each, some with alpha.
- **Options:**
  - (a) Hand-pick the new roles for 10 schemes.
  - (b) Generate them with Google's HCT tonal system (`@material/material-color-utilities`) at runtime.
  - (c) Generate them once with HCT in a script and bake the hex values into `theme.ts`.
- **Choice:** (c).
  - Primary, secondary and tertiary palettes come from each palette's seed colour. Red and turquoise use their former second colour as the tertiary seed.
  - Neutral surfaces take the hue of the palette's old background (chroma 4–10), so turquoise keeps its warm sand surfaces and green keeps its cream.
  - pos/neg/warn are fixed green/red/amber hues harmonized toward the seed (M3 custom colours), so money colours always read the same.
- **Why:**
  - These are the exact tones M3 itself would produce, and nothing changes at runtime.
  - Every text/background pair was then checked by script. All 10 schemes pass AA (≥ 4.5:1 for text; outline ≥ 3:1). The lowest pair is 4.63:1.
- **Naming:** The old semantic names (`bg`, `surface`, `ink`, `accent`, `pos`…) stay as aliases pointing at M3 tones, next to the real M3 role names. `bg` is the M3 surface; `surface` stays the card colour. Renaming `surface` would have broken every screen, including the ones the features agent was editing at the same time.

### 5.3 Typography: Google Sans Flex
- **Options:**
  - (a) Keep Geist.
  - (b) Roboto or Inter.
  - (c) Google Sans (static, full script coverage).
  - (d) Google Sans Flex (static 400/500/600/700 instances).
- **Choice:** (d). Hero numbers use weight 400 (M3 display style). All money keeps `tabular-nums`.
- **Why:**
  - Google Sans Flex is the face of current Material 3 products: the most "Google-like" option, and OFL-licensed.
  - Each weight is 132 KB, against 2 MB for Google Sans (c).
  - It ships the `tnum` feature, which was verified with fontTools, so amount columns still line up.
- **Type scale:** The `FMType` sizes from §2.1 stay, so layouts don't shift. New `FMTypeRole` exposes the M3 roles (display/headline/title/body/label), with body ≥ 14 and only bodySmall/labels at 11–12.

### 5.4 Icons: Material Design Icons font
- **Context:** The custom 16px single-stroke SVG icons looked nothing like Material.
- **Options:**
  - (a) Keep the SVGs.
  - (b) Material Icons from `@expo/vector-icons` (filled only).
  - (c) Material Design Icons from `@expo/vector-icons` (outlined and filled pairs).
- **Choice:** (c), behind the same `IconX` names. A new `filled` prop gives the active navigation destination its filled icon, as M3 prescribes.
- **Why:**
  - No call sites had to change.
  - The library is already a dependency.
  - Outlined/filled pairs match how M3 marks the selected destination.
  - The font is preloaded with the app fonts, so icons don't flash on web.

### 5.5 Shape, text fields and dialogs
- **Choice:**
  - `FMRadius`: buttons, segmented buttons and nav indicators are fully rounded; chips 8; cards 16; dialogs and bottom sheets 28.
  - Text fields are M3 outlined fields with corner 4 and a 2dp primary outline on focus. The label sits above the field instead of floating.
  - Dialogs use the card colour (`surface`) rather than `surfaceContainerHigh`.
- **Why:**
  - A floating label is fiddly to do well in React Native for web. A label above the field is the M3 web pattern and stays readable.
  - With the card colour, nested fills (`surfaceAlt`, inputs) keep the contrast they were designed with in both modes. With `surfaceContainerHigh` they would vanish in dark mode.

### 5.6 Navigation: rail + top app bar on desktop, navigation bar + FAB on mobile
- **Context:**
  - Desktop had a hover-expanding sidebar, a breadcrumb bar, three chips (Search / Quick add / Refresh) and a separate big page header in every screen.
  - Mobile had a centre "+" in the tab bar.
- **Choice:**
  - **Desktop:** an M3 navigation rail (logo, quick-add FAB, five destinations with pill indicators, settings at the bottom). The top app bar holds the page title, an optional back arrow, a search bar, refresh and the screen's actions. Screens pass `title`/`actions`/`onBack` to `DesktopShell` instead of drawing their own header.
  - **Mobile:** an M3 navigation bar (4 destinations, 64×32 indicator) with the quick-add FAB floating above it at the bottom right. Small top app bars have the back arrow inline.
- **Why:**
  - Desktop and mobile now share one page structure: top bar, then content in cards.
  - The breadcrumb was redundant with the rail highlight and the title.
  - A permanent rail avoids the hover-to-discover sidebar.

### 5.7 State layers without CSS overlays
- **Choice:** `stateColor(container, content, state)` mixes the content colour into the container at the M3 opacities (hover 8%, pressed 10%). It uses the `hovered` flag that react-native-web passes to `Pressable` style functions.
- **Why:** React Native has no `::before` overlay, and an extra absolutely positioned view per pressable would cost layout on long lists. Mixing the colours gives the same pixels.

### 5.8 How a reimbursed expense is shown
- **Context:** An expense of −70 € with two +25 € reimbursements linked must clearly show that 70 € was paid, 50 € came back and the user's share is −20 €. The user asked for this to be polished and to need little text.
- **Options:**
  - (a) Three lines: paid / reimbursed / your share.
  - (b) The share as the headline number, one bar for the split, a two-item legend.
- **Choice:** (b), in `TransactionLinkPanel`.
  - The headline "Your share −20,00 €" sits in a tonal block.
  - Below it is an 8dp bar. The neg-coloured part is the share; the pos-coloured part is what was reimbursed.
  - The legend reads "● Reimbursed +50,00 €" and "Paid −70,00 €".
  - Linked transactions are list rows (avatar, date · account, amount, unlink icon button) in a tonal group.
  - Actions are a tonal "Add reimbursement" and a text "Pay from account".
  - The picker is an M3 search bar plus full-bleed rows with M3 checkboxes (radios when one expense is picked). Suggestions are marked with a sparkle, and a live "Your share" preview appears above the actions.
  - List rows keep the compact struck-through original + "+50 € back" badge. The detail views drop it, because the panel already says it.
- **Why:** The number that matters (what it really cost) is read first, and the bar explains the arithmetic without a sentence. The rules in `utils/links.ts` are unchanged.

### 5.9 Duplicate mobile modals and unused strings
- **Choice:**
  - The mobile-only copies of `AddDebtModal`, `DebtDetailModal` and `ManagePeopleModal` were removed. Both layouts use one implementation, since `Sheet` already switches between dialog and bottom sheet.
  - After the text cuts, 80 Strings keys no longer used anywhere were deleted from both languages. English and German keep identical key sets (417 keys).
- **Why:** One component per dialog keeps desktop and mobile identical, which is the coherence the user asked for. Dead keys make it look as if the removed text is still shown somewhere.

---

## 6. Local AI (Ollama)

### 6.1 Ollama as a third provider, called from the app
- **Context:** The user runs Ollama locally (`qwen3.5:9b` on an 8 GB RTX 5060) and wants categorization without a cloud key. Ollama's CORS default allows `http://localhost:*`, so the web app can call it directly.
- **Options:**
  - (a) Proxy Ollama through the Express backend.
  - (b) Call `{ollamaUrl}/api/chat` from the app, like Gemini and Claude.
- **Choice:** (b). `AiProvider` is now `"gemini" | "claude" | "ollama"` and is defined once in `aiProviders.ts` (SettingsContext re-exports it). `callAiProvider` takes an `AiConfig` (provider, keys, Ollama URL and model) from `useSettings().aiConfig`; `aiApiKeyFor()` is the single "is a key missing?" check, and it never reports a missing key for Ollama.
- **Why:** The backend runs on Vercel and can't reach a model on the user's PC. Calling directly keeps the data on the machine.
- **Request:** `stream: false`, `think: false` (Qwen's reasoning is slow and adds nothing for classification), `temperature: 0`, and `format` set to a JSON schema. The categorization schema (`buildCategorizeSchema`) requires exactly the batch's transaction ids as keys, each a string or null, so the model can't skip ids, invent keys or add prose. Budget suggestions use a `{ suggestions: [...] }` schema, which the parser already accepted.
- **Errors:** a refused connection or CORS block becomes "Ollama isn't reachable. Is it running?"; a 404 becomes "Model X isn't installed. Run: ollama pull X". Both are localized. The timeout is 120 s, because a cold model load took about 37 s.

### 6.2 Context window and batch size
- **Measured** with the app's own prompt builder and realistic German rows (long statement ids, MCC, bank codes): 25 transactions = 3,750 prompt + 919 answer tokens, about 20 s warm; 50 transactions = 5,895 + 1,844 tokens, about 41 s.
- **num_ctx:** 16,384 didn't fit next to the desktop in 8 GB (`ollama ps`: 12 % CPU / 88 % GPU). 12,288 and 8,192 both ran 100 % on the GPU. **Choice: 8,192.** It leaves VRAM headroom for the browser and desktop, and a 25-row batch uses about 4.7k of it.
- **Batch size:** 50 stays for the cloud providers. **Ollama uses 25** (`aiBatchSize`), because 50 rows (~7.7k tokens) would sit at the edge of 8k with longer references. Smaller batches also update the new progress bar ("12 / 40") every ~20 s instead of ~40 s.

### 6.3 Defaults and settings
- **Defaults:** URL `http://localhost:11434`, model `qwen3.5:9b` (the model that is installed and tested). `qwen3.5:4b` would load faster and use less VRAM but wasn't installed, so it wasn't measured.
- **Settings UI:** The provider is a three-way segmented button (Gemini / Claude / Local). Only the selected provider's row is shown. For Local, the row shows the model and a live status ("Connected · model ready", or the error) with a check or warning icon. The row opens a dialog with the model field, the installed models (from `/api/tags`) as chips, the server URL, and a Test button.
- **Phones:** On iOS/Android "localhost" is the phone itself. Only there does the URL field show a hint to use the PC's LAN address and to start Ollama with `OLLAMA_HOST=0.0.0.0`. The user's systemd service was not changed.

### 6.4 Income categories named "Gehalt"
- **Context:** In testing, the model correctly picked the user's existing "Gehalt" category for a salary. The resolver only treated "Einkommen"/"Income" as income, so it overrode the choice and created a second "Einkommen" category. This affected every provider.
- **Choice:** `isIncomeName` also recognises Gehalt, Lohn, Einnahmen, Einkünfte, Salary, Wages, Earnings and Revenue as whole words ("Lohnsteuer" doesn't match). A positive amount keeps an existing income-named category. A *new* name for a positive amount still goes to the one income category (or a new localized "Einkommen"), so the AI can't add a "Salary" next to "Gehalt".
- **Also:** income categories are no longer offered in the monthly budget editor or to the budget AI. Existing budget items are sent with the budget prompt, so the model stops re-suggesting "DB 49 €" next to an existing "Bahn 49 €".

### 6.5 Result
- **Script test** (app prompt builder + `callOllama` + `resolveAiAssignments`, 16 German rows): 16/16 correct, with the self-transfer pre-pass off. That covers PayPal→Spotify, REWE with MCC, salary, two self-transfers to the holder, DB ticket, Amazon, rent, café, a friend's payment, a payback, fuel, Netflix, utilities, a Trade Republic savings plan and dm. Cold run: 10.1 s. With the pre-pass on, 14 rows went to the AI and took 4.3 s warm.
- **UI test:** "Re-categorize all" on the test Girokonto: 7/7 correct in 9.7 s, with "Gehalt" kept. Budget suggestions: before the 6.4 change, 11 items in 5.1 s, several duplicating existing ones. After it, 3 items in 7.1 s (rent 890 €, Netflix, Spotify), exactly the recurring costs that had no budget yet.

## 7. On-device AI in the browser (WebGPU)

### 7.1 Why the deployed site can't use Ollama, and what it does instead
- **Context:** A visitor of the deployed site has no Ollama, and a website can't install software. The request was: check whether the visitor's computer can run the local model; if they agree, download it to their PC; offer only the large model, and otherwise say plainly that it isn't possible.
- **Choice:** A fourth provider, `"browser"`: **Qwen 3.5 9B (`Qwen3.5-9B-q4f16_1-MLC`) running in the browser through WebLLM 0.2.86 on WebGPU**. It's the same model as the Ollama default. The weights (5.06 GB) come from Hugging Face and the GPU kernels from the MLC GitHub repo. They're stored in the browser's Cache Storage after an explicit consent dialog, so nothing goes through our backend or Vercel. Transactions never leave the device.
- **Only the 9B model.** Measured with the app's prompt on 16 German rows via Ollama: 9B 14/14 (16/16 without the self-transfer pre-pass), 4B 11/14, 2B 10/14, 0.8B 7/14. Below 9B, categories are wrong too often, so smaller devices are told "not possible on this device" instead of getting a worse model.
- **Ollama stays** as an advanced option ("Use Ollama instead" switch under Local, web only). On iOS/Android, Local still means Ollama; the in-browser model needs WebGPU, so `browserAi.ts` is a native stub and WebLLM is never bundled there.

### 7.2 Deciding whether a device can run it
- **Browsers don't reveal VRAM.** I tried allocating the model's size in GPU buffers first. On an 8 GB RTX 5060, Chrome "successfully" allocated 12 GiB while `nvidia-smi` showed 388 MiB in use: allocations spill into system RAM instead of failing, and Windows/WDDM does the same. A model that doesn't fit becomes unusably slow or loses the device; it doesn't fail cleanly. So the allocation probe was dropped.
- **Before the download** (cheap and reliable): HTTPS + WebGPU present → a real GPU adapter (not the SwiftShader fallback) → `shader-f16` support (the q4f16 build needs it) → `navigator.deviceMemory` ≥ 8 GB → ≥ 5.5 GB free browser storage. Any failure shows "Not possible on this device" with the reason, and no download is offered. The adapter checked is "high-performance", because WebLLM always uses that one.
- **After the download**, a short speed test on the real model extrapolates the time for a 25-row batch (~3,000 prompt + ~600 answer tokens). If the GPU is lost, it runs out of memory, or a batch would take > 150 s, the device is "not possible". The 5 GB are deleted again automatically, and the verdict is remembered for this GPU + model in `localStorage` (`browser_ai_verdict`), so the download isn't offered again. A different GPU gets tested afresh. The consent dialog says all of this before the download starts.
- **Context window:** 8,192 (WebLLM's default for this build is 4,096), the same as Ollama, so the batch size stays 25. Qwen 3.5 attends in full on only a quarter of its layers, so the extra context costs little memory.

### 7.3 Runtime details
- WebLLM (6.2 MB minified) is loaded with `import()` only when the option is used. The web export puts it in its own chunk; the entry bundle only references it.
- Requests use `response_format: json_object` with the same JSON schema as Ollama (WebLLM requires a schema string even for "any JSON") and `enable_thinking: false`. Requests are queued one at a time and the chat is reset after each, so batches don't carry earlier context. The model is unloaded from the GPU after 5 minutes idle.
- The engine runs on the main thread (not a Web Worker): Metro has no worker bundling, and the work is GPU-bound, so the UI stays responsive apart from short hitches while loading.

### 7.4 Test results on this machine
Laptop with an RTX 5060 (8 GB) and an AMD Radeon 780M, Chrome 155 on Linux. Tested in a separate, throwaway Chrome profile driven over the DevTools protocol, running the real `browserAi.web.ts` plus the app's prompt builder and parser. The real-data origin wasn't touched.
- **Normal Chrome on Linux:** WebGPU gives no adapter (Chrome keeps it off on Linux), so the app correctly reports "not possible" with that reason.
- **Chrome with WebGPU enabled:** the high-performance adapter (RTX 5060 via Vulkan) has **no `shader-f16`**, so the result is "not possible: no_f16". Windows (D3D12) and macOS (Metal) normally expose f16 on such GPUs.
- **Radeon 780M (integrated, has f16), forced in the test only:** the download took 5.5 min (5.06 GB). The model loaded, then the **GPU device was lost on the first answer**. The app reported "not possible (memory)", deleted the files and stored the verdict. After a reload the device stays "not possible", while a different GPU id is offered the test again.
- **Answer quality and speed, test only:** I ran WebLLM's `q4f32` build of the same 9B model on the RTX 5060 (no f16 needed; 7.6 GB VRAM). It got **13/14 and 14/16** (misses: dm → leisure, Amazon → subscriptions), in the same class as 9B via Ollama. One 14–16-row batch took **41–43 s** (2,150–2,235 prompt tokens, prefill ~70 tok/s, decode ~16 tok/s). That is roughly 10× slower than Ollama on the same GPU, but usable.
- **Speed-test calibration:** the first version underestimated prefill (short prompt, no warm-up) and overestimated the answer length. The fixed version (warm-up + ~1,300-token test prompt, ~11 answer tokens per row) estimated 45 s for the 16-row batch that really took 43 s. On the RTX 5060 (f32 build) a 25-row batch is estimated at ~67 s, well within the 150 s limit.
- **Not verified:** the shipped `q4f16` build on a GPU that exposes f16, because none was available here. It uses the same request code and should be faster than the f32 run.
