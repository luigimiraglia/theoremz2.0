import puppeteer from "puppeteer";

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.goto("http://localhost:3000/guida-metodo", { waitUntil: "networkidle0" });
await page.screenshot({ path: "/private/tmp/claude-501/-Users-luigimiraglia-theoremz2-0/6709d4dc-2b48-4702-b0b6-f7ad23f830c7/scratchpad/mobile.png", fullPage: true });

await page.setViewport({ width: 1440, height: 900, isMobile: false });
await page.goto("http://localhost:3000/guida-metodo", { waitUntil: "networkidle0" });
await page.screenshot({ path: "/private/tmp/claude-501/-Users-luigimiraglia-theoremz2-0/6709d4dc-2b48-4702-b0b6-f7ad23f830c7/scratchpad/desktop.png", fullPage: true });

await browser.close();
console.log("console errors:", errors);
console.log("done");
