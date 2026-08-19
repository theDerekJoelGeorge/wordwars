import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8765";

const captures = [
  { name: "01 — Setup", demo: "setup", id: "f45b4b96-a068-4905-bc0c-9b923238fc6b" },
  { name: "02 — Rules", demo: "rules", id: "c0af9890-8b09-4e9f-92f0-fab4aefccb49" },
  { name: "03 — Restart", demo: "restart", id: "a7be1a26-08d6-460d-be74-353f9782aa7e" },
  { name: "04 — Handoff (first turn)", demo: "handoff-first", id: "478b7fc6-1bd6-4c97-944c-c59280787371" },
  { name: "05 — Handoff (mid game)", demo: "handoff-mid", id: "179a08e9-f569-4277-a9de-93a235200283" },
  { name: "06 — Shop overlay", demo: "handoff-shop", id: "2d028e79-4b36-4027-9fd4-3cbc8dec3850" },
  { name: "07 — Handoff (sudden death)", demo: "handoff-sudden", id: "49ed1340-3655-4e3c-bc3c-021cd63149ee" },
  { name: "08 — Spinning freeze", demo: "spinning", id: "e61955ad-361f-423c-bbf5-45e633be1f8d", delay: 2500 },
  { name: "09 — Playing (empty)", demo: "playing-empty", id: "8897305a-7690-4c4d-ba91-898362636de5" },
  { name: "10 — Playing (typing)", demo: "playing-typing", id: "f4fb31e3-d26c-456b-b63b-de540f9364ee" },
  { name: "11 — Playing (frozen)", demo: "playing-frozen", id: "73c341f2-dc96-4a86-9e5a-bb61fa2c5296" },
  { name: "12 — Error (incomplete)", demo: "playing-error-incomplete", id: "c01dfdc4-1818-4eda-bf6b-6d9e0c115a68" },
  { name: "13 — Error (not a word)", demo: "playing-error-not-a-word", id: "f287847e-db07-4e38-b24c-d483b9e333bf" },
  { name: "14 — Error (reused)", demo: "playing-error-reused", id: "d8f478a0-5556-4151-914d-9dd564c7affe" },
  { name: "15 — Error (wrong letter)", demo: "playing-error-wrong-letter", id: "b528c399-f268-4ca6-aa8c-3c2551a0089b" },
  { name: "16 — Playing (urgent timer)", demo: "playing-urgent", id: "7a5f313b-2cb6-4fb0-bac6-280b6946e06d" },
  { name: "17 — Revealing (success)", demo: "revealing-success", id: "6acfc94e-36af-496a-b285-0320c629d143" },
  { name: "18 — Revealing (timeout)", demo: "revealing-timeout", id: "41b24b94-ec0c-4e50-9970-84fe04879802" },
  { name: "19 — Results (winner)", demo: "results-winner", id: "7229b903-7fa7-48ae-932c-9d40fff239b0" },
  { name: "20 — Results (draw)", demo: "results-draw", id: "11c99f35-6bee-4b89-89bc-1a1a3fcff82c" },
];

function captureUrl(demo, id, delay) {
  const endpoint = encodeURIComponent(
    `https://mcp.figma.com/mcp/capture/${id}/submit?bindVariables=true`
  );
  return `${BASE}/?demo=${demo}#figmacapture=${id}&figmaendpoint=${endpoint}&figmadelay=${delay}&figmaselector=${encodeURIComponent("body")}`;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

for (const item of captures) {
  const delay = item.delay || 1500;
  console.log("Capturing:", item.name);
  await page.goto(captureUrl(item.demo, item.id, delay), {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page.waitForTimeout(delay + 3500);
  console.log("Submitted:", item.name);
}

await browser.close();
console.log("All captures submitted.");
