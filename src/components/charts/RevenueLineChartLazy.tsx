'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { ChartContainer, ChartTooltipContent, CHART_COLORS } from '@/components/ui/chart'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatChartYAxis } from '@/lib/utils/formatters'

interface RevenueLineChartProps {
  data: Array<{ date: string; revenue: number }>
  formatCurrency?: (value: number) => string
  formatDate?: (date: string) => string
  height?: number
  className?: string
  hideMobileYAxis?: boolean
}

export default function RevenueLineChartLazy({
  data,
  formatCurrency = (v) => v.toLocaleString(),
  formatDate = (d) => d,
  height = 320,
  className,
  hideMobileYAxis = false,
}: RevenueLineChartProps) {
  const { language } = useLanguage()

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
        No sales data available
      </div>
    )
  }

  const avg = data.reduce((s, d) => s + d.revenue, 0) / data.length

  return (
    <ChartContainer height={height} className={className}>
      <LineChart
        data={data}
        margin={{ left: hideMobileYAxis ? -16 : 4, right: 16, top: 8, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="4 4"
          stroke="var(--chart-grid)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="none"
          tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="none"
          tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatChartYAxis(v, language)}
          width={hideMobileYAxis ? 0 : 48}
          hide={hideMobileYAxis}
        />
        <ReferenceLine
          y={avg}
          stroke={CHART_COLORS.emerald}
          strokeDasharray="4 4"
          strokeOpacity={0.4}
        />
        <Tooltip
          content={
            <ChartTooltipContent
              labelFormatter={formatDate}
              formatter={formatCurrency}
            />
          }
          cursor={{ stroke: CHART_COLORS.emerald, strokeWidth: 1.5, strokeOpacity: 0.3 }}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke={CHART_COLORS.emerald}
          strokeWidth={2.5}
          dot={false}
          activeDot={{
            r: 5,
            fill: CHART_COLORS.emerald,
            stroke: '#fff',
            strokeWidth: 2,
          }}
        />
      </LineChart>
    </ChartContainer>
  )
}
