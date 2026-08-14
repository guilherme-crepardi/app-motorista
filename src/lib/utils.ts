export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  return x
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

export function formatMonthBR(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function lastDayOfMonthISO(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${ym}-${String(last).padStart(2, '0')}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function currentMonthISO(): string {
  return todayISO().slice(0, 7)
}

export function lastNDays(n: number): Date[] {
  const today = startOfDay(new Date())
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (n - 1 - i))
    return d
  })
}

export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function formatLongDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0)
}

export function horasToText(horas: number | null): string {
  if (horas == null || horas <= 0) return ''
  const totalMin = Math.round(horas * 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h}:${String(m).padStart(2, '0')}` : String(h)
}

export function textToHoras(text: string): number | null {
  const t = text.trim().replace(',', ':')
  if (!t) return null
  if (t.includes(':')) {
    const [h, m] = t.split(':')
    const hh = parseFloat(h)
    const mm = parseFloat(m)
    if (isNaN(hh) || isNaN(mm)) return null
    return Math.round((hh + mm / 60) * 100) / 100
  }
  const v = parseFloat(t)
  return isNaN(v) ? null : Math.round(v * 100) / 100
}
