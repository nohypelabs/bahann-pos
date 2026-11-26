'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { ChartContainer, ChartTooltipContent, GradientDef, CHART_COLORS } from '@/components/ui/chart'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatChartYAxis } from '@/lib/utils/formatters'

interface RevenueAreaChartProps {
  data: Array<{ date: string; revenue: number }>
  formatCurrency?: (value: number) => string
  formatDate?: (date: string) => string
  height?: number
  className?: string
  hideMobileYAxis?: boolean
}

export default function RevenueAreaChartLazy({
  data,
  formatCurrency = (v) => v.toLocaleString(),
  formatDate = (d) => d,
  height = 384,
  className,
  hideMobileYAxis = false,
}: RevenueAreaChartProps) {
  const { language } = useLanguage()

  return (
    <ChartContainer height={height} className={className}>
      <AreaChart
        data={data}
        margin={{ left: hideMobileYAxis ? -20 : 4, right: 16, top: 8, bottom: 0 }}
      >
        <GradientDef id="areaRevenue" color={CHART_COLORS.emerald} fromOpacity={0.35} />
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
          cursor={{ stroke: CHART_COLORS.emerald, strokeWidth: 1.5, strokeOpacity: 0.3 }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke={CHART_COLORS.emerald}
          strokeWidth={2.5}
          fill="url(#areaRevenue)"
          dot={false}
          activeDot={{
            r: 5,
            fill: CHART_COLORS.emerald,
            stroke: '#fff',
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ChartContainer>
  )
}
