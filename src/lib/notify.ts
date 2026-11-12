export function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotifications(): Promise<boolean> {
  if (!canNotify()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}

export function notify(title: string, body: string) {
  if (!canNotify() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icons/icon-192.png", tag: "nindo" });
  } catch {
    // Some browsers only allow notifications via a service worker registration.
    // Failing silently is correct here: the bell and the UI already told the user.
  }
}
