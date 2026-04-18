import React, { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useColorScheme } from "../../../../shared/hooks/use-color-scheme";
import { LineChart } from "react-native-gifted-charts";
import { useThemeColor } from "../../../../shared/hooks/use-theme-color";
import { useSettings } from "../../../../shared/context/SettingsContext";
import { useInvestCalculator, type Profile } from "../../hooks/useInvestCalculator";
import { InputGroup } from "../../../../shared/components/InputGroup";
import { InvestProfileModal } from "./InvestProfileModal";
import { ManageProfilesModal } from "./ManageProfilesModal";

export function InvestScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const surfaceColor = useThemeColor({}, "surface");
  const tintColor = useThemeColor({}, "tint");
  const { i18n } = useSettings();
  const { width: windowWidth } = useWindowDimensions();
  const cardColor = colorScheme === "dark" ? "#1c1c1e" : "#f5f5f5";

  const { initialInvestment, setInitialInvestment, monthlyInvestment, setMonthlyInvestment, years, setYears, interestRate, setInterestRate, profiles, editingProfileId, setEditingProfileId, calculateData, currentDisplay, saveProfile, applyProfile, deleteProfile, handleReset } = useInvestCalculator();

  const [modalVisible, setModalVisible] = useState(false);
  const [manageModalVisible, setManageModalVisible] = useState(false);

  // Chart sizing for desktop — use half the window width
  const chartWidth = Math.min(windowWidth * 0.5, 600);
  const numPoints = calculateData.dataTotalValue.length;
  const usableWidth = chartWidth - 30;
  const calculatedSpacing = numPoints > 1 ? usableWidth / (numPoints - 1) : 40;

  const formatYLabel = (startVal: string) => {
    const val = parseFloat(startVal);
    return val >= 1000 ? `${Math.round(val / 1000)}k` : val.toString();
  };

  const openEditModal = (profile: Profile) => {
    setEditingProfileId(profile.id);
    applyProfile(profile);
    setModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: textColor + "10" }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.pageTitle, { color: textColor }]}>{i18n.invest_title}</Text>
          <TouchableOpacity onPress={handleReset} style={[styles.resetBtn, { backgroundColor: textColor + "10" }]}>
            <Text style={{ color: textColor, fontWeight: "600", fontSize: 13 }}>{i18n.reset}</Text>
          </TouchableOpacity>
        </View>
        {/* Profile chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8, alignItems: "center" }}>
          <TouchableOpacity style={[styles.profileChip, { backgroundColor: textColor + "10" }]} onPress={() => setManageModalVisible(true)}>
            <Text style={{ color: textColor, fontWeight: "600", fontSize: 13 }}>⚙️ {i18n.manage_profiles}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.profileChip, { backgroundColor: tintColor + "20" }]} onPress={() => { setEditingProfileId(null); setModalVisible(true); }}>
            <Text style={{ color: tintColor, fontWeight: "600", fontSize: 13 }}>+ {i18n.save}</Text>
          </TouchableOpacity>
          {profiles.map((profile) => (
            <TouchableOpacity
              key={profile.id}
              style={[styles.profileChip, { backgroundColor: profile.color }]}
              onPress={() => applyProfile(profile)}
              onLongPress={() => {
                if (Platform.OS === "web") {
                  const choice = window.confirm(`${i18n.edit_profile_title} ${profile.name}?\nOK to Edit, Cancel to Delete.`);
                  if (choice) { openEditModal(profile); }
                  else if (window.confirm(i18n.delete_profile_msg.replace("{name}", profile.name))) { deleteProfile(profile.id); }
                } else {
                  Alert.alert(i18n.edit_profile_title, profile.name, [{ text: i18n.cancel, style: "cancel" }, { text: i18n.edit, onPress: () => openEditModal(profile) }, { text: i18n.delete, style: "destructive", onPress: () => deleteProfile(profile.id) }]);
                }
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>{profile.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Two-column desktop layout */}
      <View style={styles.twoColumn}>
        {/* Left: inputs + results */}
        <ScrollView style={[styles.leftPanel, { borderRightColor: textColor + "10" }]} contentContainerStyle={styles.leftContent}>
          <Text style={[styles.sectionLabel, { color: textColor }]}>INPUTS</Text>
          <View style={styles.inputsRow}>
            <InputGroup label={i18n.initial_inv} subLabel={i18n.initial_inv_sub} value={initialInvestment} onChange={setInitialInvestment} prefix="€" textColor={textColor} backgroundColor={cardColor} />
            <InputGroup label={i18n.monthly_inv} subLabel={i18n.monthly_inv_sub} value={monthlyInvestment} onChange={setMonthlyInvestment} prefix="€" textColor={textColor} backgroundColor={cardColor} />
          </View>
          <View style={styles.inputsRow}>
            <InputGroup label={i18n.duration} subLabel={i18n.duration_sub} value={years} onChange={setYears} suffix={i18n.years_suffix} textColor={textColor} backgroundColor={cardColor} />
            <InputGroup label={i18n.est_return} subLabel={i18n.est_return_sub} value={interestRate} onChange={setInterestRate} suffix="%" textColor={textColor} backgroundColor={cardColor} />
          </View>

          <Text style={[styles.sectionLabel, { color: textColor, marginTop: 24 }]}>RESULTS</Text>
          <View style={[styles.resultsGrid, { backgroundColor: surfaceColor }]}>
            <View style={styles.resultItem}>
              <Text style={[styles.resultLabel, { color: textColor }]}>{i18n.total_value}</Text>
              <Text style={[styles.resultValue, { color: "#00afdb" }]}>
                €{currentDisplay.value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[styles.resultDivider, { backgroundColor: textColor + "10" }]} />
            <View style={styles.resultItem}>
              <Text style={[styles.resultLabel, { color: textColor }]}>{i18n.total_invested}</Text>
              <Text style={[styles.resultValue, { color: "#e6b800" }]}>
                €{currentDisplay.invested.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[styles.resultDivider, { backgroundColor: textColor + "10" }]} />
            <View style={styles.resultItem}>
              <Text style={[styles.resultLabel, { color: textColor }]}>{i18n.total_gain}</Text>
              <Text style={[styles.resultValue, { color: "#4caf50" }]}>
                +€{currentDisplay.gain.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Right: chart */}
        <ScrollView style={styles.rightPanel} contentContainerStyle={styles.rightContent}>
          <Text style={[styles.sectionLabel, { color: textColor }]}>GROWTH CHART</Text>
          <View style={{ overflow: "hidden" }}>
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
          </View>
          <Text style={[styles.note, { color: textColor }]}>
            {i18n.graph_note.replace("{years}", years)}
          </Text>
        </ScrollView>
      </View>

      <InvestProfileModal visible={modalVisible} isEditing={!!editingProfileId} onSave={(name, color) => { saveProfile(name, color); setModalVisible(false); }} onClose={() => setModalVisible(false)} textColor={textColor} cardColor={cardColor} i18n={i18n} />
      <ManageProfilesModal visible={manageModalVisible} profiles={profiles} onEdit={openEditModal} onDelete={deleteProfile} onCreateNew={() => { setEditingProfileId(null); setModalVisible(true); }} onClose={() => setManageModalVisible(false)} textColor={textColor} cardColor={cardColor} i18n={i18n} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 32, paddingVertical: 16, borderBottomWidth: 1 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pageTitle: { fontSize: 26, fontWeight: "800" },
  resetBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  profileChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  twoColumn: { flex: 1, flexDirection: "row" },
  leftPanel: { width: 380, borderRightWidth: 1 },
  leftContent: { padding: 24, paddingBottom: 40 },
  rightPanel: { flex: 1 },
  rightContent: { padding: 24, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, opacity: 0.5, marginBottom: 16 },
  inputsRow: { flexDirection: "row", gap: 12, marginBottom: 0 },
  resultsGrid: { borderRadius: 16, padding: 20, gap: 16 },
  resultItem: { gap: 4 },
  resultDivider: { height: 1 },
  resultLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.5 },
  resultValue: { fontSize: 24, fontWeight: "800" },
  note: { marginTop: 16, fontSize: 12, fontStyle: "italic", opacity: 0.5, textAlign: "center" },
});
