import { useId, useRef, useState, type FormEvent } from 'react';

interface Props {
  email: string;
  phone: string;
  phoneHref: string;
  businessName: string;
  /** EmailJS settings. When all are set, quotes are delivered straight to the inbox. */
  emailjs?: { serviceId: string; templateId: string; publicKey: string };
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

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

export default function QuoteForm({ email, phone, phoneHref, businessName, emailjs }: Props) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState<null | 'email' | 'sms'>(null);
  const [status, setStatus] = useState<Status>('idle');
  const direct = Boolean(emailjs?.serviceId && emailjs.templateId && emailjs.publicKey);

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

  const subjectFor = (v: ReturnType<typeof read>) => `Quote request: ${v.jobs[0] ?? 'Tiling'}, ${v.suburb}`;

  function openApp(channel: 'email' | 'sms', v: ReturnType<typeof read>) {
    const body = encodeURIComponent(message(v));
    window.location.href =
      channel === 'email'
        ? `mailto:${email}?subject=${encodeURIComponent(subjectFor(v))}&body=${body}`
        : `sms:${phoneHref}?&body=${body}`;
    setSent(channel);
  }

  // Delivers the quote straight to the inbox via EmailJS. The template's Auto-Reply
  // then emails the customer (when they gave an email address).
  async function sendDirect(v: ReturnType<typeof read>) {
    // Bots tick the hidden spam trap; pretend success and send nothing.
    if (new FormData(formRef.current!).get('botcheck')) {
      setStatus('sent');
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: emailjs!.serviceId,
          template_id: emailjs!.templateId,
          user_id: emailjs!.publicKey,
          template_params: {
            subject: subjectFor(v),
            name: v.name,
            phone: v.phone || '—',
            email: v.email,
            reply_to: v.email || email,
            suburb: v.suburb,
            job: v.jobs.join(', ') || '—',
            area: v.area ? `${v.area} m²` : '—',
            timing: v.timing || '—',
            details: v.details || '—',
            business: businessName,
            business_phone: phone,
          },
        }),
      });
      if (!res.ok) throw new Error('Not delivered');
      setStatus('sent');
      formRef.current?.reset();
      requestAnimationFrame(() => doneRef.current?.focus());
    } catch {
      setStatus('error');
    }
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
      if (channel === 'email' && direct) void sendDirect(v);
      else openApp(channel, v);
    };
  }

  if (status === 'sent') {
    return (
      <div ref={doneRef} tabIndex={-1} role="status" className="rounded-3xl bg-mist p-8 text-center outline-none">
        <p className="text-2xl font-semibold">Thanks, your quote request is in.</p>
        <p className="mt-3 leading-relaxed text-ink-soft">
          We will get back to you soon. Photos of the space help us quote accurately: text them to{' '}
          <a href={`sms:${phoneHref}`} className="font-semibold text-bronze underline">
            {phone}
          </a>
          .
        </p>
        <button type="button" onClick={() => setStatus('idle')} className="btn btn-ghost mt-6">
          Send another request
        </button>
      </div>
    );
  }

  const input =
    'mt-2 block w-full min-h-[48px] rounded-xl border border-line bg-white px-4 text-base text-ink placeholder:text-stone/70 transition-colors hover:border-stone focus:border-bronze focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-[#a8540f]/15 aria-[invalid=true]:border-red-600';
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
              <span className="inline-flex min-h-[44px] items-center rounded-full border border-line bg-white px-4 text-sm font-medium text-ink-soft transition-colors hover:border-stone peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-[#a8540f]/30">
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
          Tile type, size of the room, old tiles to remove… Photos help too: {direct ? `text them to ${phone} after sending.` : 'attach them in your email or text.'}
        </p>
      </div>

      {/* Spam trap: hidden from people, bots tick it. */}
      <input type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={status === 'sending'} aria-busy={status === 'sending'} className="btn btn-primary disabled:cursor-wait disabled:opacity-70">
          {direct ? (status === 'sending' ? 'Sending…' : 'Send quote request') : 'Send by email'}
        </button>
        <button type="button" onClick={submit('sms')} className="btn btn-ghost">Send as a text</button>
      </div>
      <p className="text-sm text-stone">
        {direct
          ? `Your request goes straight to ${businessName}. "Send as a text" opens your messages app instead.`
          : 'This opens your email or messaging app with your details filled in, ready to send. Nothing is sent until you press send there.'}
      </p>
      <p aria-live="polite" className="text-sm font-medium text-ink">
        {status === 'error' && (
          <span className="text-red-700">
            Sorry, that didn't go through.{' '}
            <button type="button" onClick={() => openApp('email', read())} className="underline">
              Send it from your email app
            </button>{' '}
            or call <a href={`tel:${phoneHref}`} className="underline">{phone}</a>.
          </span>
        )}
        {status !== 'error' && sent && `Your ${sent === 'email' ? 'email' : 'message'} app should now be open. If it did not open, contact us directly using the details on this page.`}
      </p>
    </form>
  );
}
