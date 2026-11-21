import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { chromium } from "playwright";

const port = await new Promise((resolve, reject) => {
  const socket = createServer();
  socket.once("error", reject);
  socket.listen(0, "127.0.0.1", () => {
    const address = socket.address();
    socket.close(() => resolve(address.port));
  });
});

const base = `http://127.0.0.1:${port}`;
const dev = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: "ignore" });
let browser;

try {
  let ready = false;
  for (let attempt = 0; attempt < 90; attempt++) {
    if (dev.exitCode !== null) throw new Error(`next dev exited ${dev.exitCode}`);
    try {
      const response = await fetch(base);
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error("next dev did not become ready");

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(base);
  await page.getByRole("button", { name: "Menu" }).click();
  assert.equal(await page.getByRole("dialog").count(), 1);
  await page.evaluate(() => document.querySelector('aside a[href="/calendario"]').click());
  await page.waitForURL(`${base}/calendario`);
  assert.equal(await page.getByRole("dialog").count(), 0);
  await page.goBack();
  await page.waitForURL(`${base}/`);
  assert.equal(await page.getByRole("dialog").count(), 0);
  console.log("Mobile navigation stays closed after a route change and browser back");
} finally {
  await browser?.close();
  dev.kill("SIGTERM");
}
