export function relativeTime(isoDate: string | null): string {
  if (!isoDate) return "—";
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return "hace instantes";
  if (diffSec < 60) return `hace ${diffSec} segundos`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} minuto${diffMin === 1 ? "" : "s"}`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `hace ${diffHrs} hora${diffHrs === 1 ? "" : "s"}`;
  const diffDays = Math.floor(diffHrs / 24);
  return `hace ${diffDays} día${diffDays === 1 ? "" : "s"}`;
}

/** "hoy 14:32" / "ayer 09:10" / "04/09 14:32" */
export function friendlyDateTime(isoDate: string | null): string {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `hoy ${time}`;
  if (isYesterday) return `ayer ${time}`;
  return `${date.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit" })} ${time}`;
}

/** For an OFFLINE camera, how long it has been down since lastOnlineAt. */
export function downDuration(lastOnlineAt: string | null): string {
  if (!lastOnlineAt) return "desconocido";
  const diffMin = Math.floor((Date.now() - new Date(lastOnlineAt).getTime()) / 60000);
  if (diffMin < 1) return "menos de 1 minuto";
  if (diffMin < 60) return `${diffMin} min`;
  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `${hrs}h ${mins}min`;
}
