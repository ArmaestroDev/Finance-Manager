import { router } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FMFonts, FMType } from "@/src/constants/theme";
import { useAccounts } from "@/src/features/accounts/context/AccountsContext";
import {
  useCategories,
  type TransactionCategory,
} from "@/src/features/transactions/context/CategoriesContext";
import { useTransactionsContext } from "@/src/features/transactions/context/TransactionsContext";
import {
  getStableTxId,
  getTransactionAmount,
  pickTransactionTitle,
} from "@/src/features/transactions/utils/transactions";
import type { Transaction } from "@/src/services/enableBanking";
import { useSettings } from "@/src/shared/context/SettingsContext";
import {
  Avatar,
  IconBack,
  IconButton,
  IconClose,
  IconSearch,
  Label,
  ListItem,
  Money,
  elevation,
  useFMTheme,
} from "@/src/shared/design";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { formatDate } from "@/src/shared/utils/date";
import { accountDisplayName } from "@/src/features/accounts/utils/accountDisplay";

interface SearchContext {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const ctx = createContext<SearchContext | null>(null);

export function useSearch(): SearchContext {
  const c = useContext(ctx);
  if (!c) throw new Error("useSearch must be used within SearchSheetProvider");
  return c;
}

export function SearchSheetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape" && isOpenRef.current) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <ctx.Provider value={value}>
      {children}
      <SearchSheet visible={isOpen} onClose={close} />
    </ctx.Provider>
  );
}

interface SearchSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface ResultRow {
  tx: Transaction;
  category: TransactionCategory | null;
}

interface ResultGroup {
  accountId: string;
  accountName: string;
  rows: ResultRow[];
}

const MAX_RESULTS = 50;

