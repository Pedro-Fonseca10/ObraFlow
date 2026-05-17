const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
})

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

export function formatIsoDate(value: string): string {
  // value pode ser '2026-05-17' (date ISO sem hora)
  const parsed = new Date(`${value}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return dateFormatter.format(parsed)
}

export function daysFromNowIso(deltaDays: number): string {
  const date = new Date()
  date.setDate(date.getDate() + deltaDays)
  return date.toISOString().slice(0, 10)
}

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value))
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}
