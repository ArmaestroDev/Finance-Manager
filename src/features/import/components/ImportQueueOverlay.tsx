import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FMFonts, FMRadius, FMType } from "@/src/constants/theme";
import {
  Button,
  IconButton,
  IconChevD,
  IconChevR,
  IconClose,
  IconUpload,
  PressState,
  elevation,
  stateColor,
  useFMTheme,
} from "@/src/shared/design";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { useImportQueue } from "../context/ImportQueueContext";
import type { QueueItem } from "../context/ImportQueueContext";

/** A run where everything succeeded closes itself after this long. */
const AUTO_CLOSE_MS = 6000;

// Floating import progress card. Closable: while imports run, × only hides it
// (they keep going); once everything finished, × clears the list. A run
// without failures clears itself; failures keep it on screen.
export function ImportQueueOverlay(): React.ReactElement | null {
  const t = useFMTheme();
  const { i18n } = useSettings();
  const { items, removeItem, retryItem } = useImportQueue();
  const isMobile = useIsMobileLayout();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [slideAnim] = useState(() => new Animated.Value(0));

  const totalCount = items.length;
  const finished = items.filter((i) => i.status === "completed" || i.status === "failed");
  const completedCount = items.filter((i) => i.status === "completed").length;
  const failedCount = items.filter((i) => i.status === "failed").length;
  const allDone = totalCount > 0 && finished.length === totalCount;
  const imported = items.reduce((s, i) => s + (i.importedCount ?? 0), 0);
  const skipped = items.reduce((s, i) => s + (i.skippedCount ?? 0), 0);

  // New files or a failure bring a hidden card back.
  const prevCount = useRef(totalCount);
  useEffect(() => {
    if (totalCount > prevCount.current) setHidden(false);
    prevCount.current = totalCount;
  }, [totalCount]);
  useEffect(() => {
    if (failedCount > 0) setHidden(false);
  }, [failedCount]);

  const clearFinished = () => finished.forEach((i) => removeItem(i.id));
  const clearRef = useRef(clearFinished);
  clearRef.current = clearFinished;

  useEffect(() => {
    if (!allDone || failedCount > 0) return;
    const timer = setTimeout(() => clearRef.current(), AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [allDone, failedCount]);

  const visible = totalCount > 0 && !hidden;
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 9,
    }).start();
  }, [visible, slideAnim]);

  if (!visible) return null;

  const title = allDone ? i18n.import_title_done : i18n.import_title_running;
  const summary = allDone
    ? [
        i18n.import_imp_short.replace("{count}", String(imported)),
        i18n.import_dup_short.replace("{count}", String(skipped)),
        failedCount > 0 ? i18n.import_failed_count.replace("{count}", String(failedCount)) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : i18n.import_progress.replace("{done}", String(finished.length)).replace("{total}", String(totalCount));

  return (
    <Animated.View
      style={[
        styles.container,
        // Mobile: full width above the navigation bar + quick-add FAB.
        isMobile ? { left: 16, right: 16, bottom: 160, width: undefined } : null,
        elevation(3),
        {
          backgroundColor: t.surfaceContainerHigh,
          transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [200, 0] }) }],
          opacity: slideAnim,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          style={(s) => [styles.headerMain, { backgroundColor: stateColor(t.surfaceContainerHigh, t.ink, s as PressState) }]}
          onPress={() => setIsCollapsed(!isCollapsed)}
          accessibilityRole="button"
          accessibilityState={{ expanded: !isCollapsed }}
          accessibilityLabel={`${title}, ${summary}`}
        >
          <IconUpload size={18} color={t.primary} />
          <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
            <Text numberOfLines={1} style={{ fontFamily: FMFonts.sansMedium, fontSize: FMType.body, color: t.ink }}>
              {title}
            </Text>
            <Text
              numberOfLines={1}
              style={{ fontFamily: FMFonts.sans, fontSize: FMType.caption, color: t.inkSoft, fontVariant: ["tabular-nums"] }}
            >
              {summary}
            </Text>
          </View>
          {isCollapsed ? <IconChevR size={16} color={t.inkSoft} /> : <IconChevD size={16} color={t.inkSoft} />}
        </Pressable>
        <IconButton
          icon={<IconClose size={18} />}
          label={allDone ? i18n.close : i18n.import_hide}
          onPress={() => (allDone ? clearFinished() : setHidden(true))}
          size={36}
        />
      </View>

      <View style={[styles.progressBg, { backgroundColor: t.surfaceContainerHighest }]}>
        <View
          style={{
            backgroundColor: failedCount > 0 && allDone ? t.error : t.primary,
            borderRadius: 2,
            height: "100%",
            width: `${totalCount > 0 ? ((completedCount + failedCount) / totalCount) * 100 : 0}%`,
          }}
        />
      </View>

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
  item: QueueItem;
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
  const caption = { fontFamily: FMFonts.sans, fontSize: FMType.caption, fontVariant: ["tabular-nums" as const] };

  return (
    <View style={[styles.itemRow, { borderTopColor: t.outlineVariant, borderTopWidth: isFirst ? 0 : StyleSheet.hairlineWidth }]}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor, marginRight: 12 }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: FMFonts.sans, fontSize: FMType.small, color: t.ink }}>
          {item.fileName}
        </Text>
        {item.status === "processing" ? (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
            <View style={[styles.miniBar, { backgroundColor: t.surfaceContainerHighest }]}>
              <View style={{ width: `${item.progress ?? 0}%`, height: "100%", backgroundColor: t.primary }} />
            </View>
            <Text style={[caption, { color: t.inkSoft, width: 36, textAlign: "right" }]}>
              {Math.round(item.progress ?? 0)}%
            </Text>
          </View>
        ) : item.status === "completed" ? (
          <Text numberOfLines={1} style={[caption, { color: t.inkSoft }]}>
            {i18n.import_imp_short.replace("{count}", String(item.importedCount ?? 0))} ·{" "}
            <Text style={{ color: (item.skippedCount ?? 0) > 0 ? t.warn : t.inkSoft }}>
              {i18n.import_dup_short.replace("{count}", String(item.skippedCount ?? 0))}
            </Text>
          </Text>
        ) : item.status === "failed" ? (
          <Text numberOfLines={2} style={[caption, { color: t.error }]}>
            {item.error ?? i18n.import_status_failed}
          </Text>
        ) : (
          <Text style={[caption, { color: t.inkSoft }]}>{i18n.import_status_pending}</Text>
        )}
      </View>
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
    width: 380,
    maxHeight: 440,
    borderRadius: FMRadius.lg,
    overflow: "hidden",
    zIndex: 10000,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  headerMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 12,
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    marginHorizontal: 16,
    marginBottom: 8,
    overflow: "hidden",
  },
  list: {
    flexGrow: 0,
    maxHeight: 300,
  },
  listContent: {
    paddingLeft: 16,
    paddingRight: 8,
    paddingBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    paddingVertical: 8,
    gap: 4,
  },
  miniBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: 8,
    overflow: "hidden",
  },
});
