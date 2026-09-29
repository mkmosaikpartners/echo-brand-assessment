import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [name, url, w] of [["start", "http://localhost:8788/", 1440], ["result", "http://localhost:8788/r/demoabcdef", 1440], ["result-mobile", "http://localhost:8788/r/demoabcdef", 390]]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto(url); await p.waitForTimeout(1500);
  await p.screenshot({ path: `dev/${name}.png`, fullPage: true });
}
await b.close();
