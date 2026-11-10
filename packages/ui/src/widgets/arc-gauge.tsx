import {
  GaugeFrame,
  type GaugeProps,
  circumference,
  gauge,
  len,
  percent,
  ratio,
  trackClass,
  valueClass,
} from './gauge-frame'

export type ArcGaugeProps = GaugeProps

const SWEEP = 0.75 // 270° of the ring, open at the bottom

/** One ratio as a 270° arc open at the bottom, filled clockwise from 7:30, percentage in the middle. */
export function ArcGauge({ value, max, label, caption, tone }: ArcGaugeProps) {
  const filled = ratio(value, max)
  const { center, radius, stroke } = gauge
  const arc = circumference * SWEEP
  // The stroke starts at 3 o'clock; turning it 135° starts the arc at 7:30 so the gap sits at the bottom.
  const common = {
    cx: center,
    cy: center,
    r: radius,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    transform: `rotate(135 ${center} ${center})`,
  }
  return (
    <GaugeFrame value={value} max={max} label={label} caption={caption}>
      <circle
        className={trackClass}
        {...common}
        strokeDasharray={`${len(arc)} ${len(circumference)}`}
      />
      {percent(value, max) > 0 ? (
        <circle
          className={valueClass(tone)}
          {...common}
          strokeDasharray={`${len(arc * filled)} ${len(circumference)}`}
        />
      ) : null}
    </GaugeFrame>
  )
}
