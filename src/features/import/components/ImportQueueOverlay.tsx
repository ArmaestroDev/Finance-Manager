import React, { useEffect, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FMFonts } from "@/src/constants/theme";
import {
  IconChevD,
  IconChevR,
  IconClose,
  IconRefresh,
  IconUpload,
  Label,
  useFMTheme,
} from "@/src/shared/design";
import { useImportQueue } from "../context/ImportQueueContext";
import type { QueueItemStatus } from "../context/ImportQueueContext";

export function ImportQueueOverlay(): React.ReactElement | null {
  const t = useFMTheme();
  const { items, removeItem, retryItem } = useImportQueue();
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
        {
          backgroundColor: t.surface,
          borderColor: t.lineStrong,
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
        style={[styles.header, { borderBottomColor: t.line }]}
        onPress={() => setIsCollapsed(!isCollapsed)}
      >
        <View style={styles.headerLeft}>
          <IconUpload size={14} color={t.accent} />
          <Text
            style={{
              fontFamily: FMFonts.sansSemibold,
              fontSize: 12,
              color: t.ink,
              marginLeft: 8,
            }}
          >
            Importing {totalCount} statement{totalCount === 1 ? "" : "s"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={{ fontFamily: FMFonts.sans, fontSize: 11, color: t.inkMuted, marginRight: 8 }}>
            {completedCount} of {totalCount} complete
          </Text>
          {isCollapsed ? <IconChevR size={11} color={t.inkMuted} /> : <IconChevD size={11} color={t.inkMuted} />}
        </View>
      </Pressable>

      <View style={[styles.progressBg, { backgroundColor: t.surfaceAlt }]}>
        <View
          style={{
            backgroundColor: t.accent,
            height: "100%",
            width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : "0%",
          }}
        />
      </View>

      {processingItem && !isCollapsed ? (
        <View style={[styles.processingBanner, { backgroundColor: t.accentSoft }]}>
          <IconRefresh size={11} color={t.accent} />
          <Text
            style={{
              fontFamily: FMFonts.sansMedium,
              fontSize: 11,
              color: t.accent,
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
  const dotColor =
    item.status === "completed"
      ? t.pos
      : item.status === "processing"
        ? t.accent
        : item.status === "failed"
          ? t.neg
          : t.inkMuted;

  return (
    <View
      style={[
        styles.itemRow,
        { borderTopColor: t.line, borderTopWidth: isFirst ? 0 : 1 },
      ]}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor, marginRight: 8 }} />
      <Text
        style={{
          fontFamily: FMFonts.mono,
          fontSize: 11,
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
          <View style={[styles.miniBar, { backgroundColor: t.surfaceAlt }]}>
            <View
              style={{
                width: `${item.progress ?? 0}%` as `${number}%`,
                height: "100%",
                backgroundColor: t.accent,
              }}
            />
          </View>
          <Text
            style={{
              fontFamily: FMFonts.mono,
              fontSize: 10,
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
        <Text style={{ fontFamily: FMFonts.mono, fontSize: 11, color: t.inkSoft, marginRight: 6, fontVariant: ["tabular-nums"] }}>
          {item.importedCount ?? 0} imp ·{" "}
          <Text style={{ color: (item.skippedCount ?? 0) > 0 ? t.warn : t.inkMuted }}>
            {item.skippedCount ?? 0} dup
          </Text>
        </Text>
      ) : item.status === "failed" ? (
        <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 11, color: t.neg, marginRight: 6, flex: 1 }} numberOfLines={1}>
          {item.error ?? "Failed"}
        </Text>
      ) : (
        <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 11, color: t.inkMuted, marginRight: 6 }}>
          Pending
        </Text>
      )}
      {item.status === "failed" ? (
        <Pressable onPress={onRetry} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginRight: 6 })}>
          <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 10.5, color: t.accent }}>RETRY</Text>
        </Pressable>
      ) : null}
      {item.status === "completed" || item.status === "failed" ? (
        <Pressable onPress={onDismiss} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <IconClose size={12} color={t.inkMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 20 : 96,
    right: 20,
    width: 360,
    maxHeight: 420,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 10000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
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
    height: 2,
    width: "100%",
  },
  processingBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  list: {
    flexGrow: 0,
    maxHeight: 280,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  miniBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: 8,
    overflow: "hidden",
  },
});
