/**
 * End-to-end smoke test of the demo acceptance criteria.
 * Usage:  npm i -D playwright && npx playwright install chromium
 *         npm run build && npm start &          (or npm run dev)
 *         BASE_URL=http://localhost:3000 node scripts/e2e-smoke.mjs
 */
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.SHOTS_DIR;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(`${page.url()} :: ${m.text().slice(0, 240)}`));
page.on("pageerror", (e) => consoleErrors.push(`${page.url()} :: PAGEERROR ${String(e).slice(0, 240)}`));

let failed = 0;
const check = (ok, msg) => { if (!ok) failed++; console.log(`${ok ? "  ok  " : " FAIL "} ${msg}`); };
const step = async (msg, fn) => { try { await fn(); } catch (e) { failed++; console.log(` FAIL  ${msg}\n        ${String(e).split("\n")[0].slice(0, 200)}`); } };
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });
const kpi = (label) => page.locator(`div:has(> div:text-is("${label}")) p.tnum`).first().innerText();
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("entraiq-demo-v1")).state);
const settle = () => page.waitForTimeout(350);

// ---- API -----------------------------------------------------------------------------------------
await step("API", async () => {
  const health = await (await ctx.request.get(`${BASE}/api/health`)).json();
  check(health.status === "ok" && health.mode === "demo", "GET /api/health reports demo mode");
  const integ = await (await ctx.request.get(`${BASE}/api/v1/integrations`)).json();
  check(integ.connectors.length === 4 && integ.connectors.every((c) => c.connection !== "connected"), "GET /api/v1/integrations: 4 connectors, none claims to be connected");
  check(integ.connectors.every((c) => c.message.includes("pending configuration") || c.missingEnv.length === 0), "unconfigured connectors say \"Integration pending configuration.\"");
});

// ---- Entry ---------------------------------------------------------------------------------------
await step("demo entry", async () => {
  await page.goto(`${BASE}/overview`);
  await page.waitForURL(`${BASE}/login`);
  check(true, "unauthenticated visit to /overview redirects to the demo entry");
  await page.getByLabel("Your name").fill("");
  await page.getByRole("button", { name: "Enter demo workspace" }).click();
  check(await page.getByText("Enter the name to show").isVisible(), "entry form validates the name");
  await page.getByLabel("Your name").fill("Ananya Rao");
  await page.getByRole("button", { name: "Enter demo workspace" }).click();
  await page.waitForURL(/overview/);
  await page.getByRole("heading", { name: "Overview" }).waitFor();
  check((await page.getByText("DEMO ENVIRONMENT").count()) >= 1 && (await page.getByText("Sample data — not connected to live marketplace accounts.").count()) >= 1, "demo indicator and notice are visible");
  await shot("01-overview");
});

// ---- Global filters ------------------------------------------------------------------------------
await step("filters", async () => {
  const rev30 = await kpi("Total revenue");
  await page.getByRole("button", { name: "Change date range" }).click();
  await page.getByRole("menuitem", { name: "Last 7 days" }).click();
  await settle();
  const rev7 = await kpi("Total revenue");
  check(rev7 !== rev30, `date range changes revenue (${rev30} → ${rev7})`);
  await page.getByRole("radio", { name: "Flipkart", exact: true }).click();
  await settle();
  const revFk = await kpi("Total revenue");
  check(revFk !== rev7, `marketplace filter changes revenue (${rev7} → ${revFk})`);
  await page.getByRole("radio", { name: "All", exact: true }).click();
  await page.getByRole("button", { name: "Switch client workspace" }).click();
  await page.getByRole("menuitem", { name: /Tarang Naturals/ }).click();
  await settle();
  check(await page.getByText(/Tarang Naturals · /).first().isVisible() && (await kpi("Total revenue")) !== rev7, "client switch changes the workspace data");
  await page.getByRole("button", { name: "Change date range" }).click();
  await page.getByRole("menuitem", { name: "Custom range" }).click();
  await page.getByRole("button", { name: "Apply range" }).click();
  await settle();
  check(await page.getByRole("button", { name: "Change date range" }).innerText().then((t) => /–/.test(t)), "custom date range applies");
  await page.getByRole("button", { name: "Change date range" }).click();
  await page.getByRole("menuitem", { name: "Last 30 days" }).click();
  await page.getByRole("button", { name: "Switch client workspace" }).click();
  await page.getByRole("menuitem", { name: /Aarvi Living/ }).click();
  await page.getByRole("radio", { name: "Orders", exact: true }).click();
  check(await page.getByRole("heading", { name: "Orders", exact: true }).isVisible(), "overview chart switches metric");
});

