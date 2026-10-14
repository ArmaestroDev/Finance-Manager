import { Alert, AlertButton, Platform } from "react-native";

// react-native-web's Alert.alert is a no-op, so informational messages,
// errors and confirmations silently vanished on web. `showAlert` mirrors the
// Alert.alert(title, message, buttons) signature and degrades on web to:
//   - no / single button      → window.alert, then that button's onPress
//   - cancel + one action     → window.confirm → action.onPress or cancel.onPress
//   - several actions         → one window.confirm per action ("<action>?");
//                               the first accepted one runs, else cancel runs.
// Native platforms use Alert.alert unchanged.
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
): void {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }
  if (typeof window === "undefined") return;
  const text = message ? `${title}\n\n${message}` : title;
  const list = buttons ?? [];
  const cancel = list.find((b) => b.style === "cancel");
  const actions = list.filter((b) => b.style !== "cancel");

  if (actions.length <= 1 && !cancel) {
    window.alert?.(text);
    actions[0]?.onPress?.();
    return;
  }
  if (actions.length === 1) {
    if (window.confirm?.(text)) actions[0].onPress?.();
    else cancel?.onPress?.();
    return;
  }
  if (actions.length === 0) {
    window.alert?.(text);
    cancel?.onPress?.();
    return;
  }
  for (const a of actions) {
    if (window.confirm?.(`${text}\n\n${a.text ?? "OK"}?`)) {
      a.onPress?.();
      return;
    }
  }
  cancel?.onPress?.();
}
