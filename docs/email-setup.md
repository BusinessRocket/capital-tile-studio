# Quote emails: EmailJS setup

The website's quote form sends each request straight to **capitaltilestudioact@gmail.com**
and, if the customer gave an email address, sends them an instant thank-you reply from the
same Gmail. It uses EmailJS (free plan: 200 emails a month, about 100 quotes, because each
quote is one notification plus one auto-reply).

Until the three IDs below are filled in `src/data/site.ts`, the form falls back to opening
the customer's own email app.

## 1. Create the account and connect Gmail

1. Sign up at **emailjs.com** (free).
2. **Email Services → Add New Service → Gmail → Connect Account**, and sign in as
   **capitaltilestudioact@gmail.com**. Allow sending. Click **Create Service**.
3. Copy the **Service ID** (looks like `service_ab12cd3`).

## 2. Create the template

**Email Templates → Create New Template.** Fill in each tab:

### Content tab (the email you receive)

- **Subject:** `{{subject}}`
- **To Email:** `capitaltilestudioact@gmail.com`
- **From Name:** `{{name}} (website quote)`
- **Reply To:** `{{reply_to}}`
- **Content:**

```
New quote request from the website

Name:     {{name}}
Phone:    {{phone}}
Email:    {{email}}
Suburb:   {{suburb}}
Job:      {{job}}
Area:     {{area}}
Timing:   {{timing}}

Details:
{{details}}

Press Reply to answer the customer directly.
```

### Auto-Reply tab (the email the customer receives)

Turn **Auto-Reply** on, then:

- **Subject:** `Thanks {{name}}, we've received your tiling quote request`
- **To Email:** `{{email}}`
- **From Name:** `Capital Tile Studio`
- **Reply To:** `capitaltilestudioact@gmail.com`
- **Content:**

```
Hi {{name}},

Thanks for getting in touch with Capital Tile Studio. We've received your quote request
for {{job}} in {{suburb}}, and we'll be in touch shortly.

Photos of the space help us quote accurately. You can reply to this email with them,
or text them to {{business_phone}}.

What you sent us:
Area: {{area}}
Timing: {{timing}}
Details: {{details}}

Kind regards,
Thinley Phuntsho
Capital Tile Studio
{{business_phone}} · capitaltilestudioact@gmail.com
```

Click **Save**, then copy the **Template ID** (looks like `template_xy98zw7`).

## 3. Copy your Public Key

**Account → General → Public Key** (looks like `AbCdEf12GhIjKl34`). It is public by design
and safe in website code.

## 4. Lock it to the website (recommended)

In **Account → Security**:

- Leave **"Allow EmailJS API for non-browser applications"** switched **off** (the default).
  The website sends from the visitor's browser, so it keeps working.
- If your plan shows an allowed-domains list, add
  `capital-tile-studio.capital-tile-studio.workers.dev`, so only your site can send with your key.

## 5. Turn it on

Put the three values in `src/data/site.ts` under `emailjs`:

```ts
emailjs: {
  serviceId: 'service_ab12cd3',
  templateId: 'template_xy98zw7',
  publicKey: 'AbCdEf12GhIjKl34',
},
```

Then build and deploy.
