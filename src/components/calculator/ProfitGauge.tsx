/**
 * Profit Margin Gauge Component
 * Visual gauge showing profit margin with color coding
 */

import React from 'react';
import { getMarginColor } from '@/lib/profitabilityCalculations';

interface ProfitGaugeProps {
  margin: number;
  size?: number;
}

export function ProfitGauge({ margin, size = 200 }: ProfitGaugeProps) {
  // Cap margin at 50% for display purposes
  const displayMargin = Math.min(margin, 50);
  const percentage = (displayMargin / 50) * 100;

  // Calculate rotation for the needle (0-180 degrees)
  const rotation = (percentage / 100) * 180 - 90;

  const color = getMarginColor(margin);

  // Gauge segments
  const segments = [
    { color: '#ef4444', start: 0, end: 36, label: 'Poor' }, // 0-10%
    { color: '#f59e0b', start: 36, end: 54, label: 'Fair' }, // 10-15%
    { color: '#eab308', start: 54, end: 72, label: 'Good' }, // 15-20%
    { color: '#22c55e', start: 72, end: 180, label: 'Excellent' } // 20%+
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size / 2 }}>
        <svg
          width={size}
          height={size / 2}
          viewBox={`0 0 ${size} ${size / 2}`}
          className="overflow-visible"
        >
          {/* Background arc segments */}
          {segments.map((segment, index) => (
            <path
              key={index}
              d={describeArc(size / 2, size / 2, size / 2 - 20, segment.start, segment.end)}
              fill="none"
              stroke={segment.color}
              strokeWidth="20"
              opacity="0.3"
            />
          ))}

          {/* Active arc */}
          <path
            d={describeArc(size / 2, size / 2, size / 2 - 20, 0, rotation + 90)}
            fill="none"
            stroke={color}
            strokeWidth="20"
            strokeLinecap="round"
          />

          {/* Center circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r="8"
            fill="#374151"
          />

          {/* Needle */}
          <line
            x1={size / 2}
            y1={size / 2}
            x2={size / 2 + (size / 2 - 35) * Math.cos((rotation * Math.PI) / 180)}
            y2={size / 2 + (size / 2 - 35) * Math.sin((rotation * Math.PI) / 180)}
            stroke="#374151"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex items-end justify-center pb-2">
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color }}>
              {margin.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">
              Profit Margin
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-xs">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-gray-600">{segment.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Helper function to create SVG arc path
 */
function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ');
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}
