/**
 * Formation Column Visualization
 * SVG-based lithology column showing formations from surface to TD.
 */

interface FormationInterval {
  id: number;
  formation_name: string;
  top_depth: number;
  bottom_depth: number;
  lithology: string;
  reservoir_quality: string;
}

const LITHOLOGY_COLORS: Record<string, { fill: string; pattern: string }> = {
  "Sandstone":           { fill: "#f5c842", pattern: "sand" },
  "Shale":               { fill: "#8b7355", pattern: "shale" },
  "Limestone":           { fill: "#a8c5da", pattern: "lime" },
  "Dolomite":            { fill: "#89b5c7", pattern: "dolo" },
  "Shale/Sandstone":     { fill: "#c9a84c", pattern: "mixed" },
  "Sandstone/Shale":     { fill: "#c9a84c", pattern: "mixed" },
  "Shale/Limestone":     { fill: "#9db5c2", pattern: "carb" },
  "Limestone/Dolomite":  { fill: "#7aaec3", pattern: "carb" },
  "default":             { fill: "#d1d5db", pattern: "default" },
};

const QUALITY_COLORS: Record<string, string> = {
  Excellent: "#059669",
  Good:      "#2563eb",
  Fair:      "#d97706",
  Poor:      "#dc2626",
};

interface FormationColumnProps {
  intervals: FormationInterval[];
  totalDepth: number;
  height?: number;
}

export function FormationColumn({ intervals, totalDepth, height = 400 }: FormationColumnProps) {
  if (!intervals.length) return (
    <div className="flex items-center justify-center h-32 text-xs text-gray-400">No formation data</div>
  );

  const width = 120;
  const colX = 40;
  const colW = 60;
  const labelX = colX + colW + 8;
  const scale = (height - 40) / totalDepth;

  return (
    <div className="overflow-y-auto">
      <svg width={width + 160} height={height + 20} className="text-xs">
        {/* Depth axis */}
        {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
          const d = Math.round(totalDepth * frac);
          const y = 20 + d * scale;
          return (
            <g key={frac}>
              <line x1={colX - 4} y1={y} x2={colX + colW} y2={y} stroke="#e5e7eb" strokeWidth={0.5} />
              <text x={colX - 6} y={y + 3} textAnchor="end" fontSize={9} fill="#9ca3af">
                {d}
              </text>
            </g>
          );
        })}

        {/* Formation bars */}
        {intervals.map((interval) => {
          const y1 = 20 + interval.top_depth * scale;
          const h = Math.max(2, (interval.bottom_depth - interval.top_depth) * scale);
          const lith = interval.lithology || "default";
          const cfg = LITHOLOGY_COLORS[lith] || LITHOLOGY_COLORS["default"];
          const qColor = QUALITY_COLORS[interval.reservoir_quality] || "#9ca3af";
          const midY = y1 + h / 2;

          return (
            <g key={interval.id}>
              {/* Formation bar */}
              <rect
                x={colX}
                y={y1}
                width={colW}
                height={h}
                fill={cfg.fill}
                stroke="#ffffff"
                strokeWidth={1}
                opacity={0.85}
              />
              {/* Quality stripe on right edge */}
              <rect
                x={colX + colW - 5}
                y={y1}
                width={5}
                height={h}
                fill={qColor}
                opacity={0.7}
              />
              {/* Label */}
              {h > 14 && (
                <text
                  x={labelX}
                  y={midY}
                  fontSize={9}
                  fill="#374151"
                  dominantBaseline="middle"
                >
                  {interval.formation_name.length > 20
                    ? interval.formation_name.slice(0, 18) + "…"
                    : interval.formation_name}
                </text>
              )}
              {h > 22 && (
                <text
                  x={labelX}
                  y={midY + 11}
                  fontSize={8}
                  fill="#9ca3af"
                  dominantBaseline="middle"
                >
                  {Math.round(interval.top_depth)}–{Math.round(interval.bottom_depth)}m
                </text>
              )}
            </g>
          );
        })}

        {/* Borehole line */}
        <line
          x1={colX + colW / 2}
          y1={20}
          x2={colX + colW / 2}
          y2={20 + totalDepth * scale}
          stroke="#1d4ed8"
          strokeWidth={2}
          opacity={0.3}
        />

        {/* Axis label */}
        <text x={10} y={height / 2 + 20} fontSize={8} fill="#9ca3af"
          transform={`rotate(-90, 10, ${height / 2 + 20})`}
          textAnchor="middle">
          Depth (m)
        </text>
      </svg>
    </div>
  );
}
