import dayjs from "dayjs";
import "dayjs/locale/de";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isoWeek from "dayjs/plugin/isoWeek";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, TextStyle, View } from "react-native";

import { FMFonts, FMRadius, FMType } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { useSettings } from "@/src/shared/context/SettingsContext";
import {
  Button,
  IconArrowR,
  IconButton,
  IconChevL,
  IconChevR,
  PressState,
  stateColor,
  useFMTheme,
} from "@/src/shared/design";
import { useAccounts } from "@/src/features/accounts/context/AccountsContext";
import { bankWindowStart } from "@/src/features/transactions/utils/bankWindow";
import { formatDate } from "@/src/shared/utils/date";

dayjs.extend(customParseFormat);
dayjs.extend(isoWeek);

const UI_FORMAT = "DD.MM.YYYY";
// The date boxes draw their own M3 focus outline.
const NO_WEB_OUTLINE = { outlineStyle: "none" } as unknown as TextStyle;
// Always six week rows, so the calendar (and the month arrows) never change
// size or position while paging through months.
const WEEKS_SHOWN = 6;

interface DateFilterModalProps {
  visible: boolean;
  title: string;
  tempFrom: string;
  tempTo: string;
  onTempFromChange: (value: string) => void;
  onTempToChange: (value: string) => void;
  onApply: (from: string, to: string) => void;
  onCancel: () => void;
}

type Range = { startDate: dayjs.Dayjs | undefined; endDate: dayjs.Dayjs | undefined };

