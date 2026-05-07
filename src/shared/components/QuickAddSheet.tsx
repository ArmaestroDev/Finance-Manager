import { router } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FMFonts } from "@/src/constants/theme";
import {
  Button,
  IconBank,
  IconChevR,
  IconCoins,
  IconLink,
  IconPlus,
  IconUpload,
  useFMTheme,
} from "@/src/shared/design";

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
  const t = useFMTheme();
  const insets = useSafeAreaInsets();

  const items = useMemo(
    () => [
      {
        id: "tx",
        label: "Add transaction",
        icon: <IconPlus size={15} color={t.accent} />,
        action: () => navigateTo("/(tabs)/accounts"),
      },
      {
        id: "manual",
        label: "Add manual account",
        icon: <IconBank size={15} color={t.accent} />,
        action: () => navigateTo("/(tabs)/accounts"),
      },
      {
        id: "cash",
        label: "Edit cash at hand",
        icon: <IconCoins size={15} color={t.accent} />,
        action: () => navigateTo("/(tabs)/accounts"),
      },
      {
        id: "import",
        label: "Import statement",
        icon: <IconUpload size={15} color={t.accent} />,
        action: () => navigateTo("/(tabs)/accounts"),
      },
      {
        id: "connect",
        label: "Connect a bank",
        icon: <IconLink size={15} color={t.accent} />,
        action: () => navigateTo("/connections"),
      },
    ],
    [t.accent],
  );

  function navigateTo(path: string) {
    onClose();
    setTimeout(() => router.push(path as never), 80);
  }

  const isWeb = Platform.OS === "web";

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
            Quick add
          </Text>

          {items.map((it, i) => (
            <Pressable
              key={it.id}
              onPress={it.action}
              style={({ pressed }) => [
                styles.row,
                {
                  borderTopColor: i === 0 ? "transparent" : t.line,
                  borderTopWidth: i === 0 ? 0 : 1,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={{ width: 18, alignItems: "center" }}>{it.icon}</View>
              <Text
                style={{
                  flex: 1,
                  fontFamily: FMFonts.sans,
                  fontSize: 14,
                  color: t.ink,
                  marginLeft: 12,
                }}
              >
                {it.label}
              </Text>
              <IconChevR size={12} color={t.inkMuted} />
            </Pressable>
          ))}

          <View style={{ marginTop: 12 }}>
            <Button variant="ghost" full onPress={onClose}>
              Cancel
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
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
    width: 380,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
});
