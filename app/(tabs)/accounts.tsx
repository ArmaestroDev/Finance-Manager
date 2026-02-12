import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import {
  useAccounts,
// ... (imports)

// ...

// ... inside AccountsScreen component ...

  // Update SectionList header or container to include Refresh button
  // Modify the renderSectionHeader function OR add a header outside the list?
  // Actually, adding it as a header outside the SectionList is easier but might push list down.
  // Let's add it to the Main Header (title area).

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* ... (Modals omitted) ... */}

      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: textColor }]}>
            {i18n.accounts_title}
          </Text>
          <Text style={[styles.subtitle, { color: textColor, opacity: 0.6 }]}>
            {i18n.accounts_subtitle}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => refreshAccounts()}
          disabled={isRefreshing}
          style={[styles.refreshButton, { backgroundColor: tintColor + "20" }]}
        >
           {isRefreshing ? (
              <ActivityIndicator size="small" color={tintColor} />
            ) : (
              <Ionicons name="refresh" size={24} color={tintColor} />
            )}
        </TouchableOpacity>
      </View>

      <SectionList
        // ... props ...
        ListHeaderComponent={SummaryHeader}
        refreshControl={
           // Keep refresh control for native feel where supported
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={tintColor}
          />
        }
        // ... props ...
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // ... container etc ...
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
  },
  // ... existing styles ...
});
import {
  useAccounts,
  type AccountCategory,
  type ManualAccount,
  type UnifiedAccount,
} from "../../context/AccountsContext";
import { useSettings } from "../../context/SettingsContext";
import { useThemeColor } from "../../hooks/use-theme-color";

interface SectionData {
  title: AccountCategory;
  data: UnifiedAccount[];
}

