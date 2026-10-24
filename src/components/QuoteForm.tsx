import { useId, useRef, useState, type FormEvent } from 'react';

interface Props {
  email: string;
  phoneHref: string;
  businessName: string;
}

const jobTypes = [
  'Bathroom or ensuite',
  'Floor tiling',
  'Wall or feature wall',
  'Kitchen splashback',
  'Outdoor or alfresco',
  'Regrouting or repairs',
  'Something else',
];

type Errors = Partial<Record<'name' | 'contact' | 'suburb', string>>;

export default function QuoteForm({ email, phoneHref, businessName }: Props) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState<null | 'email' | 'sms'>(null);

  function read() {
    const fd = new FormData(formRef.current!);
    const get = (k: string) => String(fd.get(k) ?? '').trim();
    return {
      name: get('name'),
      phone: get('phone'),
      email: get('email'),
      suburb: get('suburb'),
      jobs: fd.getAll('job').map(String),
      area: get('area'),
      timing: get('timing'),
      details: get('details'),
    };
  }

  function validate(v: ReturnType<typeof read>): Errors {
    const e: Errors = {};
    if (!v.name) e.name = 'Enter your name so we know who to reply to.';
    if (!v.phone && !v.email) e.contact = 'Add a phone number or email so we can get back to you.';
    if (!v.suburb) e.suburb = 'Enter your suburb so we can check we service your area.';
    return e;
  }

  function message(v: ReturnType<typeof read>) {
    const lines: (string | null)[] = [
      `Hi ${businessName}, I'd like a tiling quote.`,
      '',
      `Name: ${v.name}`,
      v.phone ? `Phone: ${v.phone}` : null,
      v.email ? `Email: ${v.email}` : null,
      `Suburb: ${v.suburb}`,
      v.jobs.length > 0 ? `Job: ${v.jobs.join(', ')}` : null,
      v.area ? `Approx. area: ${v.area} m²` : null,
      v.timing ? `Timing: ${v.timing}` : null,
      ...(v.details ? ['', v.details] : []),
    ];
    return lines.filter((l) => l !== null).join('\n');
  }

  function submit(channel: 'email' | 'sms') {
    return (ev?: FormEvent) => {
      ev?.preventDefault();
      const v = read();
      const e = validate(v);
      setErrors(e);
      if (Object.keys(e).length) {
        requestAnimationFrame(() => summaryRef.current?.focus());
        return;
      }
      const body = encodeURIComponent(message(v));
      const href =
        channel === 'email'
          ? `mailto:${email}?subject=${encodeURIComponent(`Quote request: ${v.jobs[0] ?? 'Tiling'}, ${v.suburb}`)}&body=${body}`
          : `sms:${phoneHref}?&body=${body}`;
      window.location.href = href;
      setSent(channel);
    };
  }

  const input =
    'mt-2 block w-full min-h-[48px] rounded-xl border border-line bg-white px-4 text-base text-ink placeholder:text-stone/70 transition-colors hover:border-stone focus:border-bronze focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-[#8a6a35]/15 aria-[invalid=true]:border-red-600';
  const errorText = 'mt-2 text-sm font-medium text-red-700';
  const errCount = Object.keys(errors).length;

  return (
    // Without JavaScript (or before hydration) the browser still opens an email with the fields filled in.
    <form
      ref={formRef}
      onSubmit={submit('email')}
      action={`mailto:${email}?subject=${encodeURIComponent('Quote request')}`}
      method="post"
      encType="text/plain"
      noValidate
      className="space-y-6"
    >
      {errCount > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Please check {errCount === 1 ? 'one thing' : `${errCount} things`}:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {Object.entries(errors).map(([k, msg]) => (
              <li key={k}>
                <a href={`#${id}-${k === 'contact' ? 'phone' : k}`} className="underline">
                  {msg}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-name`} className="font-semibold">
            Name <span className="text-bronze" aria-hidden="true">*</span>
          </label>
          <input id={`${id}-name`} name="name" autoComplete="name" required aria-invalid={!!errors.name} aria-describedby={errors.name ? `${id}-name-err` : undefined} className={input} />
          {errors.name && <p id={`${id}-name-err`} className={errorText}>{errors.name}</p>}
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className="font-semibold">Phone</label>
          <input id={`${id}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!errors.contact} aria-describedby={`${id}-contact-hint${errors.contact ? ` ${id}-contact-err` : ''}`} className={input} />
        </div>
        <div>
          <label htmlFor={`${id}-email`} className="font-semibold">Email</label>
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" aria-invalid={!!errors.contact} aria-describedby={`${id}-contact-hint${errors.contact ? ` ${id}-contact-err` : ''}`} className={input} />
        </div>
        <p id={`${id}-contact-hint`} className="-mt-3 text-sm text-stone sm:col-span-2">
          Phone or email, whichever you prefer. <span className="text-bronze" aria-hidden="true">*</span>
        </p>
        {errors.contact && <p id={`${id}-contact-err`} className={`${errorText} -mt-4 sm:col-span-2`}>{errors.contact}</p>}

        <div>
          <label htmlFor={`${id}-suburb`} className="font-semibold">
            Suburb <span className="text-bronze" aria-hidden="true">*</span>
          </label>
          <input id={`${id}-suburb`} name="suburb" autoComplete="address-level2" required aria-invalid={!!errors.suburb} aria-describedby={errors.suburb ? `${id}-suburb-err` : undefined} className={input} />
          {errors.suburb && <p id={`${id}-suburb-err`} className={errorText}>{errors.suburb}</p>}
        </div>
        <div>
          <label htmlFor={`${id}-area`} className="font-semibold">Approx. area (m²)</label>
          <input id={`${id}-area`} name="area" type="number" inputMode="decimal" min={0} step="0.5" className={input} />
        </div>
      </div>

      <fieldset>
        <legend className="font-semibold">What needs tiling?</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {jobTypes.map((j) => (
            <label key={j} className="relative cursor-pointer">
              <input type="checkbox" name="job" value={j} className="peer sr-only" />
              <span className="inline-flex min-h-[44px] items-center rounded-full border border-line bg-white px-4 text-sm font-medium text-ink-soft transition-colors hover:border-stone peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-[#8a6a35]/30">
                {j}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${id}-timing`} className="font-semibold">When are you hoping to start?</label>
        <select id={`${id}-timing`} name="timing" className={`${input} cursor-pointer`} defaultValue="">
          <option value="">Choose one (optional)</option>
          <option>As soon as possible</option>
          <option>Within a month</option>
          <option>In 1–3 months</option>
          <option>Just getting prices</option>
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-details`} className="font-semibold">Anything else?</label>
        <textarea id={`${id}-details`} name="details" rows={4} aria-describedby={`${id}-details-hint`} className={`${input} py-3`} />
        <p id={`${id}-details-hint`} className="mt-2 text-sm text-stone">
          Tile type, size of the room, old tiles to remove… Photos help too: attach them in your email or text.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" className="btn btn-primary">Send by email</button>
        <button type="button" onClick={submit('sms')} className="btn btn-ghost">Send as a text</button>
      </div>
      <p className="text-sm text-stone">
        This opens your email or messaging app with your details filled in, ready to send. Nothing is sent until you press send there.
      </p>
      <p aria-live="polite" className="text-sm font-medium text-ink">
        {sent && `Your ${sent === 'email' ? 'email' : 'message'} app should now be open. If it did not open, contact us directly using the details on this page.`}
      </p>
    </form>
  );
}