function SearchSheet({ visible, onClose }: SearchSheetProps) {
  const t = useFMTheme();
  const insets = useSafeAreaInsets();
  const { i18n } = useSettings();
  const isWeb = !useIsMobileLayout();
  const { transactionsByAccount } = useTransactionsContext();
  const { accounts } = useAccounts();
  const { getCategoryForTransaction } = useCategories();

  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  // autoFocus alone doesn't stick inside a react-native-web Modal: its focus
  // trap moves focus to the first focusable element (the scrim) when the fade
  // ends. Focus again on show and after the animation.
  const inputRef = useRef<TextInput>(null);
  const focusInput = useCallback(() => inputRef.current?.focus(), []);
  useEffect(() => {
    if (!visible) return;
    const ids = [60, 350].map((ms) => setTimeout(focusInput, ms));
    return () => ids.forEach(clearTimeout);
  }, [visible, focusInput]);

  const groups = useMemo<ResultGroup[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const out: ResultGroup[] = [];
    let total = 0;

    for (const acc of accounts) {
      if (total >= MAX_RESULTS) break;
      const txs = transactionsByAccount[acc.id];
      if (!txs || txs.length === 0) continue;

      const rows: ResultRow[] = [];
      for (const tx of txs) {
        if (total >= MAX_RESULTS) break;
        const txId = getStableTxId(tx);
        const cat = getCategoryForTransaction(txId);
        const haystack = [
          pickTransactionTitle(tx).toLowerCase(),
          cat?.name?.toLowerCase() ?? "",
          (tx.remittance_information ?? []).join(" ").toLowerCase(),
          String(getTransactionAmount(tx)),
          accountDisplayName(acc, i18n).toLowerCase(),
        ].join("  ");

        if (haystack.includes(q)) {
          rows.push({ tx, category: cat });
          total++;
        }
      }

      if (rows.length > 0) {
        out.push({ accountId: acc.id, accountName: accountDisplayName(acc, i18n), rows });
      }
    }

    return out;
  }, [query, transactionsByAccount, accounts, getCategoryForTransaction, i18n]);

  const trimmed = query.trim();
  const hasResults = groups.some((g) => g.rows.length > 0);

  // Opens the account with the row selected (the detail screens read `tx`).
  function handleRowPress(accountId: string, txId: string) {
    onClose();
    router.push({ pathname: `/account/${accountId}`, params: { tx: txId } } as never);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? "fade" : "slide"}
      onRequestClose={onClose}
      onShow={focusInput}
    >
      <Pressable
        style={[styles.scrim, { backgroundColor: t.scrim }, isWeb ? styles.scrimDialog : null]}
        onPress={onClose}
        accessibilityLabel={i18n.close}
      >
        <Pressable
          style={[
            isWeb ? styles.dialog : styles.sheet,
            {
              backgroundColor: t.surfaceContainerHigh,
              paddingTop: isWeb ? 0 : insets.top,
              paddingBottom: isWeb ? 8 : insets.bottom,
            },
            elevation(3),
          ]}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
        >
          {/* M3 search bar: leading back/close · input · clear */}
          <View style={styles.inputRow}>
            <IconButton icon={<IconBack size={20} />} label={i18n.close} onPress={onClose} />
            <TextInput
              ref={inputRef}
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder={i18n.search_placeholder}
              placeholderTextColor={t.onSurfaceVariant}
              accessibilityLabel={i18n.search_label}
              selectionColor={t.primary}
              style={[
                NO_WEB_OUTLINE,
                {
                  flex: 1,
                  minWidth: 0,
                  fontFamily: FMFonts.sans,
                  fontSize: FMType.subhead,
                  color: t.ink,
                  paddingVertical: 0,
                  marginLeft: 4,
                },
              ]}
            />
            {query ? (
              <IconButton icon={<IconClose size={20} />} label={i18n.clear} onPress={() => setQuery("")} />
            ) : (
              <View style={{ width: 40, alignItems: "center" }}>
                <IconSearch size={20} color={t.onSurfaceVariant} />
              </View>
            )}
          </View>
          <View style={[styles.divider, { backgroundColor: t.outlineVariant }]} />

          <View style={[styles.resultsWrap, !isWeb && { flex: 1 }]}>
            {trimmed.length === 0 ? (
              <Text style={[styles.hint, { color: t.inkSoft }]}>{i18n.search_empty_hint}</Text>
            ) : !hasResults ? (
              <Text style={[styles.hint, { color: t.inkSoft }]}>{i18n.search_no_matches}</Text>
            ) : (
              <ScrollView
                style={isWeb ? { maxHeight: 480 } : { flex: 1 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {groups.map((group) => (
                  <View key={group.accountId} style={{ marginBottom: 8 }}>
                    <Label style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
                      {group.accountName}
                    </Label>
                    {group.rows.map((row, i) => {
                      const txId = getStableTxId(row.tx);
                      const title = pickTransactionTitle(row.tx);
                      const amount = getTransactionAmount(row.tx);
                      const date = row.tx.booking_date || row.tx.value_date || "";
                      const cat = row.category;
                      return (
                        <ListItem
                          key={`${group.accountId}-${txId}-${i}`}
                          onPress={() => handleRowPress(group.accountId, txId)}
                          background={t.surfaceContainerHigh}
                          leading={<Avatar label={title} color={cat?.color} size={36} />}
                          title={title}
                          subtitle={`${formatDate(date)}${cat ? ` · ${cat.name}` : ""}`}
                          trailing={<Money value={amount} size={FMType.body} />}
                          accessibilityLabel={title}
                        />
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// The input draws its own container; drop the browser focus ring.
const NO_WEB_OUTLINE = { outlineStyle: "none" } as unknown as TextStyle;

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
  },
  scrimDialog: {
    alignItems: "center",
    paddingTop: 72,
  },
  sheet: {
    flex: 1,
    width: "100%",
  },
  dialog: {
    width: 640,
    maxWidth: "92%",
    borderRadius: 28,
    overflow: "hidden",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 64,
    paddingHorizontal: 8,
  },
  divider: {
    height: 1,
  },
  resultsWrap: {
    minHeight: 80,
  },
  hint: {
    fontFamily: FMFonts.sans,
    fontSize: FMType.body,
    paddingVertical: 24,
    paddingHorizontal: 16,
    textAlign: "center",
  },
});
