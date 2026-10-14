import { useCallback, useMemo, useState } from "react";
import {
  CASH_ACCOUNT_ID,
  useAccounts,
  type AccountCategory,
  type ManualAccount,
} from "../context/AccountsContext";
import { useSettings } from "../../../shared/context/SettingsContext";
import { parseLocaleNumber, roundCents } from "../../../shared/utils/number";

export function useAccountsScreen() {
  const {
    accounts,
    cashBalance,
    isLoading: initialLoading,
    isRefreshing,
    refreshAccounts,
    updateCashBalance,
    addManualAccount,
  } = useAccounts();
  const { isBalanceHidden, i18n, language } = useSettings();

  // Cash Edit Modal State
  const [isCashModalVisible, setCashModalVisible] = useState(false);
  const [tempCashValue, setTempCashValue] = useState("");

  // Add Manual Account Modal State
  const [isAddAccountModalVisible, setAddAccountModalVisible] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountBalance, setNewAccountBalance] = useState("");
  const [newAccountCategory, setNewAccountCategory] =
    useState<AccountCategory>("Giro");

  const handleSaveCash = () => {
    const amount = roundCents(parseLocaleNumber(tempCashValue));
    if (!isNaN(amount)) {
      updateCashBalance(amount);
    }
    setCashModalVisible(false);
  };

  const openCashModal = () => {
    // Two decimals, decimal comma in German (parseLocaleNumber reads both).
    const fixed = cashBalance.toFixed(2);
    setTempCashValue(language === "de" ? fixed.replace(".", ",") : fixed);
    setCashModalVisible(true);
  };

  const handleAddManualAccount = async () => {
    try {
      const newAccount: ManualAccount = {
        id: `manual_${Date.now()}`,
        name: newAccountName.trim() || i18n.acct_default_name,
        // "1.234,56" used to parse as 1.234; garbage input as NaN.
        balance: newAccountBalance.trim()
          ? roundCents(parseLocaleNumber(newAccountBalance)) || 0
          : 0,
        category: newAccountCategory,
        currency: "EUR",
        bankName: "Manual",
      };

      await addManualAccount(newAccount);

      setAddAccountModalVisible(false);
      setNewAccountName("");
      setNewAccountBalance("");
    } catch (err) {
      console.error("Failed to add manual account:", err);
    }
  };

  const onRefresh = useCallback(async () => {
    await refreshAccounts();
  }, [refreshAccounts]);

  // The cash account is itself a manual account in `accounts`, so exclude it
  // here — otherwise net worth (bank + cash) counted cash twice and the
  // "Bank" figure included cash.
  const totalBankBalance = useMemo(
    () =>
      accounts.reduce(
        (sum, acc) => (acc.id === CASH_ACCOUNT_ID ? sum : sum + (acc.balance || 0)),
        0,
      ),
    [accounts],
  );

  const totalNetWorth = totalBankBalance + cashBalance;

  return {
    accounts,
    cashBalance,
    initialLoading,
    isRefreshing,
    refreshAccounts,
    isBalanceHidden,
    i18n,
    isCashModalVisible,
    setCashModalVisible,
    tempCashValue,
    setTempCashValue,
    isAddAccountModalVisible,
    setAddAccountModalVisible,
    newAccountName,
    setNewAccountName,
    newAccountBalance,
    setNewAccountBalance,
    newAccountCategory,
    setNewAccountCategory,
    handleSaveCash,
    openCashModal,
    handleAddManualAccount,
    onRefresh,
    totalBankBalance,
    totalNetWorth,
  };
}
