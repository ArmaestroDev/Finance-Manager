export const toUiDate = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
};

export const toApiDate = (uiDate: string) => {
    const [dd, mm, yyyy] = uiDate.split(".");
    if (!dd || !mm || !yyyy) return "";
    return `${yyyy}-${mm}-${dd}`;
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
    const d = new Date(input);
    if (isNaN(d.getTime())) return input;
    return toUiDate(d);
};

// Short German date (DD.MM.) for compact list headers.
export const formatDateShort = (input: string | Date | null | undefined): string => {
    if (input == null || input === "") return "—";
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return typeof input === "string" ? input : "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}.${mm}.`;
};

// German weekday for grouped date headers.
export const formatWeekday = (input: string | Date | null | undefined, long = false): string => {
    if (input == null || input === "") return "";
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("de-DE", { weekday: long ? "long" : "short" });
};
