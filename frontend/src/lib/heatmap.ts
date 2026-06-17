import type { HeatmapDto } from '@/types'

export interface HeatmapLocalDto {
  dayOfWeek: number  // 0=Пн … 6=Нд (display index, Monday-first)
  hour: number       // 0-23 локальний час
  count: number
}

export function mapHeatmapToLocalTime(data: HeatmapDto[]): HeatmapLocalDto[] {
  const offsetHours = -(new Date().getTimezoneOffset() / 60)

  return data
    .filter((d) => d.dayOfWeek !== undefined && d.hourUtc !== undefined)
    .map(({ dayOfWeek, hourUtc, count }) => {
      const rawHour = hourUtc + offsetHours

      // Зміщення дня при переході через північ
      const dayShift =
        rawHour >= 24 ? 1 :
        rawHour <  0  ? -1 :
        0

      const localHour = ((rawHour % 24) + 24) % 24          // завжди 0-23

      const localDayJs = ((dayOfWeek + dayShift) % 7 + 7) % 7

      const displayDay = (localDayJs + 6) % 7

      return { dayOfWeek: displayDay, hour: localHour, count }
    })
}