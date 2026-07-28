export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatPaymentDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("default", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatMethod(method: string | null): string {
  if (!method) return "Other";
  return method
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
