import { MESES, listaAnos } from '../lib/constants'

interface MonthPickerProps {
  value: string
  onChange: (value: string) => void
}

export default function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [year, month] = value.split('-').map(Number)
  const years = listaAnos()

  return (
    <div className="month-picker">
      <select
        className="input"
        value={month}
        onChange={(e) => onChange(`${year}-${e.target.value.padStart(2, '0')}`)}
        aria-label="Mês"
      >
        {MESES.map((nome, i) => (
          <option key={nome} value={i + 1}>
            {nome}
          </option>
        ))}
      </select>
      <select
        className="input"
        value={year}
        onChange={(e) => onChange(`${e.target.value}-${String(month).padStart(2, '0')}`)}
        aria-label="Ano"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}
