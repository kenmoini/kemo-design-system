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

export type DonutGaugeProps = GaugeProps

/** One ratio as a full ring filled clockwise from 12 o'clock, with the percentage in the middle. */
export function DonutGauge({ value, max, label, caption, tone }: DonutGaugeProps) {
  const filled = ratio(value, max)
  const { center, radius, stroke } = gauge
  return (
    <GaugeFrame value={value} max={max} label={label} caption={caption}>
      <circle className={trackClass} cx={center} cy={center} r={radius} strokeWidth={stroke} />
      {percent(value, max) > 0 ? (
        <circle
          className={valueClass(tone)}
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${len(circumference)} ${len(circumference)}`}
          strokeDashoffset={len(circumference * (1 - filled))}
          transform={`rotate(-90 ${center} ${center})`}
        />
      ) : null}
    </GaugeFrame>
  )
}