// ---- Every navigation route ------------------------------------------------------------------------
const ROUTES = [["AI Intelligence Center", "/ai"], ["Amazon", "/marketplaces/amazon"], ["Flipkart", "/marketplaces/flipkart"], ["Other marketplaces", "/marketplaces/other"], ["Meta Ads", "/meta-ads"], ["Advertising Analytics", "/advertising"], ["Creative Studio", "/studio"], ["Sales Analytics", "/sales"], ["Products", "/products"], ["Reports", "/reports"], ["Clients", "/clients"], ["Settings", "/settings"], ["Overview", "/overview"]];
for (const [label, path] of ROUTES)
  await step(`nav ${label}`, async () => {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: new RegExp(`^${label}`) }).click();
    await page.waitForURL(`**${path}`);
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    await page.waitForTimeout(500);
    check(true, `navigation → ${path}`);
    await shot(`nav-${path.replace(/\//g, "_")}`);
  });

// ---- Marketplaces ----------------------------------------------------------------------------------
await step("marketplace", async () => {
  await page.goto(`${BASE}/marketplaces/amazon`);
  await page.getByRole("button", { name: "Connect account" }).first().click();
  await page.getByRole("button", { name: "Simulate authorisation" }).click();
  await page.getByText("Stopped at token exchange").waitFor({ timeout: 5000 });
  check(true, "connection flow is simulated and stops at \"integration pending configuration\"");
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "At risk" }).click();
  check((await page.getByText("Critical").count()) + (await page.getByText("Low", { exact: true }).count()) > 0, "inventory filter shows at-risk listings");
});

// ---- Products --------------------------------------------------------------------------------------
await step("products", async () => {
  await page.goto(`${BASE}/products`);
  await page.getByLabel("Search products").fill("bottle");
  await settle();
  const rows = await page.locator("tbody tr").count();
  check(rows === 2, `product search filters the table (${rows} rows for "bottle")`);
  await page.locator("tbody tr").first().click();
  await page.getByText("Campaigns targeting this product").waitFor();
  check(true, "product detail opens with analytics");
  await page.keyboard.press("Escape");
});

// ---- Meta Ads --------------------------------------------------------------------------------------
await step("meta ads", async () => {
  await page.goto(`${BASE}/meta-ads`);
  await page.getByLabel("Status").selectOption("paused");
  await settle();
  check((await page.locator("tbody tr").count()) === 1, "campaign status filter works");
  await page.getByLabel("Status").selectOption("all");
  await page.getByRole("button", { name: /Actions for Prospecting/ }).click();
  await page.getByRole("menuitem", { name: "Pause campaign" }).click();
  await settle();
  check(Object.values((await state()).campaignEdits).some((e) => e.status === "paused"), "pause campaign changes local demo state");
  await page.reload();
  await page.getByRole("button", { name: /Actions for Prospecting/ }).waitFor();
  check(await page.locator("tr", { hasText: "Prospecting" }).getByText("Paused").isVisible(), "paused status survives a page refresh");
  await page.locator("tr", { hasText: "Prospecting" }).click();
  await page.getByText("Ad sets and ads").waitFor();
  check(true, "campaign details open with ad sets");
  await page.getByRole("button", { name: "Resume" }).click();
  await page.locator("tbody tr", { hasText: "Reel 9:16" }).or(page.locator("tbody tr", { hasText: "Collection" })).first().click();
  check(await page.getByText("Ad-level figures roll up").isVisible(), "individual ad view opens");
  await shot("02-campaign-detail");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Create campaign" }).click();
  await page.getByRole("button", { name: "Create campaign" }).last().click();
  check(await page.getByText("Use at least 3 characters").isVisible(), "campaign form validates input");
  await page.getByLabel("Campaign name").fill("Demo | Launch test");
  await page.getByLabel("Daily budget (₹)").fill("1500");
  await page.getByRole("button", { name: "Create campaign" }).last().click();
  await page.getByText("Created in demo").waitFor();
  check(true, "create campaign adds a demo campaign");
  await page.getByRole("button", { name: "Actions for Demo | Launch test" }).click();
  await page.getByRole("menuitem", { name: "Edit campaign" }).click();
  await page.getByLabel("Daily budget (₹)").fill("2500");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.locator("tr", { hasText: "Demo | Launch test" }).getByText("₹2,500/day").waitFor();
  check(true, "edit campaign updates the budget");
});

