'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartTooltipContent } from '@/components/ui/chart'

interface RevenuePieChartProps {
  data: Array<{ name: string; value: number; color: string }>
  formatCurrency?: (value: number) => string
  height?: number
  className?: string
}

function DonutLabel({
  cx,
  cy,
  total,
  formatCurrency,
}: {
  cx: number
  cy: number
  total: number
  formatCurrency: (v: number) => string
}) {
  const formatted = formatCurrency(total)
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan
        x={cx}
        dy="-0.6em"
        fill="var(--foreground)"
        fontSize="13"
        fontWeight="700"
      >
        {formatted}
      </tspan>
      <tspan
        x={cx}
        dy="1.4em"
        fill="var(--chart-axis)"
        fontSize="10"
      >
        Total
      </tspan>
    </text>
  )
}

export default function RevenuePieChartLazy({
  data,
  formatCurrency = (v) => v.toLocaleString(),
  height = 320,
  className,
}: RevenuePieChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className={`flex flex-col ${className ?? ''}`} style={className ? undefined : { height }}>
      {/* The chart takes what the legend leaves, so the legend is never cut off */}
      <div className="min-h-0 flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* outer thin ring */}
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius="42%"
            innerRadius="38%"
            dataKey="value"
            stroke="none"
            paddingAngle={0}
          >
            {data.map((entry, i) => (
              <Cell key={`ring-${i}`} fill={entry.color} opacity={0.15} />
            ))}
          </Pie>

          {/* main donut */}
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius="70%"
            innerRadius="48%"
            dataKey="value"
            stroke="none"
            paddingAngle={3}
            labelLine={false}
          >
            {data.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.color} />
            ))}
          </Pie>

          {/* centre label rendered as custom label on a zero-radius pie */}
          <Pie
            data={[{ value: 1 }]}
            cx="50%"
            cy="50%"
            outerRadius={0}
            dataKey="value"
            label={({ cx, cy }: { cx?: number; cy?: number }) => (
              <DonutLabel
                cx={cx ?? 0}
                cy={cy ?? 0}
                total={total}
                formatCurrency={formatCurrency}
              />
            )}
            labelLine={false}
            isAnimationActive={false}
          >
            <Cell fill="transparent" />
          </Pie>

          <Tooltip
            content={
              <ChartTooltipContent
                formatter={(value: number) => {
                  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
                  return `${formatCurrency(value)} (${pct}%)`
                }}
              />
            }
          />
        </PieChart>
      </ResponsiveContainer>
      </div>

      {/* legend */}
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((entry, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </div>
        ))}
      </div>
    </div>
  )
}
