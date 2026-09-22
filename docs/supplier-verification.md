# Supplier verification checklist

How to check a supplier application before approving it in Supabase (`suppliers` table,
`status = 'pending'` → `'approved'`). Sized for checking by hand, in small numbers. Add more
rigor later if the volume grows past what one person can call through.

Any one check failing is a no. Two red flags together is a no, even if each is explainable alone.

## 1. Call them on WhatsApp

Use the number from their application. Ask:

- What parts do you actually stock, and for which vehicles?
- How long from order to a customer's door in Zimbabwe?
- What happens if a part arrives wrong or broken?

Listen for confident, specific answers, not a script. No answer, or the number not existing, is
an automatic no.

## 2. Ask for one piece of proof they're a real business

Any one of these is enough:

- A trade licence photo (Dubai) or business licence (China), or a Zimbabwe company registration
  (Registrar of Companies) or City Council trading licence for a local applicant.
- A storefront on a marketplace they already sell through — Alibaba, 1688, Instagram — with real
  order history or reviews.
- A photo of their stock or warehouse with today's date written on paper in the shot, so it can't
  be reused from elsewhere.

## 3. For a Zimbabwean applicant, go look

This is the one check only possible locally, and it's the strongest of them all: visit the shop,
or send someone. A real shop with real stock settles it. Not required for Dubai/China applicants,
since it isn't practical.

## Red flags

- Prices far below anyone else for the same part.
- No verifiable storefront and no willingness to send stock photos.
- Pressure to approve quickly, or to move the conversation off WhatsApp.

## Keep a record

Note the business name, what you saw, and the date — a shared note or spreadsheet is enough for
now. Don't rely on memory later.

## After approving

- **Start them on one listing** before they post more, so a bad batch of photos or a wrong price
  doesn't spread across their whole catalogue.
- **Recheck periodically** — every few months, or whenever a buyer complains. A supplier who was
  fine on day one can still send bad parts a year later.

## How to approve

In the Supabase SQL editor for the PaGaraji project:

```sql
update public.suppliers set status = 'approved' where user_id = 'THE-USER-ID';
```

Find the id and business details first:

```sql
select user_id, business, country, city, whatsapp, created_at
from public.suppliers
where status = 'pending';
```

Or do it by hand in **Table Editor → suppliers**, changing `status` on the right row.
