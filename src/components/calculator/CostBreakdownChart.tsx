/**
 * Cost Breakdown Pie Chart Component
 * Shows distribution of materials, labor, overhead, and profit
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/profitabilityCalculations';

interface CostBreakdownChartProps {
  breakdown: {
    materials: number;
    labor: number;
    overhead: number;
    profit: number;
  };
}

const COLORS = {
  materials: '#3b82f6', // Blue
  labor: '#8b5cf6', // Purple
  overhead: '#f59e0b', // Amber
  profit: '#22c55e' // Green
};

export function CostBreakdownChart({ breakdown }: CostBreakdownChartProps) {
  const data = [
    { name: 'Materials', value: breakdown.materials, color: COLORS.materials },
    { name: 'Labor', value: breakdown.labor, color: COLORS.labor },
    { name: 'Overhead', value: breakdown.overhead, color: COLORS.overhead },
    { name: 'Profit', value: breakdown.profit, color: COLORS.profit }
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percentage = ((item.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold">{item.name}</p>
          <p className="text-sm text-gray-600">{formatCurrency(item.value)}</p>
          <p className="text-sm text-gray-600">{percentage}%</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (entry: any) => {
    const percentage = ((entry.value / total) * 100).toFixed(0);
    return `${percentage}%`;
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4 text-center">Cost Breakdown</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry: any) => (
              <span className="text-sm">
                {value}: {formatCurrency(entry.payload.value)}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
