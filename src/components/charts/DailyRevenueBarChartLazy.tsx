'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { ChartContainer, ChartTooltipContent, GradientDef, CHART_COLORS } from '@/components/ui/chart'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatChartYAxis } from '@/lib/utils/formatters'

interface DailyRevenueBarChartProps {
  data: Array<{ date: string; revenue: number }>
  formatCurrency?: (value: number) => string
  formatDate?: (date: string) => string
  height?: number
  className?: string
  hideMobileYAxis?: boolean
}

export default function DailyRevenueBarChartLazy({
  data,
  formatCurrency = (v) => v.toLocaleString(),
  formatDate = (d) => d,
  height = 320,
  className,
  hideMobileYAxis = false,
}: DailyRevenueBarChartProps) {
  const { language } = useLanguage()
  const maxVal = Math.max(...(data.map((d) => d.revenue) || [0]))

  return (
    <ChartContainer height={height} className={className}>
      <BarChart
        data={data}
        margin={{ left: hideMobileYAxis ? -20 : 4, right: 16, top: 8, bottom: 0 }}
        barCategoryGap="35%"
      >
        <GradientDef id="barRevenue" color={CHART_COLORS.emerald} fromOpacity={1} toOpacity={0.75} />
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
          minTickGap={16}
        />
        <YAxis
          stroke="none"
          tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatChartYAxis(v, language)}
          width={hideMobileYAxis ? 28 : 48}
          hide={hideMobileYAxis}
        />
        <Tooltip
          content={
            <ChartTooltipContent
              labelFormatter={formatDate}
              formatter={formatCurrency}
            />
          }
          cursor={{ fill: 'var(--chart-grid)', radius: 6 }}
        />
        <Bar
          dataKey="revenue"
          name="Revenue"
          fill="url(#barRevenue)"
          radius={[6, 6, 0, 0]}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.revenue === maxVal ? CHART_COLORS.emerald : 'url(#barRevenue)'}
              opacity={entry.revenue === maxVal ? 1 : 0.75}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
