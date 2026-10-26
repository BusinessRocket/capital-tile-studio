import { useId, useState, type ReactNode } from 'react';
import type { ExtraId, ExtraUnit, TileSize } from '../data/site';

interface Pricing {
  tiles: { id: TileSize; label: string; detail: string; labour: number }[];
  supplyAdd: number;
  patternAdd: number;
  splashback: { rate: number; minimum: number };
  extras: { id: ExtraId; label: string; unit: ExtraUnit; price: number }[];
  gstIncluded?: boolean;
  minimum: number;
}

const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
// Quantity limit and labels per pricing unit.
const UNIT = {
  'm²': { max: 1000, suffix: 'm²', rate: '/m²', aria: 'area in square metres' },
  each: { max: 10, suffix: '', rate: ' each', aria: 'quantity' },
  hour: { max: 40, suffix: 'hrs', rate: '/hour', aria: 'hours' },
} as const;

const clamp = (n: number, max: number) => Math.max(0, Math.min(max, Number.isFinite(n) ? n : 0));

// Defined outside the estimator so inputs inside keep focus between renders.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export default function Estimator({ pricing }: { pricing: Pricing }) {
  const id = useId();
  const [size, setSize] = useState<TileSize>('standard');
  const [supply, setSupply] = useState(false);
  const [pattern, setPattern] = useState(false);
  const [area, setArea] = useState(20);
  const [splash, setSplash] = useState(0);
  // Per-m² extras track their own area; niches track a count.
  const [extras, setExtras] = useState<Record<ExtraId, { on: boolean; qty: number }>>({
    waterproofing: { on: false, qty: 20 },
    screed: { on: false, qty: 20 },
    removal: { on: false, qty: 20 },
    niche: { on: false, qty: 1 },
    repairs: { on: false, qty: 2 },
  });

  const tile = pricing.tiles.find((t) => t.id === size)!;
  const rate = tile.labour + (supply ? pricing.supplyAdd : 0) + (pattern ? pricing.patternAdd : 0);

  const lines: { label: string; amount: number }[] = [];
  if (area > 0) lines.push({ label: `${area} m² ${tile.label.toLowerCase()} at ${aud.format(rate)}/m²`, amount: area * rate });
  if (splash > 0) {
    const amount = Math.max(splash * pricing.splashback.rate, pricing.splashback.minimum);
    lines.push({ label: `Splashback, ${splash} m²${amount > splash * pricing.splashback.rate ? ' (minimum)' : ''}`, amount });
  }
  for (const x of pricing.extras) {
    const e = extras[x.id];
    if (!e.on || e.qty <= 0) continue;
    lines.push({
      label:
        x.unit === 'each'
          ? `${e.qty} × ${x.label.toLowerCase()}`
          : `${x.label}, ${e.qty} ${x.unit === 'hour' ? (e.qty === 1 ? 'hour' : 'hours') : 'm²'}`,
      amount: e.qty * x.price,
    });
  }
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const total = subtotal > 0 ? Math.max(subtotal, pricing.minimum) : 0;

  // Keep per-m² extras in step with the floor area until the visitor sets them separately.
  const changeArea = (n: number) => {
    const next = clamp(n, 1000);
    setExtras((prev) => {
      const copy = { ...prev };
      for (const x of pricing.extras) if (x.unit === 'm²' && !prev[x.id].on && prev[x.id].qty === area) copy[x.id] = { ...prev[x.id], qty: next };
      return copy;
    });
    setArea(next);
  };
  const toggleExtra = (x: ExtraId, on: boolean) => setExtras((p) => ({ ...p, [x]: { ...p[x], on } }));
  const qtyExtra = (x: ExtraId, qty: number, max: number) => setExtras((p) => ({ ...p, [x]: { ...p[x], qty: clamp(qty, max) } }));

  const chip =
    'flex h-full flex-col rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-stone peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-[#a8540f]/30';
  const numberBox = 'h-11 w-20 rounded-xl border border-line bg-white px-3 text-right tabular-nums';

  return (
    <div className="grid gap-8 rounded-[2rem] bg-white p-6 shadow-[0_30px_60px_-40px_rgb(0_0_0/0.3)] lg:grid-cols-5 md:p-10">
      <div className="space-y-8 lg:col-span-3">
        <Section title="1. Tile size">
          <div className="grid gap-3 sm:grid-cols-3">
            {pricing.tiles.map((t) => (
              <label key={t.id} className="relative cursor-pointer">
                <input type="radio" name={`${id}-size`} checked={size === t.id} onChange={() => setSize(t.id)} className="peer sr-only" />
                <span className={chip}>
                  <span className="font-semibold">{t.label}</span>
                  <span className="mt-1 text-sm opacity-75">{t.detail}</span>
                  <span className="mt-2 text-sm font-semibold tabular-nums">{aud.format(t.labour)}/m²</span>
                </span>
              </label>
            ))}
          </div>
        </Section>

        <Section title="2. Tiles">
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: false, label: 'Labour only', hint: 'You supply the tiles' },
              { v: true, label: 'Supply & lay', hint: `We supply them, +${aud.format(pricing.supplyAdd)}/m²` },
            ].map((o) => (
              <label key={o.label} className="relative cursor-pointer">
                <input type="radio" name={`${id}-supply`} checked={supply === o.v} onChange={() => setSupply(o.v)} className="peer sr-only" />
                <span className={chip}>
                  <span className="font-semibold">{o.label}</span>
                  <span className="mt-1 text-sm opacity-75">{o.hint}</span>
                </span>
              </label>
            ))}
          </div>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
            <input type="checkbox" checked={pattern} onChange={(e) => setPattern(e.target.checked)} className="h-5 w-5 accent-[#a8540f]" />
            <span>Herringbone or chevron layout <span className="text-stone">(+{aud.format(pricing.patternAdd)}/m²)</span></span>
          </label>
        </Section>

        <Section title="3. Area to tile">
          <div className="flex items-center gap-4">
            <label htmlFor={`${id}-area`} className="sr-only">
              Tiling area in square metres
            </label>
            <input
              id={`${id}-area`}
              type="range"
              min={0}
              max={1000}
              step={1}
              value={area}
              onChange={(e) => changeArea(Number(e.target.value))}
              aria-valuetext={`${area} square metres`}
              className="h-11 w-full cursor-pointer accent-[#a8540f]"
            />
            <input type="number" inputMode="numeric" min={0} max={1000} value={area} onChange={(e) => changeArea(Number(e.target.value))} aria-label="Tiling area in square metres" className={numberBox} />
            <span className="text-stone">m²</span>
          </div>
          <p className="text-sm text-stone">Floors and walls: length × width of each surface, added together.</p>
          <div className="flex items-center justify-between gap-4 pt-2">
            <label htmlFor={`${id}-splash`}>
              Kitchen splashback <span className="text-stone">({aud.format(pricing.splashback.rate)}/m², min {aud.format(pricing.splashback.minimum)})</span>
            </label>
            <span className="flex items-center gap-2">
              <input id={`${id}-splash`} type="number" inputMode="decimal" min={0} max={50} step={0.5} value={splash} onChange={(e) => setSplash(clamp(Number(e.target.value), 50))} className={numberBox} />
              <span className="text-stone">m²</span>
            </span>
          </div>
        </Section>

        <Section title="4. Extras">
          {pricing.extras.map((x) => {
            const e = extras[x.id];
            return (
              <div key={x.id} className="flex items-center justify-between gap-4">
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={e.on} onChange={(ev) => toggleExtra(x.id, ev.target.checked)} className="h-5 w-5 accent-[#a8540f]" />
                  <span>
                    {x.label}{' '}
                    <span className="text-stone">
                      ({aud.format(x.price)}
                      {UNIT[x.unit].rate})
                    </span>
                  </span>
                </label>
                <span className={`flex items-center gap-2 transition-opacity ${e.on ? '' : 'pointer-events-none opacity-40'}`}>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={UNIT[x.unit].max}
                    value={e.qty}
                    disabled={!e.on}
                    onChange={(ev) => qtyExtra(x.id, Number(ev.target.value), UNIT[x.unit].max)}
                    aria-label={`${x.label} ${UNIT[x.unit].aria}`}
                    className={numberBox}
                  />
                  <span className="w-7 text-stone">{UNIT[x.unit].suffix}</span>
                </span>
              </div>
            );
          })}
        </Section>
      </div>

      <div className="lg:col-span-2">
        <div className="sticky top-20 rounded-3xl bg-mist p-6 md:p-8" aria-live="polite">
          <p className="text-sm font-semibold uppercase tracking-wider text-stone">Estimated cost</p>
          <p className="mt-2 text-5xl font-semibold tracking-tighter tabular-nums md:text-6xl">{aud.format(total)}</p>
          {lines.length > 0 ? (
            <ul className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              {lines.map((l) => (
                <li key={l.label} className="flex justify-between gap-4">
                  <span className="text-ink-soft">{l.label}</span>
                  <span className="font-medium tabular-nums">{aud.format(l.amount)}</span>
                </li>
              ))}
              {total > subtotal && (
                <li className="flex justify-between gap-4 text-stone">
                  <span>Minimum job charge applies</span>
                  <span className="tabular-nums">{aud.format(pricing.minimum)}</span>
                </li>
              )}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-stone">Enter an area or choose an extra to see an estimate.</p>
          )}
          <p className="mt-5 text-xs leading-relaxed text-stone">{pricing.gstIncluded ? 'Prices include GST. ' : ''}A guide only. Your exact price is confirmed in a written quote after we measure up.</p>
          <a href="/contact/#quote" className="btn btn-primary btn-glass mt-6 w-full">
            Get an exact quote
          </a>
        </div>
      </div>
    </div>
  );
}