export default function AccountsScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const router = useRouter();
  const { isBalanceHidden, i18n } = useSettings();

  // Use Global Context
  const {
    accounts,
    cashBalance,
    isLoading: initialLoading,
    isRefreshing,
    refreshAccounts,
    updateCashBalance,
    addManualAccount,
  } = useAccounts();

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

  const renderAccount = ({ item }: { item: UnifiedAccount }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/account/[id]",
            params: {
              id: item.id,
              name: item.name,
              type: item.type, // Pass type to detail screen
            },
          })
        }
      >
        <View
          style={[styles.accountCard, { backgroundColor: tintColor + "12" }]}
        >
          <View style={styles.accountHeader}>
            <View style={styles.accountInfo}>
              <Text style={[styles.bankLabel, { color: tintColor }]}>
                {item.type === "manual" ? "👤" : "🏦"} {item.bankName}
              </Text>
              <Text style={[styles.accountName, { color: textColor }]}>
                {item.name}
              </Text>
              {item.iban && (
                <Text style={[styles.iban, { color: textColor, opacity: 0.5 }]}>
                  {item.iban}
                </Text>
              )}
            </View>

            <View style={styles.balanceContainer}>
              {item.loading ? (
                <ActivityIndicator size="small" color={tintColor} />
              ) : item.error ? (
                <Text style={[styles.errorText, { color: "#FF6B6B" }]}>
                  Error
                </Text>
              ) : (
                <>
                  <Text style={[styles.balanceAmount, { color: textColor }]}>
                    {isBalanceHidden
                      ? "*****"
                      : formatAmount(item.balance, item.currency)}
                  </Text>
                  <Text
                    style={[
                      styles.balanceLabel,
                      { color: textColor, opacity: 0.5 },
                    ]}
                  >
                    Balance
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({
    section: { title },
  }: {
    section: SectionData;
  }) => (
    <View style={[styles.sectionHeader, { backgroundColor }]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
    </View>
  );

  const SummaryHeader = () => (
    <View style={styles.summaryContainer}>
      <Text style={[styles.totalLabel, { color: textColor, opacity: 0.6 }]}>
        {i18n.net_worth}
      </Text>
      <Text style={[styles.totalAmount, { color: textColor }]}>
        {isBalanceHidden ? "*****" : formatAmount(totalNetWorth)}
      </Text>

      <View style={styles.breakdownContainer}>
        <View style={styles.breakdownItem}>
          <Text style={[styles.breakdownLabel, { color: textColor }]}>
            {i18n.bank_assets}
          </Text>
          <Text style={[styles.breakdownValue, { color: tintColor }]}>
            {isBalanceHidden ? "*****" : formatAmount(totalBankBalance)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.breakdownItem}
          onPress={openCashModal}
          activeOpacity={0.6}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.breakdownLabel, { color: textColor }]}>
              {i18n.cash_at_hand}
            </Text>
            <View style={[styles.editBadge, { backgroundColor: tintColor }]}>
              <Text style={[styles.editBadgeText, { color: backgroundColor }]}>
                {i18n.edit_cash}
              </Text>
            </View>
          </View>
          <Text style={[styles.breakdownValue, { color: "#2ecc71" }]}>
            {formatAmount(cashBalance)}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.addAccountButton, { borderColor: tintColor }]}
        onPress={() => setAddAccountModalVisible(true)}
      >
        <Text style={[styles.addAccountText, { color: tintColor }]}>
          {i18n.add_manual_account}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (initialLoading && accounts.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor }]}>
        <ActivityIndicator size="large" color={tintColor} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Cash Modal */}
      <Modal
        visible={isCashModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCashModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {i18n.update_cash_title}
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { color: textColor, borderColor: tintColor },
              ]}
              keyboardType="numeric"
              value={tempCashValue}
              onChangeText={setTempCashValue}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setCashModalVisible(false)}
                style={styles.modalButton}
              >
                <Text style={{ color: textColor }}>{i18n.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveCash}
                style={[styles.modalButton, { backgroundColor: tintColor }]}
              >
                <Text style={{ color: backgroundColor, fontWeight: "600" }}>
                  {i18n.save}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Manual Account Modal */}
      <Modal
        visible={isAddAccountModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddAccountModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {i18n.add_manual_title}
            </Text>

            <Text style={[styles.inputLabel, { color: textColor }]}>
              {i18n.name_label}
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: textColor, borderColor: tintColor },
              ]}
              placeholder={i18n.placeholder_name}
              placeholderTextColor={textColor + "50"}
              value={newAccountName}
              onChangeText={setNewAccountName}
            />

            <Text style={[styles.inputLabel, { color: textColor }]}>
              {i18n.balance_label}
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: textColor, borderColor: tintColor },
              ]}
              placeholder="0.00"
              placeholderTextColor={textColor + "50"}
              keyboardType="numeric"
              value={newAccountBalance}
              onChangeText={setNewAccountBalance}
            />

            <Text style={[styles.inputLabel, { color: textColor }]}>
              {i18n.category_label}
            </Text>
            <View style={styles.categoryContainer}>
              {(["Giro", "Savings", "Stock"] as AccountCategory[]).map(
                (cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor:
                          newAccountCategory === cat
                            ? tintColor
                            : tintColor + "10",
                      },
                    ]}
                    onPress={() => setNewAccountCategory(cat)}
                  >
                    <Text
                      style={{
                        color:
                          newAccountCategory === cat
                            ? backgroundColor
                            : textColor,
                        fontWeight: "600",
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setAddAccountModalVisible(false)}
                style={styles.modalButton}
              >
                <Text style={{ color: textColor }}>{i18n.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddManualAccount}
                style={[styles.modalButton, { backgroundColor: tintColor }]}
              >
                <Text style={{ color: backgroundColor, fontWeight: "600" }}>
                  {i18n.create_btn}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Text style={[styles.title, { color: textColor }]}>
        {i18n.accounts_title}
      </Text>
      <Text style={[styles.subtitle, { color: textColor, opacity: 0.6 }]}>
        {i18n.accounts_subtitle}
      </Text>

      <SectionList
        sections={sections}
        renderItem={renderAccount}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={SummaryHeader}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={tintColor}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>🏦</Text>
            <Text
              style={[styles.emptyText, { color: textColor, opacity: 0.5 }]}
            >
              {i18n.no_accounts}
            </Text>
            <Text
              style={[styles.emptyHint, { color: textColor, opacity: 0.4 }]}
            >
              {i18n.no_accounts_hint}
            </Text>
            <TouchableOpacity
              style={[
                styles.addAccountButton,
                { borderColor: tintColor, marginTop: 20 },
              ]}
              onPress={() => setAddAccountModalVisible(true)}
            >
              <Text style={[styles.addAccountText, { color: tintColor }]}>
                {i18n.add_manual_account}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 20,
  },
  summaryContainer: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(128,128,128,0.08)",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 24,
  },
  breakdownContainer: {
    gap: 16,
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: "600",
  },
  editBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  editBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  addAccountButton: {
    marginTop: 24,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    borderStyle: "dashed",
  },
  addAccountText: {
    fontWeight: "600",
    fontSize: 15,
  },
  list: {
    flex: 1,
    overflow: "visible",
  },
  listContent: {
    gap: 12,
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingVertical: 8,
    marginBottom: 8,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  accountCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12, // Spacing between items
  },
  accountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  accountInfo: {
    flex: 1,
    marginRight: 12,
  },
  bankLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  accountName: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  iban: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  balanceContainer: {
    alignItems: "flex-end",
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: "700",
  },
  balanceLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
  },
  noBalance: {
    fontSize: 20,
  },
  emptyState: {
    marginTop: 40,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptyHint: {
    fontSize: 14,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  categoryContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
