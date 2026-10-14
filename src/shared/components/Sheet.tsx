import React from "react";
import {
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FMFonts, FMRadius } from "@/src/constants/theme";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { IconButton, IconClose, elevation, useFMTheme } from "@/src/shared/design";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** One short line under the title. Prefer none. */
  subtitle?: string;
  children: React.ReactNode;
  /** Right-aligned actions — e.g. <Button variant="text">Cancel</Button><Button>Save</Button>. */
  actions?: React.ReactNode;
  /** Left-aligned actions (e.g. a destructive "Delete"). */
  leftActions?: React.ReactNode;
  /** Desktop dialog width (mobile is always full width). */
  width?: number;
  /** Render a close (×) button in the header. Defaults to true. */
  closeButton?: boolean;
  style?: StyleProp<ViewStyle>;
}

// M3 dialog on desktop (28dp corners, centered) and M3 bottom sheet on
// mobile layouts (28dp top corners + drag handle). Title · body · actions,
// no divider lines.
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
  const { i18n } = useSettings();
  const insets = useSafeAreaInsets();
  const isDialog = !useIsMobileLayout();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isDialog ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <Pressable
        style={[
          styles.scrim,
          { backgroundColor: t.scrim, justifyContent: isDialog ? "center" : "flex-end" },
        ]}
        onPress={onClose}
        accessibilityLabel={i18n.close}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
          style={[
            isDialog ? styles.dialog : styles.sheet,
            {
              backgroundColor: t.surface,
              width: isDialog ? width : undefined,
              maxWidth: isDialog ? Math.min(width, 920) : undefined,
              paddingBottom: isDialog ? 0 : insets.bottom,
            },
            elevation(3),
            style,
          ]}
        >
          {!isDialog ? (
            <View style={[styles.handle, { backgroundColor: t.outlineVariant }]} />
          ) : null}

          {title || subtitle || closeButton ? (
            <View style={[styles.header, !isDialog && { paddingTop: 8 }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                {title ? (
                  <Text
                    style={{
                      fontFamily: FMFonts.sans,
                      fontSize: 24,
                      lineHeight: 32,
                      color: t.ink,
                    }}
                    numberOfLines={2}
                    accessibilityRole="header"
                  >
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text
                    style={{
                      fontFamily: FMFonts.sans,
                      fontSize: 14,
                      lineHeight: 20,
                      color: t.inkSoft,
                      marginTop: 4,
                    }}
                    numberOfLines={2}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {closeButton ? (
                <IconButton
                  icon={<IconClose size={20} />}
                  label={i18n.close}
                  onPress={onClose}
                  style={{ marginLeft: 12, marginRight: -8, marginTop: -4 }}
                />
              ) : null}
            </View>
          ) : null}

          <View style={styles.body}>{children}</View>

          {actions || leftActions ? (
            <View style={styles.footer}>
              <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>{leftActions}</View>
              <View style={styles.actions}>{actions}</View>
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
    alignItems: "center",
  },
  dialog: {
    borderRadius: FMRadius.xl,
    overflow: "hidden",
    maxHeight: "90%",
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: FMRadius.xl,
    borderTopRightRadius: FMRadius.xl,
    overflow: "hidden",
    maxHeight: "92%",
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  // flexShrink lets a ScrollView child shrink inside the max-height dialog
  // instead of overflowing (and being clipped by `overflow: hidden`).
  body: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    flexShrink: 1,
    minHeight: 0,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // Wrap onto a second line instead of overflowing narrow dialogs.
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    flexShrink: 1,
    gap: 8,
  },
});
