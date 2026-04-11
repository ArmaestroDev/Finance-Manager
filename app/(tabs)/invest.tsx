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
import { useThemeColor } from "../../hooks/use-theme-color";
import { useSettings } from "../../context/SettingsContext";

// ── Hooks ──
import {
  useInvestCalculator,
  type Profile,
} from "../../hooks/useInvestCalculator";

// ── Components ──
import { InputGroup } from "../../components/InputGroup";
import { InvestProfileModal } from "../../components/InvestProfileModal";
import { ManageProfilesModal } from "../../components/ManageProfilesModal";

export default function InvestScreen() {
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
          color1="#00afdb"
          color2="#e6b800"
          textColor1={textColor}
          dataPointsColor1="#00afdb"
          dataPointsColor2="#e6b800"
          dataPointsShape1="circular"
          dataPointsShape2="circular"
          dataPointsRadius1={4}
          dataPointsRadius2={4}
          thickness={3}
          startFillColor1="#00afdb"
          endFillColor1="#00afdb"
          startOpacity1={0.2}
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
          hideRules={true}
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
    padding: 16,
    paddingBottom: 40,
  },
  profilesContainer: {
    marginTop: 40,
    marginBottom: 10,
  },
  profilesScroll: {
    alignItems: "center",
    paddingHorizontal: 4,
  },
  addProfileBtn: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
  },
  addProfileText: {
    fontWeight: "600",
  },
  profileChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  profileChipText: {
    color: "#fff",
    fontWeight: "600",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },
  resetButton: {
    padding: 8,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  resultsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 16,
    marginVertical: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resultItem: {
    alignItems: "center",
  },
  resultLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  chartContainer: {
    marginTop: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  note: {
    marginTop: 10,
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
  },
});
