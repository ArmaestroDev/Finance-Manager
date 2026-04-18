import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isoWeek from "dayjs/plugin/isoWeek";
import React, { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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
}

export function DateFilterModal({ visible, title, tempFrom, tempTo, onTempFromChange, onTempToChange, onApply, onCancel, backgroundColor, textColor, tintColor }: DateFilterModalProps) {
  const [range, setRange] = useState<{ startDate: dayjs.Dayjs | undefined; endDate: dayjs.Dayjs | undefined }>({
    startDate: tempFrom ? dayjs(tempFrom, "DD.MM.YYYY") : undefined,
    endDate: tempTo ? dayjs(tempTo, "DD.MM.YYYY") : undefined,
  });
  const [fromText, setFromText] = useState(tempFrom || "");
  const [toText, setToText] = useState(tempTo || "");
  const [activeInput, setActiveInput] = useState<"from" | "to" | null>("from");
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf("month"));

  useEffect(() => {
    if (visible) {
      const start = tempFrom ? dayjs(tempFrom, "DD.MM.YYYY") : dayjs().startOf("month");
      const end = tempTo ? dayjs(tempTo, "DD.MM.YYYY") : dayjs();
      setRange({ startDate: start, endDate: end });
      setFromText(start.format("DD.MM.YYYY"));
      setToText(end.format("DD.MM.YYYY"));
      setActiveInput("from");
      if (start.isValid()) setCurrentMonth(start.startOf("month"));
      else setCurrentMonth(dayjs().startOf("month"));
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
      if (parsed.isValid()) { setRange((prev) => ({ ...prev, startDate: parsed })); setCurrentMonth(parsed.startOf("month")); }
    }
  };

  const handleToTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    setToText(cleaned);
    if (cleaned.length === 10) {
      const parsed = dayjs(cleaned, "DD.MM.YYYY", true);
      if (parsed.isValid()) { setRange((prev) => ({ ...prev, endDate: parsed })); setCurrentMonth(parsed.startOf("month")); }
    }
  };

  const handleDayPress = (day: dayjs.Dayjs) => {
    if (activeInput === "from") { setRange((prev) => ({ ...prev, startDate: day })); setFromText(day.format("DD.MM.YYYY")); }
    else if (activeInput === "to") { setRange((prev) => ({ ...prev, endDate: day })); setToText(day.format("DD.MM.YYYY")); }
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
    const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => setCurrentMonth(currentMonth.subtract(1, "month"))} style={styles.arrowBtn}>
            <Ionicons name="chevron-back" size={20} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: textColor }]}>{currentMonth.format("MMMM YYYY")}</Text>
          <TouchableOpacity onPress={() => setCurrentMonth(currentMonth.add(1, "month"))} style={styles.arrowBtn}>
            <Ionicons name="chevron-forward" size={20} color={textColor} />
          </TouchableOpacity>
        </View>
        <View style={styles.weekdaysRow}>
          {weekdays.map((wd) => (
            <View key={wd} style={styles.weekdayCell}>
              <Text style={[styles.weekdayText, { color: textColor, opacity: 0.5 }]}>{wd}</Text>
            </View>
          ))}
        </View>
        {weeks.map((week, wIdx) => (
          <View key={wIdx} style={styles.weekRow}>
            {week.map((day, dIdx) => {
              if (!day) return <View key={dIdx} style={styles.dayCellEmpty} />;
              const isStart = range.startDate && day.isSame(range.startDate, "day");
              const isEnd = range.endDate && day.isSame(range.endDate, "day");
              const isSelected = isStart || isEnd;
              let inRange = false;
              if (range.startDate && range.endDate) {
                const aStart = range.startDate.isBefore(range.endDate) ? range.startDate : range.endDate;
                const aEnd = range.startDate.isBefore(range.endDate) ? range.endDate : range.startDate;
                inRange = day.isAfter(aStart, "day") && day.isBefore(aEnd, "day");
              }
              const isToday = day.isSame(dayjs(), "day");
              let cellBg = "transparent";
              let txtColor = textColor;
              if (isSelected) { cellBg = tintColor; txtColor = "#fff"; }
              else if (inRange) { cellBg = tintColor + "20"; }
              else if (isToday) { txtColor = tintColor; }
              return (
                <TouchableOpacity
                  key={dIdx}
                  onPress={() => handleDayPress(day)}
                  style={[styles.dayCell, { backgroundColor: cellBg }, isToday && !isSelected && !inRange && { borderWidth: 1, borderColor: tintColor }]}
                >
                  <Text style={[styles.dayText, { color: txtColor }, isSelected && { fontWeight: "700" }]}>{day.date()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          {/* Two-column desktop layout: inputs left, calendar right */}
          <View style={styles.twoColumn}>
            {/* Left: title + inputs + quick presets */}
            <View style={styles.leftCol}>
              <Text style={[styles.modalTitle, { color: textColor }]}>{title}</Text>
              <View style={styles.dateFields}>
                <TouchableOpacity
                  style={[styles.dateBox, activeInput === "from" && { borderColor: tintColor, borderWidth: 2 }]}
                  onPress={() => setActiveInput("from")}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: textColor, opacity: 0.5, fontSize: 11, marginBottom: 4 }}>FROM</Text>
                  <TextInput
                    style={[styles.dateInput, { color: textColor }]}
                    value={fromText}
                    onChangeText={handleFromTextChange}
                    onFocus={() => setActiveInput("from")}
                    placeholder="DD.MM.YYYY"
                    placeholderTextColor={textColor + "60"}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </TouchableOpacity>
                <Text style={{ color: textColor, opacity: 0.4, fontSize: 18, alignSelf: "center" }}>→</Text>
                <TouchableOpacity
                  style={[styles.dateBox, activeInput === "to" && { borderColor: tintColor, borderWidth: 2 }]}
                  onPress={() => setActiveInput("to")}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: textColor, opacity: 0.5, fontSize: 11, marginBottom: 4 }}>TO</Text>
                  <TextInput
                    style={[styles.dateInput, { color: textColor }]}
                    value={toText}
                    onChangeText={handleToTextChange}
                    onFocus={() => setActiveInput("to")}
                    placeholder="DD.MM.YYYY"
                    placeholderTextColor={textColor + "60"}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={onCancel} style={[styles.modalBtn, { backgroundColor: textColor + "12" }]}>
                  <Text style={{ color: textColor, fontWeight: "600" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleApply} style={[styles.modalBtn, { backgroundColor: tintColor }]}>
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Right: calendar */}
            <View style={styles.rightCol}>{renderCalendar()}</View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalContent: { width: "100%", maxWidth: 700, borderRadius: 24, padding: 32, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 },
  twoColumn: { flexDirection: "row", gap: 32 },
  leftCol: { flex: 1 },
  rightCol: { flex: 1 },
  modalTitle: { fontSize: 22, fontWeight: "800", marginBottom: 24 },
  dateFields: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 },
  dateBox: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: "rgba(150,150,150,0.08)", borderWidth: 2, borderColor: "transparent" },
  dateInput: { fontWeight: "600", fontSize: 15, padding: 0 },
  calendarContainer: { paddingTop: 4 },
  monthHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  monthTitle: { fontSize: 15, fontWeight: "700" },
  arrowBtn: { padding: 4 },
  weekdaysRow: { flexDirection: "row", marginBottom: 8 },
  weekdayCell: { flex: 1, alignItems: "center" },
  weekdayText: { fontSize: 12, fontWeight: "600" },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  dayCellEmpty: { flex: 1, aspectRatio: 1, margin: 2 },
  dayCell: { flex: 1, aspectRatio: 1, margin: 2, borderRadius: 999, justifyContent: "center", alignItems: "center" },
  dayText: { fontSize: 13 },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999, alignItems: "center" },
});
