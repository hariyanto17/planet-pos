import React from "react";
import { formatCurrency } from "@/utils/formatters";

interface SalesChartProps {
  data?: { date: string; orders: number; revenue: number }[];
  isLoading: boolean;
}

export const SalesChart: React.FC<SalesChartProps> = ({ data = [], isLoading }) => {
  if (isLoading) {
    return (
      <div className="h-64 bg-surface border border-border rounded-2xl flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-text-muted text-xs font-bold uppercase tracking-wider">
            Loading revenue trends...
          </span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 bg-surface border border-border rounded-2xl flex items-center justify-center text-text-muted text-sm">
        No sales transaction data available for the selected period.
      </div>
    );
  }

  // Calculate coordinates
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 100000);
  const width = 800;
  const height = 240;
  const paddingX = 60;
  const paddingY = 40;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = data.map((d, idx) => {
    const x = paddingX + (data.length > 1 ? (idx / (data.length - 1)) * chartWidth : chartWidth / 2);
    const y = height - paddingY - (d.revenue / maxRevenue) * chartHeight;
    return { x, y, val: d.revenue, label: d.date };
  });

  // Construct SVG Path
  const linePath = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : "";

  return (
    <div className="p-6 bg-surface border border-border/80 rounded-2xl shadow-md flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="text-text-secondary text-sm font-bold uppercase tracking-wider">
          Daily Revenue Trend
        </span>
        <span className="text-text-muted text-xs font-medium">
          Max: <span className="text-emerald-400 font-extrabold">{formatCurrency(maxRevenue)}</span>
        </span>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[600px] h-auto overflow-visible">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingY + ratio * chartHeight;
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#27272a"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#71717a"
                  fontSize="9"
                  fontWeight="bold"
                >
                  {formatCurrency(maxRevenue * (1 - ratio))}
                </text>
              </g>
            );
          })}

          {/* Area under the line */}
          {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

          {/* Trend Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#6366f1"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Plot circles */}
          {points.map((p, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="#818cf8"
                stroke="#4f46e5"
                strokeWidth="2"
                className="transition duration-150 group-hover:r-6"
              />
              {/* Tooltip on hover */}
              <title>{`${p.label}\n${formatCurrency(p.val)}`}</title>
            </g>
          ))}

          {/* X Axis dates */}
          {points.filter((_, i) => i === 0 || i === points.length - 1 || (points.length > 5 && i === Math.floor(points.length / 2))).map((p, idx) => (
            <text
              key={idx}
              x={p.x}
              y={height - paddingY + 20}
              textAnchor="middle"
              fill="#71717a"
              fontSize="9"
              fontWeight="bold"
            >
              {p.label.slice(5)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
};
export default SalesChart;
