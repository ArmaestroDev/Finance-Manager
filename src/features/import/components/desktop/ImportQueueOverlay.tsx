import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useThemeColor } from "../../../../shared/hooks/use-theme-color";
import { useImportQueue } from "../../context/ImportQueueContext";
import type { QueueItemStatus } from "../../context/ImportQueueContext";

function getStatusDisplay(
  status: QueueItemStatus,
  tintColor: string,
): { icon: keyof typeof Ionicons.glyphMap; color: string; label: string } {
  switch (status) {
    case "idle":
      return { icon: "time-outline", color: "#9CA3AF", label: "Pending" };
    case "processing":
      return { icon: "sync-outline", color: tintColor, label: "Processing..." };
    case "waiting":
      return { icon: "hourglass-outline", color: "#F59E0B", label: "Cooldown" };
    case "completed":
      return { icon: "checkmark-circle", color: "#10B981", label: "Completed" };
    case "failed":
      return { icon: "alert-circle", color: "#F43F5E", label: "Failed" };
    default:
      return { icon: "help-outline", color: "#9CA3AF", label: "Unknown" };
  }
}

export function ImportQueueOverlay(): React.ReactElement | null {
  const { items, skipWait, removeItem, retryItem } = useImportQueue();
  const [now, setNow] = useState<number>(Date.now());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [slideAnim] = useState(() => new Animated.Value(0));

  const backgroundColor = useThemeColor({}, "surface");
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const tintColor = useThemeColor({}, "tint");
  const borderColor = useThemeColor({}, "border");

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: items.length > 0 ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 9,
    }).start();
  }, [items.length > 0, slideAnim]);

  if (items.length === 0) return null;

  const completedCount = items.filter((i) => i.status === "completed").length;
  const totalCount = items.length;
  const processingItem = items.find((i) => i.status === "processing");

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
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
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsCollapsed(!isCollapsed)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="cloud-upload-outline" size={20} color={tintColor} />
          <Text style={[styles.headerTitle, { color: textColor }]}>
            Import Queue
          </Text>
          <View style={[styles.badge, { backgroundColor: tintColor + "20" }]}>
            <Text style={[styles.badgeText, { color: tintColor }]}>
              {completedCount}/{totalCount}
            </Text>
          </View>
        </View>
        <Ionicons
          name={isCollapsed ? "chevron-up" : "chevron-down"}
          size={20}
          color={textSecondary}
        />
      </TouchableOpacity>

      {/* Progress Bar */}
      <View style={[styles.progressBarBg, { backgroundColor: borderColor }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              backgroundColor: tintColor,
              width:
                totalCount > 0
                  ? `${(completedCount / totalCount) * 100}%`
                  : "0%",
            },
          ]}
        />
      </View>

      {/* Processing Status */}
      {processingItem && !isCollapsed && (
        <View style={[styles.processingBanner, { backgroundColor: tintColor + "10" }]}>
          <Ionicons name="sync-outline" size={14} color={tintColor} />
          <Text
            style={[styles.processingText, { color: tintColor }]}
            numberOfLines={1}
          >
            Processing: {processingItem.fileName}
          </Text>
        </View>
      )}

      {/* Item List */}
      {!isCollapsed && (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {items.map((item) => {
            const statusInfo = getStatusDisplay(item.status, tintColor);
            const isWaiting = item.status === "waiting" && item.scheduledAt != null;
            const timeLeft = isWaiting
              ? Math.max(0, Math.ceil(((item.scheduledAt as number) - now) / 1000))
              : 0;

            return (
              <View
                key={item.id}
                style={[styles.itemRow, { borderBottomColor: borderColor }]}
              >
                <Ionicons
                  name={statusInfo.icon}
                  size={18}
                  color={statusInfo.color}
                  style={styles.itemIcon}
                />
                <View style={styles.itemInfo}>
                  <Text
                    style={[styles.itemFileName, { color: textColor }]}
                    numberOfLines={1}
                  >
                    {item.fileName}
                  </Text>
                  <Text style={[styles.itemStatus, { color: statusInfo.color }]}>
                    {item.status === "processing" && `${statusInfo.label} ${item.progress}%`}
                    {item.status === "waiting" && `Starting in ${timeLeft}s`}
                    {item.status === "completed" && `✓ ${item.resultTransactions?.length ?? 0} transactions`}
                    {item.status === "failed" && (item.error ?? "Unknown error")}
                    {item.status === "idle" && statusInfo.label}
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  {item.status === "waiting" && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: tintColor }]}
                      onPress={() => skipWait(item.id)}
                    >
                      <Text style={styles.actionBtnText}>Skip Wait</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === "failed" && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#F59E0B" }]}
                      onPress={() => retryItem(item.id)}
                    >
                      <Text style={styles.actionBtnText}>Retry</Text>
                    </TouchableOpacity>
                  )}
                  {(item.status === "completed" || item.status === "failed") && (
                    <TouchableOpacity
                      onPress={() => removeItem(item.id)}
                      style={styles.dismissBtn}
                    >
                      <Ionicons name="close" size={16} color={textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 420,
    maxHeight: 480,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    zIndex: 10000,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 15, fontWeight: "700" },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  progressBarBg: { height: 3, width: "100%" },
  progressBarFill: { height: "100%", borderRadius: 2 },
  processingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  processingText: { fontSize: 13, fontWeight: "600", flex: 1 },
  list: { flexGrow: 0, maxHeight: 340 },
  listContent: { paddingHorizontal: 16, paddingBottom: 12 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  itemIcon: { width: 24, textAlign: "center" },
  itemInfo: { flex: 1, gap: 3 },
  itemFileName: { fontSize: 13, fontWeight: "600" },
  itemStatus: { fontSize: 12 },
  itemActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  actionBtnText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  dismissBtn: { padding: 6 },
});
