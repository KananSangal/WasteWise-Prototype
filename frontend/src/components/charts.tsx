// Hand-rolled SVG charts — zero chart dependencies, works everywhere.

export function DonutChart({
  segments,
  size = 160,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribution chart">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1c2a45" strokeWidth={thickness} />
        {total > 0 &&
          segments.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
        {centerValue && (
          <text
            x="50%"
            y="47%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[#e6edf7] text-xl font-bold"
            style={{ fontSize: 22, fontWeight: 700, fill: "#e6edf7" }}
          >
            {centerValue}
          </text>
        )}
        {centerLabel && (
          <text
            x="50%"
            y="60%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: 10, fill: "#8fa0bd", letterSpacing: 1 }}
          >
            {centerLabel.toUpperCase()}
          </text>
        )}
      </svg>
      <ul className="space-y-1.5 text-xs">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="inline-block size-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="text-dim">{s.label}</span>
            <span className="font-semibold tabular-nums text-ink">{s.value}</span>
            {total > 0 && <span className="text-dim/60">{((s.value / total) * 100).toFixed(0)}%</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarList({
  items,
}: {
  items: { label: string; value: number; max?: number; color?: string; right?: string }[];
}) {
  return (
    <ul className="space-y-3">
      {items.map((it) => {
        const max = it.max ?? Math.max(...items.map((x) => x.value), 1);
        return (
          <li key={it.label}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-medium text-ink">{it.label}</span>
              <span className="tabular-nums text-dim">{it.right ?? it.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-edge/50">
              <div
                className="h-full rounded-full"
                style={{ width: `${(it.value / max) * 100}%`, background: it.color ?? "#7dd3fc" }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export interface SeriesPoint {
  t: string; // ISO
  v: number;
}

export function ForecastChart({
  history,
  forecast,
  bands = true,
  height = 260,
}: {
  history: SeriesPoint[];
  forecast: { t: string; v: number; lo: number; hi: number }[];
  bands?: boolean;
  height?: number;
}) {
  const W = 760;
  const H = height;
  const padL = 38;
  const padR = 12;
  const padT = 14;
  const padB = 26;

  const all = [
    ...history.map((p) => p.v),
    ...forecast.map((p) => (bands ? p.hi : p.v)),
    ...forecast.map((p) => (bands ? p.lo : p.v)),
  ];
  const yMin = Math.max(0, Math.min(...all, 100) - 5);
  const yMax = Math.min(100, Math.max(...all, 0) + 5);

  const t0 = Date.parse(history[0]?.t ?? forecast[0]?.t ?? new Date().toISOString());
  const t1 = Date.parse(forecast[forecast.length - 1]?.t ?? history[history.length - 1]?.t ?? new Date().toISOString());
  const tSpan = Math.max(1, t1 - t0);

  const x = (t: number) => padL + ((t - t0) / tSpan) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - padT - padB);

  const line = (pts: { t: string; v: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(Date.parse(p.t)).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");

  const bandArea =
    forecast.length > 1
      ? `M${forecast.map((p) => `${x(Date.parse(p.t)).toFixed(1)},${y(p.hi).toFixed(1)}`).join(" L")} L${forecast
          .slice()
          .reverse()
          .map((p) => `${x(Date.parse(p.t)).toFixed(1)},${y(p.lo).toFixed(1)}`)
          .join(" L")} Z`
      : "";

  const lastHistory = history[history.length - 1];
  const joinedForecast = lastHistory ? [{ t: lastHistory.t, v: lastHistory.v }, ...forecast] : forecast;

  // grid lines at 0/25/50/75/100 within range
  const gridVals = [0, 25, 50, 75, 100].filter((v) => v >= yMin && v <= yMax);
  const fmtT = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Forecast chart">
      {gridVals.map((v) => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#1c2a45" strokeWidth={1} />
          <text x={padL - 6} y={y(v) + 3} textAnchor="end" style={{ fontSize: 9, fill: "#8fa0bd" }}>
            {v}%
          </text>
        </g>
      ))}

      {bands && bandArea && <path d={bandArea} fill="#a3e635" fillOpacity={0.12} />}

      <path d={line(history)} fill="none" stroke="#7dd3fc" strokeWidth={2} strokeLinejoin="round" />
      <path
        d={line(joinedForecast)}
        fill="none"
        stroke="#a3e635"
        strokeWidth={2}
        strokeDasharray="5 4"
        strokeLinejoin="round"
      />

      {history.length > 0 && (
        <circle
          cx={x(Date.parse(history[history.length - 1].t))}
          cy={y(history[history.length - 1].v)}
          r={3.5}
          fill="#7dd3fc"
        />
      )}
      {forecast.length > 0 && (
        <circle
          cx={x(Date.parse(forecast[forecast.length - 1].t))}
          cy={y(forecast[forecast.length - 1].v)}
          r={4}
          fill="#a3e635"
          stroke="#070b14"
          strokeWidth={1.5}
        />
      )}

      {/* x-axis labels: first, middle, last */}
      {[history[0]?.t, forecast[Math.floor(forecast.length / 2)]?.t, forecast[forecast.length - 1]?.t]
        .filter(Boolean)
        .map((t, i, arr) => (
          <text
            key={`${t}-${i}`}
            x={x(Date.parse(t!))}
            y={H - 8}
            textAnchor={i === 0 ? "start" : i === arr.length - 1 ? "end" : "middle"}
            style={{ fontSize: 9, fill: "#8fa0bd" }}
          >
            {fmtT(t!)}
          </text>
        ))}
    </svg>
  );
}

export function Sparkline({
  points,
  width = 120,
  height = 32,
  color = "#7dd3fc",
}: {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (points.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map((v, i) => {
      const px = (i / (points.length - 1)) * width;
      const py = height - 3 - ((v - min) / span) * (height - 6);
      return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}