// ---- AI --------------------------------------------------------------------------------------------
await step("ai", async () => {
  await page.goto(`${BASE}/ai`);
  await page.getByRole("button", { name: "Generate insights" }).click();
  await page.getByText(/insights generated from sample data/).waitFor({ timeout: 6000 });
  check((await page.getByRole("button", { name: "Explain this insight" }).count()) >= 4, "AI recommendations are generated and listed");
  await page.getByRole("button", { name: "Explain this insight" }).first().click();
  await page.getByText("How this was worked out").waitFor();
  check(true, "\"Explain this insight\" shows the method");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Mark as reviewed" }).first().click();
  check((await state()).reviewed.length === 1, "\"Mark as reviewed\" is stored");
  await page.getByRole("tab", { name: /Inventory risk/ }).click();
  check((await page.getByText("days of stock left").count()) > 0, "insight category filter works");
  await shot("03-ai");
});

// ---- Reports ---------------------------------------------------------------------------------------
await step("reports", async () => {
  await page.goto(`${BASE}/reports`);
  await page.getByRole("button", { name: /Campaign report/ }).click();
  const shown = await page.locator("tbody tr").count();
  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]);
  const text = fs.readFileSync(await csv.path(), "utf8");
  const dataRows = text.trim().split("\r\n").length - 7;
  check(csv.suggestedFilename().endsWith(".csv") && dataRows === shown && text.includes("DEMO ENVIRONMENT"), `CSV export has the ${shown} rows shown and is marked as demo data`);
  await page.getByRole("button", { name: "Generate PDF" }).click();
  const [pdf] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download PDF" }).click()]);
  const bytes = fs.readFileSync(await pdf.path());
  check(bytes.subarray(0, 5).toString() === "%PDF-" && bytes.length > 3000, `PDF report generated (${Math.round(bytes.length / 1024)} KB)`);
  if (SHOTS) fs.copyFileSync(await pdf.path(), `${SHOTS}/sample-report.pdf`);
  await page.getByText("Export history").scrollIntoViewIfNeeded();
  check((await state()).reports.length === 2, "exports are recorded in history");
});

