export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  // Noon avoids midnight DST transitions. Advance calendar days, not milliseconds.
  return new Date(y, m - 1, d, 12);
}
export function nextDate(date: string): string {
  const d = parse(date); d.setDate(d.getDate() + 1); return localDate(d);
}
export function weekStart(date: string): string {
  const d = parse(date); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return localDate(d);
}
export function weekday(date: string): number { return parse(date).getDay(); }
export function isDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '2000-01-01' && value <= '9999-12-31' && localDate(parse(value)) === value;
}
