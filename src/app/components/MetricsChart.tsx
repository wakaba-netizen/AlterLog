// src/app/components/MetricsChart.tsx
'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

interface TrendPoint {
  date: string
  fact: number
  emotion: number
  passive: number
}

interface MetricsChartProps {
  data: TrendPoint[]
}

export function MetricsChart({ data }: MetricsChartProps) {
  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -30 }}>
        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
        <Tooltip
          contentStyle={{
            background: '#1a1a2e',
            border: '1px solid rgba(0,84,167,0.4)',
            borderRadius: 8,
            color: '#e2e8f0',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
        <Line type="monotone" dataKey="fact" name="事実" stroke="#0075c2" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="emotion" name="感情" stroke="#f472b6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="passive" name="被害者" stroke="#fb923c" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