// ---- Creative Studio -------------------------------------------------------------------------------
await step("studio", async () => {
  await page.goto(`${BASE}/studio`);
  await page.getByRole("button", { name: "Use template Festive greeting offer" }).click();
  await page.waitForURL(/editor/);
  await page.locator("canvas").first().waitFor();
  await page.waitForTimeout(1200);
  const box = await page.locator("canvas").first().boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.13);
  await page.getByLabel("Text content").fill("Diwali 40% OFF");
  await page.getByLabel("Text colour").last().fill("#ffffff");
  const before = (await state()).projects[0]?.doc.els.length ?? 0;
  await page.getByRole("tab", { name: "Shapes" }).click();
  await page.getByRole("button", { name: "Star" }).click();
  await page.getByRole("tab", { name: "Text" }).click();
  await page.getByRole("button", { name: "Add a subheading" }).click();
  await page.waitForTimeout(1000);
  const s1 = (await state()).projects[0];
  check(s1.doc.els.length === before + 2 && s1.doc.els.some((e) => e.text === "Diwali 40% OFF"), "canvas editing works: text edited, shape and text added, autosaved");
  // drag the selected layer and confirm its position changed
  const sel0 = s1.doc.els[s1.doc.els.length - 1];
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.62, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(1000);
  const sel1 = (await state()).projects[0].doc.els.find((e) => e.id === sel0.id);
  check(sel1.x !== sel0.x || sel1.y !== sel0.y, "drag-and-drop moves a layer");
  await page.getByRole("button", { name: "Undo" }).click();
  await page.getByRole("button", { name: "Redo" }).click();
  await page.setInputFiles('input[type="file"]', { name: "product.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAVklEQVR42u3PMQEAAAgDoJvc6FrBzwMJSDrZPSsiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIt8WqRwAgXOQ0vsAAAAASUVORK5CYII=", "base64") }).catch(async () => { await page.getByRole("tab", { name: "Uploads" }).click(); await page.setInputFiles('input[type="file"]', { name: "product.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAVklEQVR42u3PMQEAAAgDoJvc6FrBzwMJSDrZPSsiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIt8WqRwAgXOQ0vsAAAAASUVORK5CYII=", "base64") }); });
  await page.waitForTimeout(1200);
  check((await state()).uploads.length === 1 && (await state()).projects[0].doc.els.some((e) => e.type === "image"), "image upload is placed on the canvas");
  await page.getByRole("tab", { name: "AI" }).click();
  await page.getByRole("button", { name: "Generate copy" }).click();
  await page.getByText("Campaign visual concepts").waitFor({ timeout: 5000 });
  check(true, "AI copy, headlines and concepts are generated (demo)");
  await shot("04-studio-editor");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Preview" }).click();
  await page.getByAltText("Creative preview").waitFor();
  await page.keyboard.press("Escape");
  for (const [label, ext] of [["PNG", "png"], ["JPEG", "jpg"]]) {
    await page.getByRole("button", { name: "Export" }).click();
    const [d] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: new RegExp(label) }).click()]);
    const b = fs.readFileSync(await d.path());
    check(d.suggestedFilename().endsWith(`1080x1080.${ext}`) && b.length > 5000, `export ${label} at placement size (${d.suggestedFilename()})`);
    if (SHOTS && ext === "png") fs.copyFileSync(await d.path(), `${SHOTS}/sample-creative.png`);
  }
  await page.getByRole("link", { name: "Back to library" }).click();
  await page.waitForURL(/\/studio$/);
  await page.getByRole("button", { name: /^Open / }).first().click();
  await page.waitForURL(/editor/);
  await page.locator("canvas").first().waitFor();
  check(await page.getByText("“Diwali 40% OFF”").isVisible(), "saved creative reopens with its edits");
});

// ---- Clients ---------------------------------------------------------------------------------------
await step("clients", async () => {
  await page.goto(`${BASE}/clients`);
  await page.locator("tbody tr", { hasText: "Kridha Active" }).click();
  await page.getByRole("tab", { name: "team" }).click();
  check(await page.getByText(/employees assigned/).isVisible(), "client profile opens with team, accounts, activity and reports");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Add client" }).click();
  await page.getByRole("button", { name: "Add client" }).last().click();
  check(await page.getByText("Enter a valid email address").isVisible(), "add-client form validates input");
  await page.getByLabel("Business name").fill("Nimbu Foods");
  await page.getByLabel("Industry").fill("Packaged Food");
  await page.getByLabel("City").fill("Indore");
  await page.getByLabel("Primary contact").fill("Ritu Jain");
  await page.getByLabel("Contact email").fill("ritu@nimbufoods.example");
  await page.getByRole("button", { name: "Add client" }).last().click();
  await page.locator("tbody tr", { hasText: "Nimbu Foods" }).getByText("Onboarding").waitFor();
  check(true, "new client is added in onboarding with no fabricated data");
});

