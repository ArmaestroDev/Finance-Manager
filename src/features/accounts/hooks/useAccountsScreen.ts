import { useCallback, useEffect, useState } from "react";
import {
  useAccounts,
  type AccountCategory,
  type ManualAccount,
  type UnifiedAccount,
} from "../context/AccountsContext";
import { useSettings } from "../../../shared/context/SettingsContext";

export interface SectionData {
  title: AccountCategory;
  data: UnifiedAccount[];
}

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
  const { isBalanceHidden, i18n } = useSettings();

  const [sections, setSections] = useState<SectionData[]>([]);

  // Cash Edit Modal State
  const [isCashModalVisible, setCashModalVisible] = useState(false);
  const [tempCashValue, setTempCashValue] = useState("");

  // Add Manual Account Modal State
  const [isAddAccountModalVisible, setAddAccountModalVisible] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountBalance, setNewAccountBalance] = useState("");
  const [newAccountCategory, setNewAccountCategory] =
    useState<AccountCategory>("Giro");

  // Group accounts whenever 'accounts' changes
  useEffect(() => {
    groupAndSetSections(accounts);
  }, [accounts]);

  const groupAndSetSections = (accountsList: UnifiedAccount[]) => {
    const grouped: Record<AccountCategory, UnifiedAccount[]> = {
      Giro: [],
      Savings: [],
      Stock: [],
    };

    accountsList.forEach((acc) => {
      const category = acc.category || "Giro";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(acc);
    });

    const sectionsData: SectionData[] = [
      { title: i18n.cat_giro as AccountCategory, data: grouped.Giro },
      { title: i18n.cat_savings as AccountCategory, data: grouped.Savings },
      { title: i18n.cat_stock as AccountCategory, data: grouped.Stock },
    ].filter((section) => section.data.length > 0);

    setSections(sectionsData);
  };

  const handleSaveCash = () => {
    const amount = parseFloat(tempCashValue.replace(",", "."));
    if (!isNaN(amount)) {
      updateCashBalance(amount);
    }
    setCashModalVisible(false);
  };

  const openCashModal = () => {
    setTempCashValue(cashBalance.toString());
    setCashModalVisible(true);
  };

  const handleAddManualAccount = async () => {
    try {
      const newAccount: ManualAccount = {
        id: `manual_${Date.now()}`,
        name: newAccountName || "New Account",
        balance: parseFloat(newAccountBalance.replace(",", ".") || "0"),
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

  const formatAmount = (amount: number | string, currency: string = "EUR") => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: currency,
    }).format(num);
  };

  // Calculate Totals
  const totalBankBalance = sections.reduce(
    (sum, section) =>
      sum + section.data.reduce((s, acc) => s + (acc.balance || 0), 0),
    0,
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
    sections,
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
    formatAmount,
    totalBankBalance,
    totalNetWorth,
  };
}
