import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/de";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

dayjs.extend(customParseFormat);
dayjs.extend(isoWeek);

interface DateFilterModalProps {
  visible: boolean;
  title: string;
  tempFrom: string;
  tempTo: string;
  onTempFromChange: (value: string) => void;
  onTempToChange: (value: string) => void;
  onApply: (from: string, to: string) => void;
  onCancel: () => void;
  backgroundColor: string;
  textColor: string;
  tintColor: string;
  i18n: Record<string, string>;
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
  i18n,
}: DateFilterModalProps) {
  useEffect(() => {
    if (i18n.german === "Deutsch") {
      dayjs.locale("de");
    } else {
      dayjs.locale("en");
    }
  }, [i18n]);

  const [range, setRange] = useState<{
    startDate: dayjs.Dayjs | undefined;
    endDate: dayjs.Dayjs | undefined;
  }>({
    startDate: tempFrom ? dayjs(tempFrom, "DD.MM.YYYY") : undefined,
    endDate: tempTo ? dayjs(tempTo, "DD.MM.YYYY") : undefined,
  });

  const [fromText, setFromText] = useState(tempFrom || "");
  const [toText, setToText] = useState(tempTo || "");
  const [activeInput, setActiveInput] = useState<"from" | "to" | null>(null);
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf("month"));

  useEffect(() => {
    if (visible) {
      const start = tempFrom ? dayjs(tempFrom, "DD.MM.YYYY") : dayjs().startOf("month");
      const end = tempTo ? dayjs(tempTo, "DD.MM.YYYY") : dayjs();

      setRange({ startDate: start, endDate: end });
      setFromText(start.format("DD.MM.YYYY"));
      setToText(end.format("DD.MM.YYYY"));
      setActiveInput(null);

      if (start.isValid()) {
        setCurrentMonth(start.startOf("month"));
      } else {
        setCurrentMonth(dayjs().startOf("month"));
      }
    }
  }, [visible, tempFrom, tempTo]);

  const handleApply = () => {
    const s = range.startDate ? range.startDate.format("DD.MM.YYYY") : fromText;
    const e = range.endDate ? range.endDate.format("DD.MM.YYYY") : toText;
    onTempFromChange(s);
    onTempToChange(e);
    onApply(s, e);
  };

  const handleFromTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    setFromText(cleaned);
    if (cleaned.length === 10) {
      const parsed = dayjs(cleaned, "DD.MM.YYYY", true);
      if (parsed.isValid()) {
        setRange((prev) => ({ ...prev, startDate: parsed }));
        setCurrentMonth(parsed.startOf("month"));
      }
    }
  };

  const handleToTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    setToText(cleaned);
    if (cleaned.length === 10) {
      const parsed = dayjs(cleaned, "DD.MM.YYYY", true);
      if (parsed.isValid()) {
        setRange((prev) => ({ ...prev, endDate: parsed }));
        setCurrentMonth(parsed.startOf("month"));
      }
    }
  };

  const handleDayPress = (day: dayjs.Dayjs) => {
    if (activeInput === "from") {
      setRange((prev) => ({ ...prev, startDate: day }));
      setFromText(day.format("DD.MM.YYYY"));
    } else if (activeInput === "to") {
      setRange((prev) => ({ ...prev, endDate: day }));
      setToText(day.format("DD.MM.YYYY"));
    }
  };

  const renderCalendar = () => {
    const start = currentMonth.startOf("month");
    const end = currentMonth.endOf("month");
    const days: (dayjs.Dayjs | null)[] = [];

    const startWeekday = start.isoWeekday();
    for (let i = 1; i < startWeekday; i++) days.push(null);
    for (let i = 1; i <= end.date(); i++) days.push(start.date(i));
    const endWeekday = end.isoWeekday();
    for (let i = endWeekday + 1; i <= 7; i++) days.push(null);

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    const weekdays = i18n.german === "Deutsch" 
      ? ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
      : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.monthHeader}>
          <TouchableOpacity
            onPress={() => setCurrentMonth(currentMonth.subtract(1, "month"))}
            style={styles.arrowButton}
          >
            <Ionicons name="chevron-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: textColor }]}>
            {currentMonth.format("MMMM YYYY")}
          </Text>
          <TouchableOpacity
            onPress={() => setCurrentMonth(currentMonth.add(1, "month"))}
            style={styles.arrowButton}
          >
            <Ionicons name="chevron-forward" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekdaysRow}>
          {weekdays.map((wd) => (
            <View key={wd} style={styles.weekdayCell}>
              <Text style={[styles.weekdayText, { color: textColor, opacity: 0.6 }]}>
                {wd}
              </Text>
            </View>
          ))}
        </View>

        {weeks.map((week, wIdx) => (
          <View key={wIdx} style={styles.weekRow}>
            {week.map((day, dIdx) => {
              if (!day) return <View key={dIdx} style={styles.dayCellEmpty} />;

              const isSelectedStart = range.startDate && day.isSame(range.startDate, "day");
              const isSelectedEnd = range.endDate && day.isSame(range.endDate, "day");
              const isSelected = isSelectedStart || isSelectedEnd;

              let inRange = false;
              if (range.startDate && range.endDate) {
                const actualStart = range.startDate.isBefore(range.endDate)
                  ? range.startDate
                  : range.endDate;
                const actualEnd = range.startDate.isBefore(range.endDate)
                  ? range.endDate
                  : range.startDate;
                inRange =
                  day.isAfter(actualStart, "day") &&
                  day.isBefore(actualEnd, "day");
              }

              const isToday = day.isSame(dayjs(), "day");
              let cellBg = "transparent";
              let txtColor = textColor;

              if (isSelected) {
                cellBg = tintColor;
                txtColor = backgroundColor;
              } else if (inRange) {
                cellBg = tintColor + "20";
              } else if (isToday) {
                txtColor = tintColor;
              }

              return (
                <TouchableOpacity
                  key={dIdx}
                  onPress={() => handleDayPress(day)}
                  style={[
                    styles.dayCell,
                    { backgroundColor: cellBg },
                    isToday &&
                      !isSelected &&
                      !inRange && {
                        borderWidth: 1,
                        borderColor: tintColor,
                      },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: txtColor },
                      isSelected && { fontWeight: "700" },
                    ]}
                  >
                    {day.date()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
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

          <View style={styles.dateLabelsRow}>
            <TouchableOpacity
              style={[
                styles.dateBox,
                activeInput === "from" && { borderColor: tintColor, borderWidth: 2 },
              ]}
              onPress={() => setActiveInput("from")}
              activeOpacity={0.8}
            >
              <Text style={{ color: textColor, opacity: 0.6, fontSize: 12, marginBottom: 4 }}>
                {i18n.from} (DD.MM.YYYY)
              </Text>
              <TextInput
                style={[styles.dateInput, { color: textColor }]}
                value={fromText}
                onChangeText={handleFromTextChange}
                onFocus={() => setActiveInput("from")}
                placeholder="--.--.----"
                placeholderTextColor={textColor + "80"}
                keyboardType="numeric"
                maxLength={10}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateBox,
                activeInput === "to" && { borderColor: tintColor, borderWidth: 2 },
              ]}
              onPress={() => setActiveInput("to")}
              activeOpacity={0.8}
            >
              <Text style={{ color: textColor, opacity: 0.6, fontSize: 12, marginBottom: 4 }}>
                {i18n.to} (DD.MM.YYYY)
              </Text>
              <TextInput
                style={[styles.dateInput, { color: textColor }]}
                value={toText}
                onChangeText={handleToTextChange}
                onFocus={() => setActiveInput("to")}
                placeholder="--.--.----"
                placeholderTextColor={textColor + "80"}
                keyboardType="numeric"
                maxLength={10}
              />
            </TouchableOpacity>
          </View>

          {activeInput && renderCalendar()}

          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={onCancel} style={styles.modalButton}>
              <Text style={{ color: textColor }}>{i18n.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApply}
              style={[styles.modalButton, { backgroundColor: tintColor }]}
            >
              <Text style={{ color: backgroundColor, fontWeight: "600" }}>{i18n.apply}</Text>
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
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
  },
  dateLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 16,
  },
  dateBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(150,150,150,0.1)",
    borderWidth: 2,
    borderColor: "transparent",
  },
  dateInput: {
    fontWeight: "600",
    fontSize: 16,
    padding: 0,
    margin: 0,
  },
  calendarContainer: {
    marginBottom: 16,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  arrowButton: {
    padding: 4,
  },
  weekdaysRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: "600",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  dayCellEmpty: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  dayText: {
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
