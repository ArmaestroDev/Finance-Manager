import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useThemeColor } from "../../hooks/use-theme-color";
import type { UnifiedAccount } from "../../context/AccountsContext";

// ── Hooks ──
import {
  useAccountsScreen,
  type SectionData,
} from "../hooks/useAccountsScreen";

// ── Components ──
import { CashModal } from "../components/CashModal";
import { AddAccountModal } from "../components/AddAccountModal";

export default function AccountsScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const router = useRouter();

  // ── Hook State ──
  const {
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
  } = useAccountsScreen();

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
      {/* ── Modals ── */}
      <CashModal
        visible={isCashModalVisible}
        value={tempCashValue}
        onChangeText={setTempCashValue}
        onSave={handleSaveCash}
        onClose={() => setCashModalVisible(false)}
        textColor={textColor}
        backgroundColor={backgroundColor}
        tintColor={tintColor}
        i18n={i18n}
      />

      <AddAccountModal
        visible={isAddAccountModalVisible}
        onClose={() => setAddAccountModalVisible(false)}
        onAdd={handleAddManualAccount}
        name={newAccountName}
        setName={setNewAccountName}
        balance={newAccountBalance}
        setBalance={setNewAccountBalance}
        category={newAccountCategory}
        setCategory={setNewAccountCategory}
        textColor={textColor}
        backgroundColor={backgroundColor}
        tintColor={tintColor}
        i18n={i18n}
      />

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
});
