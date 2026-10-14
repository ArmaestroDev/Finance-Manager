import React, { useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FMFonts, FMRadius, FMType } from "@/src/constants/theme";
import {
  Button,
  IconButton,
  IconChevD,
  IconChevR,
  IconClose,
  IconRefresh,
  IconUpload,
  PressState,
  elevation,
  stateColor,
  useFMTheme,
} from "@/src/shared/design";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { useImportQueue } from "../context/ImportQueueContext";
import type { QueueItemStatus } from "../context/ImportQueueContext";

export function ImportQueueOverlay(): React.ReactElement | null {
  const t = useFMTheme();
  const { i18n } = useSettings();
  const { items, removeItem, retryItem } = useImportQueue();
  const isMobile = useIsMobileLayout();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [slideAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: items.length > 0 ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 9,
    }).start();
  }, [items.length, slideAnim]);

  if (items.length === 0) return null;

  const completedCount = items.filter((i) => i.status === "completed").length;
  const totalCount = items.length;
  const processingItem = items.find((i) => i.status === "processing");

  return (
    <Animated.View
      style={[
        styles.container,
        // Mobile: full width above the navigation bar + quick-add FAB.
        isMobile ? { left: 16, right: 16, bottom: 160, width: undefined } : null,
        elevation(3),
        {
          backgroundColor: t.surfaceContainerHigh,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [200, 0],
              }),
            },
          ],
          opacity: slideAnim,
        },
      ]}
    >
      <Pressable
        style={(s) => [styles.header, { backgroundColor: stateColor(t.surfaceContainerHigh, t.ink, s as PressState) }]}
        onPress={() => setIsCollapsed(!isCollapsed)}
        accessibilityRole="button"
        accessibilityState={{ expanded: !isCollapsed }}
      >
        <View style={styles.headerLeft}>
          <IconUpload size={18} color={t.primary} />
          <Text
            style={{
              fontFamily: FMFonts.sansMedium,
              fontSize: FMType.body,
              color: t.ink,
              marginLeft: 8,
            }}
          >
            {i18n.import_importing_count.replace("{count}", String(totalCount))}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={{ fontFamily: FMFonts.sans, fontSize: FMType.caption, color: t.inkSoft, marginRight: 8, fontVariant: ["tabular-nums"] }}>
            {i18n.import_progress
              .replace("{done}", String(completedCount))
              .replace("{total}", String(totalCount))}
          </Text>
          {isCollapsed ? <IconChevR size={14} color={t.inkSoft} /> : <IconChevD size={14} color={t.inkSoft} />}
        </View>
      </Pressable>

      <View style={[styles.progressBg, { backgroundColor: t.surfaceContainerHighest }]}>
        <View
          style={{
            backgroundColor: t.primary,
            borderRadius: 2,
            height: "100%",
            width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : "0%",
          }}
        />
      </View>

      {processingItem && !isCollapsed ? (
        <View style={[styles.processingBanner, { backgroundColor: t.secondaryContainer }]}>
          <IconRefresh size={14} color={t.onSecondaryContainer} />
          <Text
            style={{
              fontFamily: FMFonts.sansMedium,
              fontSize: FMType.caption,
              color: t.onSecondaryContainer,
              marginLeft: 6,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {processingItem.fileName} · {processingItem.progress}%
          </Text>
        </View>
      ) : null}

      {!isCollapsed ? (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {items.map((item, i) => (
            <ItemRow
              key={item.id}
              item={item}
              isFirst={i === 0}
              onRetry={() => retryItem(item.id)}
              onDismiss={() => removeItem(item.id)}
            />
          ))}
        </ScrollView>
      ) : null}
    </Animated.View>
  );
}

interface ItemRowProps {
  item: {
    id: string;
    fileName: string;
    status: QueueItemStatus;
    progress?: number;
    importedCount?: number;
    skippedCount?: number;
    error?: string;
  };
  isFirst: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}

function ItemRow({ item, isFirst, onRetry, onDismiss }: ItemRowProps) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  const dotColor =
    item.status === "completed"
      ? t.pos
      : item.status === "processing"
        ? t.primary
        : item.status === "failed"
          ? t.error
          : t.inkMuted;

  return (
    <View
      style={[
        styles.itemRow,
        { borderTopColor: t.outlineVariant, borderTopWidth: isFirst ? 0 : 1 },
      ]}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor, marginRight: 8 }} />
      <Text
        style={{
          fontFamily: FMFonts.mono,
          fontSize: FMType.caption,
          color: t.inkSoft,
          flex: 1,
          fontVariant: ["tabular-nums"],
        }}
        numberOfLines={1}
      >
        {item.fileName}
      </Text>
      {item.status === "processing" ? (
        <View style={{ flex: 1.4, flexDirection: "row", alignItems: "center", marginRight: 6 }}>
          <View style={[styles.miniBar, { backgroundColor: t.surfaceContainerHighest }]}>
            <View
              style={{
                width: `${item.progress ?? 0}%` as `${number}%`,
                height: "100%",
                backgroundColor: t.primary,
              }}
            />
          </View>
          <Text
            style={{
              fontFamily: FMFonts.mono,
              fontSize: FMType.caption,
              color: t.inkMuted,
              width: 32,
              textAlign: "right",
              fontVariant: ["tabular-nums"],
            }}
          >
            {Math.round(item.progress ?? 0)}%
          </Text>
        </View>
      ) : item.status === "completed" ? (
        <Text style={{ fontFamily: FMFonts.mono, fontSize: FMType.caption, color: t.inkSoft, marginRight: 6, fontVariant: ["tabular-nums"] }}>
          {i18n.import_imp_short.replace("{count}", String(item.importedCount ?? 0))} ·{" "}
          <Text style={{ color: (item.skippedCount ?? 0) > 0 ? t.warn : t.inkMuted }}>
            {i18n.import_dup_short.replace("{count}", String(item.skippedCount ?? 0))}
          </Text>
        </Text>
      ) : item.status === "failed" ? (
        <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: FMType.caption, color: t.neg, marginRight: 6, flex: 1 }} numberOfLines={1}>
          {item.error ?? i18n.import_status_failed}
        </Text>
      ) : (
        <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: FMType.caption, color: t.inkMuted, marginRight: 6 }}>
          {i18n.import_status_pending}
        </Text>
      )}
      {item.status === "failed" ? (
        <Button variant="text" size="sm" onPress={onRetry}>
          {i18n.import_retry_short}
        </Button>
      ) : null}
      {item.status === "completed" || item.status === "failed" ? (
        <IconButton icon={<IconClose size={16} />} label={i18n.close} onPress={onDismiss} size={32} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 360,
    maxHeight: 420,
    borderRadius: FMRadius.lg,
    overflow: "hidden",
    zIndex: 10000,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    marginHorizontal: 16,
    marginBottom: 8,
    overflow: "hidden",
  },
  processingBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    borderRadius: FMRadius.sm,
  },
  list: {
    flexGrow: 0,
    maxHeight: 280,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingVertical: 4,
  },
  miniBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: 8,
    overflow: "hidden",
  },
});
