import { useId, useState } from 'react';

interface Props {
  labour: number;
  supplied: number;
}

const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

export default function Estimator({ labour, supplied }: Props) {
  const [area, setArea] = useState(20);
  const [supply, setSupply] = useState(false);
  const id = useId();

  const rate = supply ? supplied : labour;
  const total = area * rate;

  const options = [
    { value: false, label: 'Labour only', hint: 'You supply the tiles', rate: labour },
    { value: true, label: 'Supply & lay', hint: 'We supply the tiles', rate: supplied },
  ];

  return (
    <div className="grid gap-10 rounded-[2rem] bg-white p-6 shadow-[0_30px_60px_-40px_rgb(0_0_0/0.3)] md:grid-cols-2 md:p-12">
      <div className="space-y-8">
        <fieldset>
          <legend className="font-semibold">Option</legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {options.map((o) => (
              <label key={o.label} className="relative cursor-pointer">
                <input
                  type="radio"
                  name={`${id}-option`}
                  checked={supply === o.value}
                  onChange={() => setSupply(o.value)}
                  className="peer sr-only"
                />
                <span className="flex h-full flex-col rounded-2xl border border-line p-4 transition-colors hover:border-stone peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-[#a8540f]/30">
                  <span className="font-semibold">{o.label}</span>
                  <span className="mt-1 text-sm opacity-75">{o.hint}</span>
                  <span className="mt-2 text-sm font-semibold tabular-nums">{aud.format(o.rate)}/m²</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor={`${id}-area`} className="font-semibold">
              Floor area
            </label>
            <span className="tabular-nums text-ink-soft" aria-hidden="true">
              {area} m²
            </span>
          </div>
          <p id={`${id}-area-hint`} className="text-sm text-stone">
            Length × width of each floor you want tiled.
          </p>
          <div className="mt-3 flex items-center gap-4">
            <input
              id={`${id}-area`}
              type="range"
              min={1}
              max={150}
              step={1}
              value={area}
              onChange={(e) => setArea(Number(e.target.value))}
              aria-describedby={`${id}-area-hint`}
              aria-valuetext={`${area} square metres`}
              className="h-11 w-full cursor-pointer accent-[#a8540f]"
            />
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={1000}
              value={area}
              onChange={(e) => setArea(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
              aria-label="Floor area in square metres"
              className="h-11 w-20 rounded-xl border border-line bg-white px-3 text-right tabular-nums"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center rounded-3xl bg-mist p-8 text-center" aria-live="polite">
        <p className="text-sm font-semibold uppercase tracking-wider text-stone">Estimated cost</p>
        <p className="mt-2 text-6xl font-semibold tracking-tighter tabular-nums">{aud.format(total)}</p>
        <p className="mt-2 text-ink-soft tabular-nums">
          {area} m² at {aud.format(rate)}/m², {supply ? 'tiles supplied' : 'labour only'}
        </p>
        <a href="/contact/#quote" className="btn btn-primary mt-6 self-center">
          Get an exact quote
        </a>
      </div>
    </div>
  );
}