// ---- Settings, theme, roles, reset -------------------------------------------------------------------
await step("settings", async () => {
  await page.goto(`${BASE}/settings`);
  for (const t of ["Roles and permissions", "Workspace", "Brand", "Marketplaces", "AI", "Notifications", "Audit log"]) await page.getByRole("tab", { name: t, exact: true }).click();
  check((await page.locator("tbody tr").count()) >= 8, "audit log has recorded the actions taken in this run");
  await page.getByRole("tab", { name: "Brand", exact: true }).click();
  await page.locator("input").first().fill("ACME IQ");
  check(await page.getByRole("complementary").getByText("ACME IQ").isVisible(), "product name is configurable at runtime");
  await page.getByRole("button", { name: "Restore defaults" }).click();
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  check(await page.evaluate(() => !document.documentElement.classList.contains("dark")), "theme switches to light");
  await page.reload();
  await page.getByRole("heading", { name: "Settings" }).waitFor();
  check(await page.evaluate(() => !document.documentElement.classList.contains("dark")), "theme survives a page refresh");
  await shot("05-settings-light");
  await page.goto(`${BASE}/overview`);
  await page.getByRole("heading", { name: "Overview" }).waitFor();
  await shot("06-overview-light");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Reset demo data" }).click();
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await settle();
  const s = await state();
  check(s.projects.length === 0 && s.customCampaigns.length === 0 && s.reports.length === 0 && s.customClients.length === 0, "Reset Demo Data clears local changes");
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL(`${BASE}/login`);
  await page.getByLabel("View the workspace as").selectOption("viewer");
  await page.getByRole("button", { name: "Enter demo workspace" }).click();
  await page.waitForURL(/overview/);
  await page.goto(`${BASE}/meta-ads`);
  check(await page.getByRole("button", { name: "Create campaign" }).isDisabled(), "Client Viewer role cannot create or edit campaigns");
});

