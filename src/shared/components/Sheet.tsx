import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FMFonts } from "@/src/constants/theme";
import { IconClose, useFMTheme } from "@/src/shared/design";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Right side of the footer — e.g. <Button>Save</Button>. */
  actions?: React.ReactNode;
  /** Left side of the footer — defaults to nothing. Use for secondary actions. */
  leftActions?: React.ReactNode;
  /** Desktop width (mobile is always full width). */
  width?: number;
  /** Render a close (×) button in the header. Defaults to true. */
  closeButton?: boolean;
  /** Override container style. */
  style?: ViewStyle;
}

// Bottom sheet on native, centered dialog on web. Provides title row +
// scrollable body + optional footer. Honors safe-area inset on mobile.
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  actions,
  leftActions,
  width = 480,
  closeButton = true,
  style,
}: SheetProps) {
  const t = useFMTheme();
  const insets = useSafeAreaInsets();
  // Desktop layout → centered dialog; mobile layout (native or narrow web) →
  // bottom sheet. Width-driven so a narrow browser gets the sheet treatment.
  const isWeb = !useIsMobileLayout();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <Pressable
        style={[
          styles.scrim,
          { justifyContent: isWeb ? "center" : "flex-end" },
        ]}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            isWeb ? styles.dialog : styles.sheet,
            {
              backgroundColor: t.surface,
              borderColor: t.lineStrong,
              width: isWeb ? width : undefined,
              maxWidth: isWeb ? Math.min(width, 920) : undefined,
              paddingBottom: isWeb ? 0 : insets.bottom,
            },
            style,
          ]}
        >
          {!isWeb ? (
            <View style={[styles.handle, { backgroundColor: t.lineStrong }]} />
          ) : null}

          {(title || subtitle || closeButton) ? (
            <View style={[styles.header, { borderBottomColor: t.line }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                {title ? (
                  <Text
                    style={{
                      fontFamily: FMFonts.display,
                      fontSize: 20,
                      color: t.ink,
                      letterSpacing: -0.3,
                      lineHeight: 22,
                    }}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text
                    style={{
                      fontFamily: FMFonts.sans,
                      fontSize: 11,
                      color: t.inkSoft,
                      marginTop: 2,
                    }}
                    numberOfLines={2}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {closeButton ? (
                <Pressable
                  onPress={onClose}
                  hitSlop={10}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
                >
                  <IconClose size={15} color={t.inkSoft} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={styles.body}>{children}</View>

          {actions || leftActions ? (
            <View style={[styles.footer, { borderTopColor: t.line, backgroundColor: t.surfaceAlt }]}>
              <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>{leftActions}</View>
              <View style={{ flexDirection: "row", gap: 6 }}>{actions}</View>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: Platform.OS === "web" ? "center" : "flex-end",
  },
  dialog: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    maxHeight: "90%" as unknown as number,
  },
  sheet: {
    width: "100%" as unknown as number,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    overflow: "hidden",
    maxHeight: "92%" as unknown as number,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
  },
});
