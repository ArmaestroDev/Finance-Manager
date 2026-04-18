import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useThemeColor } from "../../../../shared/hooks/use-theme-color";
import type { UnifiedAccount } from "../../context/AccountsContext";
import { useAccountsScreen, type SectionData } from "../../hooks/useAccountsScreen";
import { CashModal } from "./CashModal";
import { AddAccountModal } from "./AddAccountModal";

export function AccountsScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const surfaceColor = useThemeColor({}, "surface");
  const router = useRouter();

  const {
    accounts, cashBalance, initialLoading, isRefreshing, refreshAccounts, isBalanceHidden, i18n, sections,
    isCashModalVisible, setCashModalVisible, tempCashValue, setTempCashValue,
    isAddAccountModalVisible, setAddAccountModalVisible, newAccountName, setNewAccountName,
    newAccountBalance, setNewAccountBalance, newAccountCategory, setNewAccountCategory,
    handleSaveCash, openCashModal, handleAddManualAccount, formatAmount, totalBankBalance, totalNetWorth,
  } = useAccountsScreen();

  if (initialLoading && accounts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={tintColor} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <CashModal visible={isCashModalVisible} value={tempCashValue} onChangeText={setTempCashValue} onSave={handleSaveCash} onClose={() => setCashModalVisible(false)} textColor={textColor} backgroundColor={backgroundColor} tintColor={tintColor} i18n={i18n} />
      <AddAccountModal visible={isAddAccountModalVisible} onClose={() => setAddAccountModalVisible(false)} onAdd={handleAddManualAccount} name={newAccountName} setName={setNewAccountName} balance={newAccountBalance} setBalance={setNewAccountBalance} category={newAccountCategory} setCategory={setNewAccountCategory} textColor={textColor} backgroundColor={backgroundColor} tintColor={tintColor} i18n={i18n} />

      {/* Top header */}
      <View style={[styles.topBar, { borderBottomColor: textColor + "10" }]}>
        <View>
          <Text style={[styles.pageTitle, { color: textColor }]}>{i18n.accounts_title}</Text>
          <Text style={{ color: textColor, opacity: 0.5, fontSize: 13 }}>{i18n.accounts_subtitle}</Text>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => setAddAccountModalVisible(true)} style={[styles.topBtn, { backgroundColor: tintColor }]}>
            <Ionicons name="add" size={18} color={backgroundColor} />
            <Text style={{ color: backgroundColor, fontWeight: "600", fontSize: 13 }}>{i18n.add_manual_account}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => refreshAccounts()} style={[styles.topBtn, { backgroundColor: textColor + "10" }]}>
            {isRefreshing ? <ActivityIndicator size="small" color={tintColor} /> : <Ionicons name="refresh" size={18} color={textColor} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Two-column: summary left, accounts right */}
      <View style={styles.twoColumn}>
        {/* Left: net worth summary */}
        <View style={[styles.leftPanel, { borderRightColor: textColor + "10" }]}>
          <Text style={[styles.sectionLabel, { color: textColor }]}>NET WORTH</Text>
          <Text style={[styles.totalAmount, { color: textColor }]}>
            {isBalanceHidden ? "*****" : formatAmount(totalNetWorth)}
          </Text>
          <View style={[styles.breakdownCard, { backgroundColor: surfaceColor }]}>
            <View style={styles.breakdownRow}>
              <Text style={{ color: textColor, opacity: 0.6, fontSize: 13 }}>{i18n.bank_assets}</Text>
              <Text style={{ color: tintColor, fontWeight: "700" }}>
                {isBalanceHidden ? "*****" : formatAmount(totalBankBalance)}
              </Text>
            </View>
            <View style={[styles.breakdownDivider, { backgroundColor: textColor + "10" }]} />
            <TouchableOpacity style={styles.breakdownRow} onPress={openCashModal} activeOpacity={0.7}>
              <Text style={{ color: textColor, opacity: 0.6, fontSize: 13 }}>{i18n.cash_at_hand}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ color: "#2ecc71", fontWeight: "700" }}>{formatAmount(cashBalance)}</Text>
                <View style={[styles.editBadge, { backgroundColor: tintColor }]}>
                  <Text style={{ color: backgroundColor, fontSize: 9, fontWeight: "700" }}>{i18n.edit_cash}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right: accounts list by section */}
        <ScrollView style={styles.rightPanel} contentContainerStyle={styles.rightContent}>
          {accounts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>🏦</Text>
              <Text style={{ color: textColor, opacity: 0.5, fontSize: 18, fontWeight: "600", marginTop: 12 }}>{i18n.no_accounts}</Text>
              <Text style={{ color: textColor, opacity: 0.4, fontSize: 14, marginTop: 4 }}>{i18n.no_accounts_hint}</Text>
            </View>
          ) : (
            sections.map((section) => (
              <View key={section.title}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>{section.title}</Text>
                <View style={styles.accountsGrid}>
                  {section.data.map((item: UnifiedAccount) => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.7}
                      style={[styles.accountCard, { backgroundColor: tintColor + "10" }]}
                      onPress={() => router.push({ pathname: "/account/[id]", params: { id: item.id, name: item.name, type: item.type } })}
                    >
                      <Text style={[styles.bankLabel, { color: tintColor }]}>
                        {item.type === "manual" ? "👤" : "🏦"} {item.bankName}
                      </Text>
                      <Text style={[styles.accountName, { color: textColor }]}>{item.name}</Text>
                      {item.iban && <Text style={[styles.iban, { color: textColor, opacity: 0.4 }]}>{item.iban}</Text>}
                      <View style={styles.cardFooter}>
                        {item.loading ? (
                          <ActivityIndicator size="small" color={tintColor} />
                        ) : item.error ? (
                          <Text style={{ color: "#FF6B6B", fontSize: 13 }}>Error</Text>
                        ) : (
                          <Text style={[styles.balance, { color: textColor }]}>
                            {isBalanceHidden ? "*****" : formatAmount(item.balance, item.currency)}
                          </Text>
                        )}
                        <Ionicons name="chevron-forward" size={16} color={textColor + "40"} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 32, paddingVertical: 20, borderBottomWidth: 1 },
  pageTitle: { fontSize: 26, fontWeight: "800" },
  topActions: { flexDirection: "row", gap: 10 },
  topBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  twoColumn: { flex: 1, flexDirection: "row" },
  leftPanel: { width: 280, padding: 24, borderRightWidth: 1 },
  rightPanel: { flex: 1 },
  rightContent: { padding: 24, gap: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, opacity: 0.5, marginBottom: 8 },
  totalAmount: { fontSize: 36, fontWeight: "800", marginBottom: 20 },
  breakdownCard: { borderRadius: 16, padding: 16, gap: 12 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  breakdownDivider: { height: 1 },
  editBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  emptyState: { alignItems: "center", marginTop: 80, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12, opacity: 0.7 },
  accountsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 },
  accountCard: { flex: 1, minWidth: 220, maxWidth: 320, borderRadius: 16, padding: 20 },
  bankLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  accountName: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  iban: { fontSize: 11, fontFamily: "monospace", marginBottom: 12 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  balance: { fontSize: 18, fontWeight: "700" },
});