// ---- Responsive ------------------------------------------------------------------------------------
await step("responsive", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/overview`);
  await page.getByRole("heading", { name: "Overview" }).waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 1, `no horizontal page overflow at 390px (overflow ${overflow}px)`);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Sales Analytics" }).click();
  await page.waitForURL(/sales/);
  check(true, "mobile navigation drawer works");
  await page.waitForTimeout(600);
  await shot("07-mobile-sales");
  await page.goto(`${BASE}/overview`);
  await page.waitForTimeout(800);
  await shot("08-mobile-overview");
});

// ---- Public website & automations -----------------------------------------------------------------
await step("website", async () => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const bad = await ctx.request.post(`${BASE}/api/v1/leads`, { data: { kind: "enquiry", name: "" } });
  check(bad.status() === 422, "POST /api/v1/leads rejects an invalid enquiry with field errors");
  const robots = await (await ctx.request.get(`${BASE}/robots.txt`)).text();
  const sitemap = await (await ctx.request.get(`${BASE}/sitemap.xml`)).text();
  check(robots.includes("Sitemap:") && sitemap.includes("/privacy"), "robots.txt and sitemap.xml are served");
  await page.goto(`${BASE}/`);
  await page.getByRole("heading", { name: /Build your brand/ }).waitFor();
  check(await page.locator('script[type="application/ld+json"]').count() === 1, "home page shows the website with structured data for search engines");
  check(await page.getByText("reach@entrabuild.com").first().isVisible() && await page.getByText("+91 81245 45524").first().isVisible(), "real contact email and phone are shown");
  // Listing check + auto-fix to 100
  await page.getByRole("button", { name: "Check this listing" }).click();
  check(await page.getByText("How this is scored:").isVisible(), "free listing check returns a scored report with its method");
  await page.getByRole("button", { name: "Fix it to 100%" }).click();
  await page.getByLabel("Material or ingredients").fill("Pure handloom cotton woven on a pit loom");
  await page.getByLabel("Images you'll upload").fill("6");
  await page.getByText("100/100 — ready to paste").waitFor();
  check(true, "auto-fix reaches 100/100 once the seller answers the questions it asks");
  // Fee calculator pop-ups
  await page.goto(`${BASE}/#calc-amazon`);
  await page.getByRole("dialog", { name: "Amazon.in fee calculator" }).waitFor();
  check(await page.getByText("Reaches your bank").isVisible(), "Amazon fee calculator opens as a pop-up with payout and profit");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Calculators" }).hover();
  await page.getByRole("link", { name: "Flipkart fee calculator" }).first().click();
  check(await page.getByRole("dialog", { name: "Flipkart fee calculator" }).isVisible(), "Calculators menu opens the Flipkart calculator");
  await page.keyboard.press("Escape");
  // ENTRAIQ pricing calculator
  await page.getByLabel("Seller accounts, exact number").fill("40");
  check(await page.getByText("₹75,000").first().isVisible(), "ENTRAIQ pricing: 40 sellers = ₹75,000 a month");
  // Enquiry form
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Get my free consultation" }) }).first();
  await form.getByRole("button", { name: "Get my free consultation" }).click();
  check(await form.getByText("Enter your name").isVisible(), "enquiry form validates required fields");
  await form.getByLabel("Your name").fill("Smoke Test");
  await form.getByLabel("Phone / WhatsApp").fill("+91 98765 43210");
  await form.getByLabel("Email").fill("smoke@example.com");
  await form.getByLabel("What do you need?").selectOption("SEO");
  await form.getByText("may contact me by phone").click();
  await form.getByRole("button", { name: "Get my free consultation" }).click();
  await page.getByText(/Reference ENQ-/).waitFor();
  check(true, "enquiry is accepted and returns a reference");
  await page.getByRole("button", { name: "Chat with IQ" }).click();
  const iq = page.getByRole("dialog", { name: "Chat with IQ" });
  await iq.getByLabel("Message IQ").fill("Amazon fee for ₹999");
  await iq.getByRole("button", { name: "Send" }).click();
  await iq.getByText(/reaches your bank/).waitFor();
  check(true, "IQ chat answers a fee question in the chat");
  await iq.getByLabel("Message IQ").fill("ENTRAIQ price for 20 sellers");
  await iq.getByRole("button", { name: "Send" }).click();
  await iq.getByText(/₹45,000\/month/).waitFor();
  check(true, "IQ quotes ENTRAIQ pricing");
  await page.keyboard.press("Escape");
  const overflow = await page.setViewportSize({ width: 390, height: 844 }).then(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
  check(overflow <= 1, `no horizontal overflow on the website at 390px (overflow ${overflow}px)`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/privacy`);
  check(await page.getByRole("heading", { name: "Privacy policy" }).isVisible(), "policy pages load");
  await page.goto(`${BASE}/`);
  await shot("09-website");
  // Self sign-up → workspace
  await page.goto(`${BASE}/signup?sellers=12`);
  await page.getByLabel("Your name").fill("Smoke Owner");
  await page.getByLabel("Agency name").fill("Smoke Growth Agency");
  await page.getByLabel("Work email").fill("owner@example.com");
  await page.getByLabel("Phone").fill("+91 90000 00000");
  await page.getByText("may contact me about my workspace").click();
  await page.getByRole("button", { name: "Create my workspace" }).click();
  await page.waitForURL(/overview/);
  const st = await state();
  check(st.workspace?.agency === "Smoke Growth Agency" && st.settings.workspaceName === "Smoke Growth Agency workspace", "sign-up creates the agency workspace and signs the owner in");
  await page.goto(`${BASE}/leads`);
  await page.getByRole("heading", { name: "Website leads" }).waitFor();
  check((await page.getByText(/^(ENQ|SGN|DEM)-/).count()) >= 2, "Website leads lists the enquiry and the sign-up");
});

check(consoleErrors.length === 0, `no browser console errors across the run${consoleErrors.length ? ":\n        " + [...new Set(consoleErrors)].slice(0, 8).join("\n        ") : ""}`);
console.log(failed ? `\n${failed} check(s) failed` : "\nAll smoke checks passed");
await browser.close();
process.exit(failed ? 1 : 0);
