'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { ChartContainer, ChartTooltipContent, GradientDef, CHART_COLORS } from '@/components/ui/chart'

interface ItemsSoldBarChartProps {
  data: Array<{ date: string; itemsSold: number }>
  formatDate?: (date: string) => string
  height?: number
  className?: string
  hideMobileYAxis?: boolean
}

export default function ItemsSoldBarChartLazy({
  data,
  formatDate = (d) => d,
  height = 320,
  className,
  hideMobileYAxis = false,
}: ItemsSoldBarChartProps) {
  const maxVal = Math.max(...(data.map((d) => d.itemsSold) || [0]))

  return (
    <ChartContainer height={height} className={className}>
      <BarChart
        data={data}
        margin={{ left: hideMobileYAxis ? -20 : 4, right: 16, top: 8, bottom: 0 }}
        barCategoryGap="35%"
      >
        <GradientDef id="barItems" color={CHART_COLORS.blue} fromOpacity={1} toOpacity={0.75} />
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
          width={hideMobileYAxis ? 28 : 40}
          hide={hideMobileYAxis}
        />
        <Tooltip
          content={
            <ChartTooltipContent
              labelFormatter={formatDate}
            />
          }
          cursor={{ fill: 'var(--chart-grid)', radius: 6 }}
        />
        <Bar
          dataKey="itemsSold"
          name="Items Sold"
          fill="url(#barItems)"
          radius={[6, 6, 0, 0]}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.itemsSold === maxVal ? CHART_COLORS.blue : 'url(#barItems)'}
              opacity={entry.itemsSold === maxVal ? 1 : 0.75}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
