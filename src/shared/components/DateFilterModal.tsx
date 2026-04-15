import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "react-native-ui-datepicker";

dayjs.extend(customParseFormat);

interface DateFilterModalProps {
  visible: boolean;
  title: string;
  tempFrom: string;
  tempTo: string;
  onTempFromChange: (value: string) => void;
  onTempToChange: (value: string) => void;
  onApply: () => void;
  onCancel: () => void;
  backgroundColor: string;
  textColor: string;
  tintColor: string;
}

export function DateFilterModal({
  visible,
  title,
  tempFrom,
  tempTo,
  onTempFromChange,
  onTempToChange,
  onApply,
  onCancel,
  backgroundColor,
  textColor,
  tintColor,
}: DateFilterModalProps) {
  const [range, setRange] = useState<{
    startDate: dayjs.Dayjs | undefined;
    endDate: dayjs.Dayjs | undefined;
  }>({
    startDate: tempFrom ? dayjs(tempFrom, "DD-MM-YYYY") : undefined,
    endDate: tempTo ? dayjs(tempTo, "DD-MM-YYYY") : undefined,
  });

  // Re-sync range when modal becomes visible or props change
  useEffect(() => {
    if (visible) {
      setRange({
        startDate: tempFrom ? dayjs(tempFrom, "DD-MM-YYYY") : undefined,
        endDate: tempTo ? dayjs(tempTo, "DD-MM-YYYY") : undefined,
      });
    }
  }, [visible, tempFrom, tempTo]);

  const handleApply = () => {
    if (range.startDate) {
      onTempFromChange(range.startDate.format("DD-MM-YYYY"));
    }
    if (range.endDate) {
      onTempToChange(range.endDate.format("DD-MM-YYYY"));
    }
    onApply();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          <Text style={[styles.modalTitle, { color: textColor }]}>{title}</Text>

          <ScrollView style={styles.pickerContainer}>
            <DateTimePicker
              mode="range"
              startDate={range.startDate}
              endDate={range.endDate}
              onChange={(params) =>
                setRange({
                  startDate: params.startDate
                    ? dayjs(params.startDate)
                    : undefined,
                  endDate: params.endDate ? dayjs(params.endDate) : undefined,
                })
              }
              styles={{
                month_selector_label: { color: textColor },
                year_selector_label: { color: textColor },
                button_next_image: { tintColor },
                button_prev_image: { tintColor },
                day_label: { color: textColor },
                weekday_label: { color: textColor, opacity: 0.6 },
                months: { backgroundColor },
                month_label: { color: textColor },
                years: { backgroundColor },
                year_label: { color: textColor },
                today: { borderColor: tintColor },
                today_label: { color: tintColor },
                selected: { backgroundColor: tintColor },
                range_fill: { backgroundColor: tintColor + "20" },
                range_start: { backgroundColor: tintColor },
                range_end: { backgroundColor: tintColor },
              }}
            />
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={onCancel} style={styles.modalButton}>
              <Text style={{ color: textColor }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApply}
              style={[styles.modalButton, { backgroundColor: tintColor }]}
            >
              <Text style={{ color: backgroundColor, fontWeight: "600" }}>
                Apply
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
});
