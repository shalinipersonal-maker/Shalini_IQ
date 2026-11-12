# Public website

The website lives at `/` in the same Next.js app as the ENTRAIQ platform.

| What | Where to change it |
| --- | --- |
| Phones, WhatsApp, email, address, social links, real numbers, portfolio | `src/config/site.ts` (empty = hidden) |
| ENTRAIQ prices | `src/lib/site/pricing.ts` |
| Marketplace fee rates and their sources | `src/lib/site/fees.ts` (re-check every quarter) |
| Listing-check rules and auto-fix | `src/lib/site/listing-check.ts` |
| Policy pages | `src/app/privacy`, `src/app/refund-policy`, `src/app/terms` |
| SEO | `src/app/layout.tsx`, `src/app/page.tsx` (structured data), `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/opengraph-image.tsx` |

Pop-ups open from links: `#calc-amazon` (any calculator id) and `#enquiry`.

## Send every enquiry to reach@entrabuild.com (Google Apps Script, 5 minutes)

1. Open script.google.com → New project, paste the code below, Save.
2. Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone → Deploy. Copy the URL.
3. Put it in `.env` as `LEAD_WEBHOOK_URL=<that URL>` and restart the site.

```javascript
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  MailApp.sendEmail("reach@entrabuild.com", "Website lead " + data.reference, data.text);
  var sheet = SpreadsheetApp.openById("PASTE_YOUR_SHEET_ID").getSheets()[0];
  sheet.appendRow([new Date(), data.reference, data.lead.kind, data.lead.name, data.lead.phone, data.lead.email, data.lead.agency || "", data.lead.interest || data.lead.sellers || "", data.lead.message || ""]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
```

Until `LEAD_WEBHOOK_URL` is set, the site still accepts enquiries, shows the visitor WhatsApp / email / call buttons, and lists them on the Website leads page — it never claims the team was alerted.
