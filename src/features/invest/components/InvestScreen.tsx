import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { useThemeColor } from "../../../shared/hooks/use-theme-color";
import { useSettings } from "../../../shared/context/SettingsContext";

// ── Hooks ──
import {
  useInvestCalculator,
  type Profile,
} from "../hooks/useInvestCalculator";

// ── Components ──
import { InputGroup } from "../../../shared/components/InputGroup";
import { InvestProfileModal } from "./InvestProfileModal";
import { ManageProfilesModal } from "./ManageProfilesModal";

export function InvestScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const { i18n } = useSettings();
  const { width: windowWidth } = useWindowDimensions();
  const cardColor = colorScheme === "dark" ? "#1c1c1e" : "#f5f5f5";

  // ── Calculator hook ──
  const {
    initialInvestment,
    setInitialInvestment,
    monthlyInvestment,
    setMonthlyInvestment,
    years,
    setYears,
    interestRate,
    setInterestRate,
    profiles,
    editingProfileId,
    setEditingProfileId,
    calculateData,
    currentDisplay,
    saveProfile,
    applyProfile,
    deleteProfile,
    handleReset,
  } = useInvestCalculator();

  // ── UI-only modal state ──
  const [modalVisible, setModalVisible] = useState(false);
  const [manageModalVisible, setManageModalVisible] = useState(false);

  // ── Chart sizing ──
  const chartWidth = windowWidth - 40;
  const numPoints = calculateData.dataTotalValue.length;
  const usableWidth = chartWidth - 10 - 20;
  const calculatedSpacing = numPoints > 1 ? usableWidth / (numPoints - 1) : 40;

  const formatYLabel = (startVal: string) => {
    const val = parseFloat(startVal);
    if (val >= 1000) {
      return `${Math.round(val / 1000)}k`;
    }
    return val.toString();
  };

  const openEditModal = (profile: Profile) => {
    setEditingProfileId(profile.id);
    applyProfile(profile);
    setModalVisible(true);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.contentContainer}
      scrollEnabled={true}
    >
      {/* Profiles Section */}
      <View style={styles.profilesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.profilesScroll}
          persistentScrollbar={true}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={[styles.addProfileBtn, { borderColor: textColor }]}
            onPress={() => setManageModalVisible(true)}
          >
            <Text style={[styles.addProfileText, { color: textColor }]}>
              ⚙️ {i18n.manage_profiles}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addProfileBtn, { borderColor: textColor }]}
            onPress={() => {
              setEditingProfileId(null);
              setModalVisible(true);
            }}
          >
            <Text style={[styles.addProfileText, { color: textColor }]}>
              + {i18n.save}
            </Text>
          </TouchableOpacity>
          {profiles.map((profile) => (
            <TouchableOpacity
              key={profile.id}
              style={[styles.profileChip, { backgroundColor: profile.color }]}
              onPress={() => applyProfile(profile)}
              onLongPress={() => {
                if (Platform.OS === "web") {
                  const choice = window.confirm(
                    `${i18n.edit_profile_title} ${profile.name}?\nOK to Edit, Cancel to Delete.`,
                  );
                  if (choice) {
                    openEditModal(profile);
                  } else {
                    if (
                      window.confirm(
                        i18n.delete_profile_msg.replace(
                          "{name}",
                          profile.name,
                        ),
                      )
                    ) {
                      deleteProfile(profile.id);
                    }
                  }
                } else {
                  Alert.alert(i18n.edit_profile_title, profile.name, [
                    { text: i18n.cancel, style: "cancel" },
                    {
                      text: i18n.edit,
                      onPress: () => openEditModal(profile),
                    },
                    {
                      text: i18n.delete,
                      style: "destructive",
                      onPress: () => deleteProfile(profile.id),
                    },
                  ]);
                }
              }}
            >
              <Text style={styles.profileChipText}>{profile.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          {i18n.invest_title}
        </Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
          <Text style={[styles.resetButtonText, { color: textColor }]}>
            {i18n.reset}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Input Section */}
      <View style={styles.inputsRow}>
        <InputGroup
          label={i18n.initial_inv}
          subLabel={i18n.initial_inv_sub}
          value={initialInvestment}
          onChange={setInitialInvestment}
          prefix="€"
          textColor={textColor}
          backgroundColor={cardColor}
        />
        <InputGroup
          label={i18n.monthly_inv}
          subLabel={i18n.monthly_inv_sub}
          value={monthlyInvestment}
          onChange={setMonthlyInvestment}
          prefix="€"
          textColor={textColor}
          backgroundColor={cardColor}
        />
      </View>
      <View style={styles.inputsRow}>
        <InputGroup
          label={i18n.duration}
          subLabel={i18n.duration_sub}
          value={years}
          onChange={setYears}
          suffix={i18n.years_suffix}
          textColor={textColor}
          backgroundColor={cardColor}
        />
        <InputGroup
          label={i18n.est_return}
          subLabel={i18n.est_return_sub}
          value={interestRate}
          onChange={setInterestRate}
          suffix="%"
          textColor={textColor}
          backgroundColor={cardColor}
        />
      </View>

      {/* Results Section */}
      <View
        style={[
          styles.resultsContainer,
          { backgroundColor: cardColor, shadowColor: textColor },
        ]}
      >
        <View style={styles.resultItem}>
          <Text style={[styles.resultLabel, { color: textColor }]}>
            {i18n.total_value}
          </Text>
          <Text style={[styles.resultValue, { color: "#00afdb" }]}>
            €
            {currentDisplay.value.toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
        <View style={styles.resultItem}>
          <Text style={[styles.resultLabel, { color: textColor }]}>
            {i18n.total_invested}
          </Text>
          <Text style={[styles.resultValue, { color: "#e6b800" }]}>
            €
            {currentDisplay.invested.toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
        <View style={styles.resultItem}>
          <Text style={[styles.resultLabel, { color: textColor }]}>
            {i18n.total_gain}
          </Text>
          <Text style={[styles.resultValue, { color: "#4caf50" }]}>
            +€
            {currentDisplay.gain.toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      </View>

      {/* Chart Section */}
      <View
        style={[styles.chartContainer, { height: 320, overflow: "hidden" }]}
      >
        <LineChart
          data={calculateData.dataTotalValue}
          data2={calculateData.dataTotalInvested}
          height={300}
          width={chartWidth}
          spacing={calculatedSpacing > 0 ? calculatedSpacing : 20}
          initialSpacing={20}
          color1="#8E1E5E"
          color2="#9CA3AF"
          textColor1={textColor}
          dataPointsColor1="#8E1E5E"
          dataPointsColor2="#9CA3AF"
          dataPointsShape1="circular"
          dataPointsShape2="circular"
          dataPointsRadius1={4}
          dataPointsRadius2={4}
          thickness={3}
          startFillColor1="#8E1E5E"
          endFillColor1="#8E1E5E"
          startOpacity1={0.15}
          endOpacity1={0.0}
          areaChart1
          yAxisTextStyle={{ color: "gray", fontSize: 11 }}
          yAxisLabelWidth={40}
          formatYLabel={formatYLabel}
          noOfSections={5}
          showStripOnFocus={false}
          showTextOnFocus={false}
          xAxisColor={textColor}
          xAxisThickness={1}
          xAxisIndicesHeight={5}
          xAxisIndicesColor={textColor}
          xAxisLabelTextStyle={{ color: textColor, fontSize: 10, width: 60 }}
          hideRules={false}
          rulesColor="#E5E7EB"
          showVerticalLines={false}
          yAxisColor={textColor}
          yAxisThickness={1}
        />
        <Text style={[styles.note, { color: textColor }]}>
          {i18n.graph_note.replace("{years}", years)}
        </Text>
      </View>

      {/* ── Modals ── */}
      <InvestProfileModal
        visible={modalVisible}
        isEditing={!!editingProfileId}
        onSave={(name, color) => {
          saveProfile(name, color);
          setModalVisible(false);
        }}
        onClose={() => setModalVisible(false)}
        textColor={textColor}
        cardColor={cardColor}
        i18n={i18n}
      />

      <ManageProfilesModal
        visible={manageModalVisible}
        profiles={profiles}
        onEdit={openEditModal}
        onDelete={deleteProfile}
        onCreateNew={() => {
          setEditingProfileId(null);
          setModalVisible(true);
        }}
        onClose={() => setManageModalVisible(false)}
        textColor={textColor}
        cardColor={cardColor}
        i18n={i18n}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 64,
  },
  profilesContainer: {
    marginTop: 0,
    marginBottom: 24,
  },
  profilesScroll: {
    alignItems: "center",
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  addProfileBtn: {
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 12,
    backgroundColor: "rgba(142, 30, 94, 0.1)", // Primary Light
  },
  addProfileText: {
    fontWeight: "600",
    fontSize: 15,
  },
  profileChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    marginRight: 12,
  },
  profileChipText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
  },
  resetButton: {
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 999,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 0,
  },
  resultsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 24,
    padding: 24,
    marginVertical: 32,
    shadowColor: "#8E1E5E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    backgroundColor: "#FFFFFF",
  },
  resultItem: {
    alignItems: "center",
  },
  resultLabel: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "500",
  },
  resultValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  chartContainer: {
    marginTop: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  note: {
    marginTop: 24,
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    opacity: 0.6,
  },
});
