import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { useThemeColor } from "../../hooks/use-theme-color";

import { useSettings } from "../../context/SettingsContext";

// const SCREEN_WIDTH = Dimensions.get("window").width; // Removed static width

interface Profile {
  id: string;
  name: string;
  color: string;
  initial: string;
  monthly: string;
  years: string;
  returnVal: string;
}

const PROFILE_COLORS = [
  "#00afdb",
  "#e6b800",
  "#4caf50",
  "#fe3d3d",
  "#9c27b0",
  "#ff9800",
];

export default function InvestScreen() {
  const colorScheme = useColorScheme();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const { i18n } = useSettings();
  const { width: windowWidth } = useWindowDimensions(); // Dynamic width
  // Custom card color based on since 'card' isn't in theme.ts
  const cardColor = colorScheme === "dark" ? "#1c1c1e" : "#f5f5f5";

  // State for inputs
  const [initialInvestment, setInitialInvestment] = useState("1000");
  const [monthlyInvestment, setMonthlyInvestment] = useState("150");
  const [years, setYears] = useState("10");
  const [interestRate, setInterestRate] = useState("7.09");

  // State for Profiles
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [modalVisible, setModalVisible] = useState(false); // Save/Edit Modal
  const [manageModalVisible, setManageModalVisible] = useState(false); // Manage List Modal
  const [newProfileName, setNewProfileName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PROFILE_COLORS[0]);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null); // New state to track if editing

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const storedProfiles = await AsyncStorage.getItem("etf_calc_profiles");
      if (storedProfiles) {
        setProfiles(JSON.parse(storedProfiles));
      }
    } catch (e) {
      console.error("Failed to load profiles", e);
    }
  };

  const saveProfile = async () => {
    if (!newProfileName.trim()) {
      Alert.alert("Error", "Please enter a profile name");
      return;
    }

    let updatedProfiles;

    if (editingProfileId) {
      // Update existing
      updatedProfiles = profiles.map((p) =>
        p.id === editingProfileId
          ? {
              ...p,
              name: newProfileName,
              color: selectedColor,
              initial: initialInvestment,
              monthly: monthlyInvestment,
              years: years,
              returnVal: interestRate,
            }
          : p,
      );
    } else {
      // Create new
      const newProfile: Profile = {
        id: Date.now().toString(),
        name: newProfileName,
        color: selectedColor,
        initial: initialInvestment,
        monthly: monthlyInvestment,
        years: years,
        returnVal: interestRate,
      };
      updatedProfiles = [...profiles, newProfile];
    }

    setProfiles(updatedProfiles);
    setModalVisible(false);
    setNewProfileName("");
    setEditingProfileId(null);
    try {
      await AsyncStorage.setItem(
        "etf_calc_profiles",
        JSON.stringify(updatedProfiles),
      );
    } catch (e) {
      Alert.alert("Error", "Failed to save profile");
    }
  };

  const applyProfile = (profile: Profile) => {
    setInitialInvestment(profile.initial);
    setMonthlyInvestment(profile.monthly);
    setYears(profile.years);
    setInterestRate(profile.returnVal);
  };

  const openEditModal = (profile: Profile) => {
    setNewProfileName(profile.name);
    setSelectedColor(profile.color);
    setEditingProfileId(profile.id);
    // Load values from profile to verify what is being saved?
    // User requested "change profiles", implying we might start with their values.
    // Let's populate the calculator with the profile values too so they can adjust them.
    applyProfile(profile);
    setModalVisible(true);
  };

  const deleteProfile = async (id: string) => {
    const updated = profiles.filter((p) => p.id !== id);
    setProfiles(updated);
    await AsyncStorage.setItem("etf_calc_profiles", JSON.stringify(updated));
  };

  const calculateData = useMemo(() => {
    const p = parseFloat(initialInvestment) || 0;
    const pm = parseFloat(monthlyInvestment) || 0;
    const y = parseFloat(years) || 1;
    const r = parseFloat(interestRate) || 0;

    const monthlyRate = r / 100 / 12;
    const months = y * 12;

    const dataTotalValue = [];
    const dataTotalInvested = [];

    let currentValue = p;
    let currentInvested = p;

    // Add start point (Year 0)
    dataTotalValue.push({
      value: p,
      label: new Date().getFullYear().toString(),
      dataPointText: "",
    });
    dataTotalInvested.push({ value: p, dataPointText: "" });

    for (let i = 1; i <= months; i++) {
      currentValue = (currentValue + pm) * (1 + monthlyRate);
      currentInvested += pm;

      if (i % 12 === 0) {
        const yearIndex = i / 12;
        const yearLabel = (new Date().getFullYear() + yearIndex).toString();
        dataTotalValue.push({
          value: parseFloat(currentValue.toFixed(2)),
          label: yearLabel,
        });
        dataTotalInvested.push({
          value: currentInvested,
        });
      }
    }

    return {
      dataTotalValue,
      dataTotalInvested,
      finalValue: currentValue,
      finalInvested: currentInvested,
    };
  }, [initialInvestment, monthlyInvestment, years, interestRate]);

  const handleReset = () => {
    setInitialInvestment("1000");
    setMonthlyInvestment("150");
    setYears("10");
    setInterestRate("7.09");
  };

  const currentDisplay = {
    value: calculateData.finalValue,
    invested: calculateData.finalInvested,
    gain: calculateData.finalValue - calculateData.finalInvested,
  };

  // Dynamic spacing
  const chartWidth = windowWidth - 40;
  const numPoints = calculateData.dataTotalValue.length;
  // Exact calculation to fit screen:
  // We reserve space for initialSpacing (10) and aim to use the rest.
  // We leave a small buffer (20) at the end to prevent clipping.
  const usableWidth = chartWidth - 10 - 20;
  // Ensure we don't divide by 0 if numPoints is 0 or 1
  const calculatedSpacing = numPoints > 1 ? usableWidth / (numPoints - 1) : 40;
  const initialSpacing = 10;

  // Helper to format Y-axis labels
  const formatYLabel = (startVal: string) => {
    const val = parseFloat(startVal);
    if (val >= 1000) {
      return `${Math.round(val / 1000)}k`;
    }
    return val.toString();
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
          showsHorizontalScrollIndicator={true} // Show indicator for better usability
          contentContainerStyle={styles.profilesScroll}
          persistentScrollbar={true} // For Android/Web visibility
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
              setNewProfileName("");
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
                        i18n.delete_profile_msg.replace("{name}", profile.name),
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

      {/* Results / Details Section - Always shows Summary */}
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
          spacing={calculatedSpacing > 0 ? calculatedSpacing : 20} // Ensure spacing is never 0 or negative
          initialSpacing={20} // Increased initial spacing
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
          // Interaction Disabled
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

      {/* Save Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, { backgroundColor: cardColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {editingProfileId
                ? i18n.edit_profile_title
                : i18n.save_profile_title}
            </Text>

            <Text
              style={[styles.inputLabel, { color: textColor, marginTop: 10 }]}
            >
              {i18n.profile_name_label}
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { color: textColor, borderColor: textColor },
              ]}
              value={newProfileName}
              onChangeText={setNewProfileName}
              placeholder="e.g. Retirement, House"
              placeholderTextColor="gray"
            />

            <Text
              style={[styles.inputLabel, { color: textColor, marginTop: 10 }]}
            >
              {i18n.profile_color_label}
            </Text>
            <View style={styles.colorPicker}>
              {PROFILE_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedColor,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>{i18n.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnSave}
                onPress={saveProfile}
              >
                <Text style={styles.modalBtnText}>
                  {editingProfileId ? i18n.update : i18n.save}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Profiles Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={manageModalVisible}
        onRequestClose={() => setManageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalView,
              { backgroundColor: cardColor, height: "60%" },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Text
                style={[
                  styles.modalTitle,
                  { color: textColor, marginBottom: 0 },
                ]}
              >
                {i18n.manage_profiles}
              </Text>
              <TouchableOpacity onPress={() => setManageModalVisible(false)}>
                <Text style={{ fontSize: 24, color: textColor }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {profiles.map((profile) => (
                <View
                  key={profile.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: textColor + "20",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: profile.color,
                        marginRight: 10,
                      }}
                    />
                    <Text
                      style={{
                        color: textColor,
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      {profile.name}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 15 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setManageModalVisible(false);
                        // Short timeout to allow modal to close smoothly
                        setTimeout(() => openEditModal(profile), 100);
                      }}
                    >
                      <Text style={{ color: "#00afdb", fontWeight: "bold" }}>
                        {i18n.edit}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        if (Platform.OS === "web") {
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
                        } else {
                          Alert.alert(
                            i18n.delete_profile_title,
                            i18n.delete_profile_msg.replace(
                              "{name}",
                              profile.name,
                            ),
                            [
                              { text: i18n.cancel, style: "cancel" },
                              {
                                text: i18n.delete,
                                style: "destructive",
                                onPress: () => deleteProfile(profile.id),
                              },
                            ],
                          );
                        }
                      }}
                    >
                      <Text style={{ color: "#fe3d3d", fontWeight: "bold" }}>
                        {i18n.delete}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.createProfileBtn}
              onPress={() => {
                setManageModalVisible(false);
                setEditingProfileId(null);
                setNewProfileName("");
                setTimeout(() => setModalVisible(true), 100);
              }}
            >
              <Text style={styles.modalBtnText}>{i18n.create_profile}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function InputGroup({
  label,
  subLabel,
  value,
  onChange,
  prefix,
  suffix,
  textColor,
  backgroundColor,
}: any) {
  const handleIncrement = () => {
    const val = parseFloat(value) || 0;
    onChange((val + 1).toString()); // Simple increment
  };
  const handleDecrement = () => {
    const val = parseFloat(value) || 0;
    onChange(Math.max(0, val - 1).toString());
  };

  return (
    <View style={[styles.inputGroup, { backgroundColor }]}>
      <View style={styles.inputLabelContainer}>
        <Text style={[styles.inputLabel, { color: textColor }]}>{label}</Text>
        <Text style={styles.inputSubLabel}>{subLabel}</Text>
      </View>
      <View style={styles.inputControls}>
        <TouchableOpacity onPress={handleDecrement} style={styles.controlBtn}>
          <Text style={[styles.controlBtnText, { color: textColor }]}>-</Text>
        </TouchableOpacity>
        <View style={styles.inputWrapper}>
          {prefix && (
            <Text style={[styles.affix, { color: textColor }]}>{prefix}</Text>
          )}
          <TextInput
            style={[
              styles.input,
              { color: textColor, backgroundColor: "transparent" },
              Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}, // Fix white box on web
            ]}
            value={value}
            onChangeText={onChange}
            keyboardType="numeric"
          />
          {suffix && (
            <Text style={[styles.affix, { color: textColor }]}>{suffix}</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleIncrement} style={styles.controlBtn}>
          <Text style={[styles.controlBtnText, { color: textColor }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  inputGroup: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
  },
  inputLabelContainer: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputSubLabel: {
    fontSize: 12,
    color: "gray",
  },
  inputControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnText: {
    fontSize: 20,
    fontWeight: "600",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    minWidth: 40,
    padding: 0,
  },
  affix: {
    fontSize: 16,
    fontWeight: "600",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    width: "80%",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
    marginBottom: 15,
  },
  colorPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  selectedColor: {
    borderWidth: 2,
    borderColor: "white",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalBtnCancel: {
    flex: 1,
    padding: 10,
    marginRight: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnSave: {
    flex: 1,
    backgroundColor: "#00afdb",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnText: {
    color: "white",
    fontWeight: "bold",
  },
  createProfileBtn: {
    backgroundColor: "#00afdb",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
    width: "100%",
  },
});