// Date-range picker (two DD.MM.YYYY inputs + month calendar). One
// implementation for all layouts: `Sheet` is a centered dialog on desktop
// and a bottom sheet on mobile.
export function DateFilterModal({
  visible,
  title,
  tempFrom,
  tempTo,
  onTempFromChange,
  onTempToChange,
  onApply,
  onCancel,
}: DateFilterModalProps) {
  const t = useFMTheme();
  const { i18n, language } = useSettings();
  const { accounts } = useAccounts();
  const hasConnected = accounts.some((a) => a.type === "connected");

  const [range, setRange] = useState<Range>({ startDate: undefined, endDate: undefined });
  const [fromText, setFromText] = useState(tempFrom || "");
  const [toText, setToText] = useState(tempTo || "");
  const [activeInput, setActiveInput] = useState<"from" | "to">("from");
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf("month"));

  // Re-seed from the applied range every time the picker opens.
  useEffect(() => {
    if (!visible) return;
    const start = tempFrom ? dayjs(tempFrom, UI_FORMAT) : dayjs().startOf("month");
    const end = tempTo ? dayjs(tempTo, UI_FORMAT) : dayjs();
    setRange({ startDate: start, endDate: end });
    setFromText(start.format(UI_FORMAT));
    setToText(end.format(UI_FORMAT));
    setActiveInput("from");
    setCurrentMonth((start.isValid() ? start : dayjs()).startOf("month"));
  }, [visible, tempFrom, tempTo]);

  const handleApply = () => {
    const s = range.startDate ? range.startDate.format(UI_FORMAT) : fromText;
    const e = range.endDate ? range.endDate.format(UI_FORMAT) : toText;
    onTempFromChange(s);
    onTempToChange(e);
    onApply(s, e);
  };

  const handleTextChange = (which: "from" | "to", text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    (which === "from" ? setFromText : setToText)(cleaned);
    if (cleaned.length !== UI_FORMAT.length) return;
    const parsed = dayjs(cleaned, UI_FORMAT, true);
    if (!parsed.isValid()) return;
    setRange((prev) => (which === "from" ? { ...prev, startDate: parsed } : { ...prev, endDate: parsed }));
    setCurrentMonth(parsed.startOf("month"));
  };

  const handleDayPress = (day: dayjs.Dayjs) => {
    if (activeInput === "from") {
      setRange((prev) => ({ ...prev, startDate: day }));
      setFromText(day.format(UI_FORMAT));
    } else {
      setRange((prev) => ({ ...prev, endDate: day }));
      setToText(day.format(UI_FORMAT));
    }
  };

  const renderDateBox = (which: "from" | "to") => {
    const active = activeInput === which;
    return (
      <Pressable
        style={[
          styles.dateBox,
          // M3 outlined field: 2dp primary outline on the active end of the range.
          { borderColor: active ? t.primary : t.outline, borderWidth: active ? 2 : 1, padding: active ? 11 : 12 },
        ]}
        onPress={() => setActiveInput(which)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <Text
          style={{
            fontFamily: FMFonts.sansMedium,
            fontSize: FMType.caption,
            color: active ? t.primary : t.inkSoft,
            marginBottom: 2,
          }}
        >
          {which === "from" ? i18n.from : i18n.to}
        </Text>
        <TextInput
          style={[styles.dateInput, NO_WEB_OUTLINE, { color: t.ink }]}
          accessibilityLabel={which === "from" ? i18n.from : i18n.to}
          selectionColor={t.primary}
          value={which === "from" ? fromText : toText}
          onChangeText={(text) => handleTextChange(which, text)}
          onFocus={() => setActiveInput(which)}
          placeholder={i18n.date_placeholder_ddmmyyyy}
          placeholderTextColor={t.inkMuted}
          keyboardType="numeric"
          maxLength={UI_FORMAT.length}
        />
      </Pressable>
    );
  };

  const renderCalendar = () => {
    // Start on the Monday on/before the 1st and always fill 6 × 7 cells;
    // days of the neighbouring months are shown muted and stay selectable.
    const gridStart = currentMonth.startOf("month").subtract(currentMonth.startOf("month").isoWeekday() - 1, "day");
    const weeks: dayjs.Dayjs[][] = [];
    for (let w = 0; w < WEEKS_SHOWN; w++) {
      const week: dayjs.Dayjs[] = [];
      for (let d = 0; d < 7; d++) week.push(gridStart.add(w * 7 + d, "day"));
      weeks.push(week);
    }
    const weekdays = i18n.weekday_short_list.split(",");
    const [lo, hi] =
      range.startDate && range.endDate && range.endDate.isBefore(range.startDate)
        ? [range.endDate, range.startDate]
        : [range.startDate, range.endDate];
    const today = dayjs();
    const hasSpan = !!lo && !!hi && !lo.isSame(hi, "day");

    return (
      <View style={styles.calendar}>
        <View style={styles.monthHeader}>
          <IconButton
            size={40}
            icon={<IconChevL size={20} />}
            label={i18n.date_prev_month}
            onPress={() => setCurrentMonth(currentMonth.subtract(1, "month"))}
          />
          <Text
            numberOfLines={1}
            style={[styles.monthTitle, { fontFamily: FMFonts.sansMedium, fontSize: FMType.subhead, color: t.ink }]}
          >
            {currentMonth.locale(language).format("MMMM YYYY")}
          </Text>
          <IconButton
            size={40}
            icon={<IconChevR size={20} />}
            label={i18n.date_next_month}
            onPress={() => setCurrentMonth(currentMonth.add(1, "month"))}
          />
        </View>
        <View style={styles.weekRow}>
          {weekdays.map((wd) => (
            <View key={wd} style={styles.weekdayCell}>
              <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: FMType.caption, color: t.inkSoft }}>
                {wd}
              </Text>
            </View>
          ))}
        </View>
        {weeks.map((week, wIdx) => (
          <View key={wIdx} style={styles.weekRow}>
            {week.map((day, dIdx) => {
              const outside = !day.isSame(currentMonth, "month");
              const isSelected =
                (range.startDate && day.isSame(range.startDate, "day")) ||
                (range.endDate && day.isSame(range.endDate, "day"));
              const inRange = !!lo && !!hi && day.isAfter(lo, "day") && day.isBefore(hi, "day");
              const isToday = day.isSame(today, "day");
              const isLo = !!lo && day.isSame(lo, "day");
              const isHi = !!hi && day.isSame(hi, "day");
              return (
                // In-range days sit on a continuous secondaryContainer band;
                // the two ends are primary circles (M3 date range picker).
                <View key={dIdx} style={[styles.dayBand, { backgroundColor: inRange ? t.secondaryContainer : "transparent" }]}>
                  {hasSpan && (isLo || isHi) ? (
                    <View
                      style={[
                        styles.halfBand,
                        { backgroundColor: t.secondaryContainer },
                        isLo ? { left: "50%", right: 0 } : { left: 0, right: "50%" },
                      ]}
                    />
                  ) : null}
                  <Pressable
                    onPress={() => handleDayPress(day)}
                    accessibilityRole="button"
                    accessibilityLabel={day.format(UI_FORMAT)}
                    accessibilityState={{ selected: !!isSelected }}
                    style={(st) => [
                      styles.dayCell,
                      {
                        backgroundColor: isSelected
                          ? t.primary
                          : stateColor("transparent", t.ink, st as PressState),
                        borderWidth: isToday && !isSelected ? 1 : 0,
                        borderColor: t.primary,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: isSelected ? FMFonts.sansMedium : FMFonts.sans,
                        fontSize: FMType.body,
                        color: isSelected
                          ? t.onPrimary
                          : inRange
                            ? t.onSecondaryContainer
                            : isToday
                              ? t.primary
                              : outside
                                ? t.inkMuted
                                : t.ink,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {day.date()}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      title={title}
      width={440}
      actions={
        <>
          <Button variant="text" onPress={onCancel}>
            {i18n.cancel}
          </Button>
          <Button onPress={handleApply}>
            {i18n.apply}
          </Button>
        </>
      }
    >
      <View style={styles.dateFields}>
        {renderDateBox("from")}
        <IconArrowR size={18} color={t.inkSoft} />
        {renderDateBox("to")}
      </View>
      {renderCalendar()}
      {/* Fixed-height line (never resizes the dialog): the bank API only
          serves recent history; older periods come from statements. */}
      <Text
        numberOfLines={2}
        style={[styles.hint, { fontFamily: FMFonts.sans, fontSize: FMType.caption, color: t.inkSoft }]}
      >
        {hasConnected && range.startDate && range.startDate.format("YYYY-MM-DD") < bankWindowStart()
          ? i18n.range_bank_window_hint.replace("{date}", formatDate(bankWindowStart()))
          : " "}
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  dateFields: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  dateBox: { flex: 1, borderRadius: FMRadius.xs },
  dateInput: { fontFamily: FMFonts.sansSemibold, fontSize: FMType.subhead, padding: 0, margin: 0 },
  calendar: { paddingTop: 4 },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  monthTitle: { flex: 1, textAlign: "center", marginHorizontal: 8 },
  hint: { minHeight: 34, marginTop: 6, lineHeight: 17, textAlign: "center" },
  weekRow: { flexDirection: "row", marginBottom: 2 },
  dayBand: { flex: 1, aspectRatio: 1, marginVertical: 1 },
  halfBand: { position: "absolute", top: 0, bottom: 0 },
  weekdayCell: { flex: 1, alignItems: "center", paddingVertical: 4 },
  dayCell: {
    flex: 1,
    margin: 2,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
});
