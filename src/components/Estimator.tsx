import { useId, useState } from 'react';

interface Props {
  intro: number;
  standard: number;
}

const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

export default function Estimator({ intro, standard }: Props) {
  const [floor, setFloor] = useState(12);
  const [wall, setWall] = useState(20);
  const id = useId();

  const area = floor + wall;
  const total = area * intro;
  const saving = area * (standard - intro);

  const field = (label: string, hint: string, value: number, set: (n: number) => void, max: number, key: string) => (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={`${id}-${key}`} className="font-semibold">
          {label}
        </label>
        <span className="tabular-nums text-ink-soft" aria-hidden="true">
          {value} m²
        </span>
      </div>
      <p id={`${id}-${key}-hint`} className="text-sm text-stone">
        {hint}
      </p>
      <div className="mt-3 flex items-center gap-4">
        <input
          id={`${id}-${key}`}
          type="range"
          min={0}
          max={max}
          step={1}
          value={value}
          onChange={(e) => set(Number(e.target.value))}
          aria-describedby={`${id}-${key}-hint`}
          aria-valuetext={`${value} square metres`}
          className="h-11 w-full cursor-pointer accent-[#a8540f]"
        />
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={500}
          value={value}
          onChange={(e) => set(Math.max(0, Math.min(500, Number(e.target.value) || 0)))}
          aria-label={`${label} in square metres`}
          className="h-11 w-20 rounded-xl border border-line bg-white px-3 text-right tabular-nums"
        />
      </div>
    </div>
  );

  return (
    <div className="grid gap-10 rounded-[2rem] bg-white p-6 shadow-[0_30px_60px_-40px_rgb(0_0_0/0.3)] md:grid-cols-2 md:p-12">
      <div className="space-y-8">
        {field('Floor area', 'Length × width of each floor you want tiled.', floor, setFloor, 120, 'floor')}
        {field('Wall area', 'Height × width of each wall you want tiled.', wall, setWall, 120, 'wall')}
      </div>
      <div className="flex flex-col justify-center rounded-3xl bg-mist p-8 text-center" aria-live="polite">
        <p className="text-sm font-semibold uppercase tracking-wider text-stone">Estimated tiling cost</p>
        <p className="mt-2 text-6xl font-semibold tracking-tighter tabular-nums">{aud.format(total)}</p>
        <p className="mt-2 text-ink-soft tabular-nums">
          {area} m² at {aud.format(intro)}/m²
        </p>
        {saving > 0 && (
          <p className="mx-auto mt-4 rounded-full bg-white px-4 py-2 text-sm font-medium text-bronze tabular-nums">
            {aud.format(saving)} less than our standard rate
          </p>
        )}
        <a href="/contact/#quote" className="btn btn-primary mt-6 self-center">
          Get an exact quote
        </a>
      </div>
    </div>
  );
}
