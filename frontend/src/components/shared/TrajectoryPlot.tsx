/**
 * Trajectory Plot — SVG 2D view of well path (vertical vs horizontal displacement).
 */

interface SurveyPoint {
  measured_depth: number;
  true_vertical_depth: number;
  easting: number;
  northing: number;
}

interface TrajectoryPlotProps {
  surveys: SurveyPoint[];
  trajectoryType: string;
  width?: number;
  height?: number;
}

export function TrajectoryPlot({ surveys, trajectoryType, width = 280, height = 260 }: TrajectoryPlotProps) {
  if (!surveys.length) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-gray-400">
        No trajectory data
      </div>
    );
  }

  const pad = 40;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;

  // X axis = horizontal departure (easting), Y axis = TVD
  const maxHoriz = Math.max(1, Math.max(...surveys.map((s) => Math.abs(s.easting || 0))));
  const maxTVD = Math.max(1, Math.max(...surveys.map((s) => s.true_vertical_depth || 0)));

  const toX = (e: number) => pad + ((e + maxHoriz) / (maxHoriz * 2)) * plotW;
  const toY = (tvd: number) => pad + (tvd / maxTVD) * plotH;

  const points = surveys
    .filter((s) => s.true_vertical_depth != null)
    .map((s) => `${toX(s.easting || 0)},${toY(s.true_vertical_depth)}`)
    .join(" ");

  const axisTicks = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <svg width={width} height={height} className="text-xs overflow-visible">
      {/* Grid */}
      {axisTicks.map((t) => {
        const x = pad + t * plotW;
        const y = pad + t * plotH;
        return (
          <g key={t}>
            <line x1={x} y1={pad} x2={x} y2={pad + plotH} stroke="#f3f4f6" strokeWidth={1} />
            <line x1={pad} y1={y} x2={pad + plotW} y2={y} stroke="#f3f4f6" strokeWidth={1} />
          </g>
        );
      })}

      {/* Axes */}
      <line x1={pad} y1={pad} x2={pad} y2={pad + plotH} stroke="#e5e7eb" strokeWidth={1} />
      <line x1={pad} y1={pad + plotH} x2={pad + plotW} y2={pad + plotH} stroke="#e5e7eb" strokeWidth={1} />

      {/* TVD labels */}
      {axisTicks.map((t) => {
        const tvd = Math.round(maxTVD * t);
        const y = pad + t * plotH;
        return (
          <text key={`tvd-${t}`} x={pad - 4} y={y + 3} textAnchor="end" fontSize={8} fill="#9ca3af">
            {tvd}
          </text>
        );
      })}

      {/* Horiz labels */}
      {[-1, -0.5, 0, 0.5, 1].map((t) => {
        const val = Math.round(maxHoriz * t);
        const x = toX(maxHoriz * t);
        return (
          <text key={`h-${t}`} x={x} y={pad + plotH + 12} textAnchor="middle" fontSize={8} fill="#9ca3af">
            {val}
          </text>
        );
      })}

      {/* Vertical reference line */}
      <line
        x1={toX(0)} y1={pad} x2={toX(0)} y2={pad + plotH}
        stroke="#e5e7eb" strokeWidth={1} strokeDasharray="3 3"
      />

      {/* Trajectory path */}
      <polyline
        points={points}
        fill="none"
        stroke="#2563eb"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Start and end dots */}
      {surveys[0] && (
        <circle cx={toX(surveys[0].easting || 0)} cy={toY(surveys[0].true_vertical_depth)} r={4}
          fill="#059669" stroke="white" strokeWidth={1.5} />
      )}
      {surveys[surveys.length - 1] && (
        <circle
          cx={toX(surveys[surveys.length - 1].easting || 0)}
          cy={toY(surveys[surveys.length - 1].true_vertical_depth)}
          r={4} fill="#dc2626" stroke="white" strokeWidth={1.5}
        />
      )}

      {/* Axis labels */}
      <text x={pad - 30} y={pad + plotH / 2} fontSize={8} fill="#9ca3af"
        transform={`rotate(-90, ${pad - 30}, ${pad + plotH / 2})`} textAnchor="middle">
        TVD (m)
      </text>
      <text x={pad + plotW / 2} y={height - 4} fontSize={8} fill="#9ca3af" textAnchor="middle">
        E-W Departure (m)
      </text>

      {/* Type label */}
      <text x={pad + plotW} y={pad - 6} fontSize={9} fill="#2563eb" textAnchor="end" fontWeight="500">
        {trajectoryType}
      </text>
    </svg>
  );
}
