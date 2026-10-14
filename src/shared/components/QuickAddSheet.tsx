import { router } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { View } from "react-native";

import { CASH_ACCOUNT_ID, useAccounts } from "@/src/features/accounts/context/AccountsContext";
import { useSettings } from "@/src/shared/context/SettingsContext";
import {
  Avatar,
  IconBank,
  IconCash,
  IconLink,
  IconPlus,
  IconUpload,
  ListItem,
} from "@/src/shared/design";
import { Sheet } from "./Sheet";

interface QuickAddContext {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const ctx = createContext<QuickAddContext | null>(null);

export function useQuickAdd(): QuickAddContext {
  const c = useContext(ctx);
  if (!c) throw new Error("useQuickAdd must be used within QuickAddSheetProvider");
  return c;
}

export function QuickAddSheetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <ctx.Provider value={value}>
      {children}
      <QuickAddSheet visible={isOpen} onClose={close} />
    </ctx.Provider>
  );
}

interface QuickAddSheetProps {
  visible: boolean;
  onClose: () => void;
}

function QuickAddSheet({ visible, onClose }: QuickAddSheetProps) {
  const { i18n, mainAccountId } = useSettings();
  const { accounts } = useAccounts();

  // Manual transactions / imports need a target account: the dashboard's main
  // account when it's a manual one, else Cash at Hand (always present).
  const manualTargetId = useMemo(() => {
    const main = accounts.find((a) => a.id === mainAccountId);
    return main && main.type === "manual" ? main.id : CASH_ACCOUNT_ID;
  }, [accounts, mainAccountId]);
  const importTargetId = mainAccountId ?? CASH_ACCOUNT_ID;

  // Close first, then navigate once the modal has started to dismiss.
  const navigateTo = useCallback(
    (href: string | { pathname: string; params: Record<string, string> }) => {
      onClose();
      setTimeout(() => router.push(href as never), 80);
    },
    [onClose],
  );

  const items = useMemo(
    () => [
      {
        id: "tx",
        label: i18n.quickadd_add_transaction,
        icon: <IconPlus size={18} />,
        action: () =>
          navigateTo({ pathname: "/account/[id]", params: { id: manualTargetId, qa: "tx" } }),
      },
      {
        id: "import",
        label: i18n.quickadd_import_statement,
        icon: <IconUpload size={18} />,
        action: () =>
          navigateTo({ pathname: "/account/[id]", params: { id: importTargetId, qa: "import" } }),
      },
      {
        id: "cash",
        label: i18n.quickadd_edit_cash,
        icon: <IconCash size={18} />,
        action: () => navigateTo({ pathname: "/(tabs)/accounts", params: { qa: "cash" } }),
      },
      {
        id: "manual",
        label: i18n.quickadd_add_manual_account,
        icon: <IconBank size={18} />,
        action: () => navigateTo({ pathname: "/(tabs)/accounts", params: { qa: "manual" } }),
      },
      {
        id: "connect",
        label: i18n.connect_bank,
        icon: <IconLink size={18} />,
        action: () => navigateTo("/connections"),
      },
    ],
    [i18n, manualTargetId, importTargetId, navigateTo],
  );

  return (
    <Sheet visible={visible} onClose={onClose} title={i18n.quick_add} width={400}>
      <View style={{ marginHorizontal: -24, marginBottom: 8 }}>
        {items.map((it) => (
          <ListItem
            key={it.id}
            leading={<Avatar icon={it.icon} />}
            title={it.label}
            onPress={it.action}
            accessibilityLabel={it.label}
            style={{ paddingHorizontal: 24 }}
          />
        ))}
      </View>
    </Sheet>
  );
}
