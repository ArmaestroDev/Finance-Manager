import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAccounts } from "../../context/AccountsContext";
import { useSettings } from "../../context/SettingsContext";
import { useThemeColor } from "../../hooks/use-theme-color";

export default function HomeScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const router = useRouter();
  const { isBalanceHidden, i18n } = useSettings();
  const { accounts, refreshAccounts, isRefreshing, cashBalance } =
    useAccounts();

  const { totalAssets, totalLiabilities } = useMemo(() => {
    let assets = 0;
    let liabilities = 0;

    // Add Cash
    if (cashBalance >= 0) {
      assets += cashBalance;
    } else {
      liabilities += Math.abs(cashBalance);
    }

    accounts.forEach((acc) => {
      const balance = acc.balance || 0;
      if (balance >= 0) {
        assets += balance;
      } else {
        liabilities += Math.abs(balance);
      }
    });

    return { totalAssets: assets, totalLiabilities: liabilities };
  }, [accounts, cashBalance]);

  const onRefresh = () => {
    refreshAccounts();
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header with Settings */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: textColor }]}>
            {i18n.overview_title}
          </Text>
          <Text style={[styles.subtitle, { color: textColor, opacity: 0.6 }]}>
            {i18n.overview_subtitle}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/settings")}>
          <Ionicons name="settings-outline" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={tintColor}
          />
        }
      >
        {/* Total Assets Card */}
        <View style={[styles.card, { backgroundColor: tintColor }]}>
          <Text style={[styles.cardTitle, { color: backgroundColor }]}>
            {i18n.total_assets}
          </Text>
          <Text style={[styles.cardAmount, { color: backgroundColor }]}>
            {isBalanceHidden ? "*****" : `€${totalAssets.toFixed(2)}`}
          </Text>
        </View>

        {/* Total Liabilities Card */}
        {totalLiabilities > 0 && (
          <View style={[styles.card, { backgroundColor: "#ffcccc" }]}>
            <Text style={[styles.cardTitle, { color: "#cc0000" }]}>
              {i18n.total_liabilities}
            </Text>
            <Text style={[styles.cardAmount, { color: "#cc0000" }]}>
              {isBalanceHidden ? "*****" : `-€${totalLiabilities.toFixed(2)}`}
            </Text>
          </View>
        )}

        {/* Helper Text */}
        <Text
          style={{
            textAlign: "center",
            marginTop: 20,
            color: textColor,
            opacity: 0.5,
          }}
        >
          {isBalanceHidden ? i18n.balances_hidden : i18n.pull_to_refresh}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60, // Safe area roughly
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    opacity: 0.9,
  },
  cardAmount: {
    fontSize: 32,
    fontWeight: "700",
  },
});
