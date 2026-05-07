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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FMFonts } from "@/src/constants/theme";
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
import {
  Money,
  useFMTheme,
} from "@/src/shared/design";

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
  const { transactionsByAccount } = useTransactionsContext();
  const { accounts } = useAccounts();
  const { categories, getCategoryForTransaction } = useCategories();

  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  const groups = useMemo<ResultGroup[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const byId = new Map(accounts.map((a) => [a.id, a]));
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
          acc.name.toLowerCase(),
        ].join("  ");

        if (haystack.includes(q)) {
          rows.push({ tx, category: cat });
          total++;
        }
      }

      if (rows.length > 0 && byId.has(acc.id)) {
        out.push({ accountId: acc.id, accountName: acc.name, rows });
      }
    }

    return out;
  }, [query, transactionsByAccount, accounts, categories, getCategoryForTransaction]);

  const isWeb = Platform.OS === "web";
  const trimmed = query.trim();
  const hasResults = groups.some((g) => g.rows.length > 0);

  function handleRowPress(accountId: string) {
    onClose();
    router.push(`/account/${accountId}` as never);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable
          style={[
            isWeb ? styles.dialog : styles.sheet,
            {
              backgroundColor: t.surface,
              borderColor: t.lineStrong,
              paddingBottom: 16 + (isWeb ? 0 : insets.bottom),
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {!isWeb ? (
            <View style={[styles.handle, { backgroundColor: t.lineStrong }]} />
          ) : null}

          <Text
            style={{
              fontFamily: FMFonts.display,
              fontSize: 22,
              color: t.ink,
              marginBottom: 14,
              letterSpacing: -0.3,
            }}
          >
            Search
          </Text>

          <View
            style={[
              styles.inputRow,
              { borderColor: t.lineStrong, backgroundColor: t.surfaceAlt },
            ]}
          >
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search transactions, categories, accounts…"
              placeholderTextColor={t.inkMuted}
              style={{
                flex: 1,
                fontFamily: FMFonts.sansMedium,
                fontSize: 13,
                color: t.ink,
                paddingVertical: 0,
              }}
            />
          </View>

          <View style={styles.resultsWrap}>
            {trimmed.length === 0 ? (
              <Text style={[styles.hint, { color: t.inkMuted }]}>
                Type to search transactions across all accounts.
              </Text>
            ) : !hasResults ? (
              <Text style={[styles.hint, { color: t.inkMuted }]}>
                No matches in the current date range.
              </Text>
            ) : (
              <ScrollView
                style={{ maxHeight: isWeb ? 420 : 360 }}
                showsVerticalScrollIndicator={false}
              >
                {groups.map((group) => (
                  <View key={group.accountId} style={{ marginBottom: 10 }}>
                    <Text
                      style={{
                        fontFamily: FMFonts.sansSemibold,
                        fontSize: 10,
                        color: t.inkMuted,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        paddingHorizontal: 4,
                        paddingTop: 6,
                        paddingBottom: 6,
                      }}
                    >
                      {group.accountName}
                    </Text>
                    {group.rows.map((row, i) => {
                      const txId = getStableTxId(row.tx);
                      const title = pickTransactionTitle(row.tx);
                      const amount = getTransactionAmount(row.tx);
                      const date = row.tx.booking_date || row.tx.value_date || "";
                      const dateLabel = dayMonth(date);
                      const cat = row.category;
                      return (
                        <Pressable
                          key={`${group.accountId}-${txId}-${i}`}
                          onPress={() => handleRowPress(group.accountId)}
                          style={({ pressed }) => [
                            styles.row,
                            {
                              borderTopColor: i === 0 ? "transparent" : t.line,
                              borderTopWidth: i === 0 ? 0 : 1,
                              opacity: pressed ? 0.7 : 1,
                            },
                          ]}
                        >
                          <View style={styles.dotCol}>
                            {cat ? (
                              <View
                                style={[
                                  styles.dot,
                                  { backgroundColor: cat.color },
                                ]}
                              />
                            ) : (
                              <View
                                style={[
                                  styles.dotDashed,
                                  { borderColor: t.lineStrong },
                                ]}
                              />
                            )}
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text
                              style={{
                                fontFamily: FMFonts.sansMedium,
                                fontSize: 13,
                                color: t.ink,
                              }}
                              numberOfLines={1}
                            >
                              {title}
                            </Text>
                            <Text
                              style={{
                                fontFamily: FMFonts.sans,
                                fontSize: 11,
                                color: t.inkMuted,
                                marginTop: 2,
                              }}
                              numberOfLines={1}
                            >
                              {dateLabel}
                              {cat ? ` · ${cat.name}` : ""}
                            </Text>
                          </View>
                          <View style={{ marginLeft: 10 }}>
                            <Money value={amount} size={13} />
                          </View>
                        </Pressable>
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

function dayMonth(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  dialog: {
    alignSelf: "center",
    marginBottom: "auto",
    marginTop: "auto",
    width: 560,
    maxWidth: "92%" as unknown as number,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  resultsWrap: {
    minHeight: 80,
  },
  hint: {
    fontFamily: FMFonts.sans,
    fontSize: 12,
    paddingVertical: 18,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  dotCol: {
    width: 14,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotDashed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },
});
