export const toUiDate = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
};

export const toApiDate = (uiDate: string) => {
    const [dd, mm, yyyy] = (uiDate || "").split(".");
    if (!dd || !mm || !yyyy) return "";
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
};

// Today's date as `YYYY-MM-DD` in LOCAL time. Do not use
// `new Date().toISOString().slice(0, 10)` — that is the UTC date and is off by
// one day around midnight for any non-UTC timezone.
export const todayApiDate = (d: Date = new Date()): string => {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
};

// Parse a date input into a Date. Date-only ISO strings (`YYYY-MM-DD`) are
// interpreted as LOCAL midnight — `new Date("2026-03-01")` would be UTC
// midnight, which renders as the previous day in timezones west of UTC.
const parseDateInput = (input: string | Date): Date => {
    if (input instanceof Date) return input;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return new Date(input);
};

// User-facing full date (German format, DD.MM.YYYY).
// Accepts ISO strings, Date instances, or already-formatted UI strings.
export const formatDate = (input: string | Date | null | undefined): string => {
    if (input == null || input === "") return "—";
    if (input instanceof Date) {
        return isNaN(input.getTime()) ? "—" : toUiDate(input);
    }
    // Already in DD.MM.YYYY?
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(input)) return input;
    const d = parseDateInput(input);
    if (isNaN(d.getTime())) return input;
    return toUiDate(d);
};

// Short German date (DD.MM.) for compact list headers.
export const formatDateShort = (input: string | Date | null | undefined): string => {
    if (input == null || input === "") return "—";
    const d = parseDateInput(input);
    if (isNaN(d.getTime())) return typeof input === "string" ? input : "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}.${mm}.`;
};

// BCP-47 locale for the app's UI language (month / weekday names).
export const localeFor = (language: "en" | "de"): string =>
    language === "de" ? "de-DE" : "en-GB";

// Weekday name for grouped date headers (German unless a locale is passed).
export const formatWeekday = (
    input: string | Date | null | undefined,
    long = false,
    locale = "de-DE",
): string => {
    if (input == null || input === "") return "";
    const d = parseDateInput(input);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(locale, { weekday: long ? "long" : "short" });
};

// Every month touched by a UI-format range as `YYYY-MM` keys, oldest first
// (empty months included). Empty when either bound is missing.
export const monthKeysInRange = (fromUi: string, toUi: string): string[] => {
    const apiFrom = fromUi ? toApiDate(fromUi) : "";
    const apiTo = toUi ? toApiDate(toUi) : "";
    if (!apiFrom || !apiTo) return [];
    const [fy, fm] = apiFrom.split("-").map(Number);
    const [ty, tm] = apiTo.split("-").map(Number);
    const keys: string[] = [];
    let y = fy;
    let m = fm;
    while (y < ty || (y === ty && m <= tm)) {
        keys.push(`${y}-${String(m).padStart(2, "0")}`);
        m++;
        if (m > 12) {
            m = 1;
            y++;
        }
    }
    return keys;
};
