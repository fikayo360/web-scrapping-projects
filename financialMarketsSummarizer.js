/*
🧠 Project Objective
Build a script that:

Pulls 20–30 full article contents daily from select sections of major news sites (e.g., Markets, Economics) where you have subscriptions.

Parses and summarizes them with GPT-4.

Mimics a real user using a full browser in visible mode (no headless/Puppeteer stealth, proxies, or API scraping).

Returns a summary with title, date, source, and URL.

✅ Assumptions
You already have:

A database set up for storing articles and summaries.

RSS feeds for getting article URLs by section.

A function or system to tag articles.

Access to ChatGPT Plus or API key.

📦 Architecture Overview
csharp
Copy
Edit
[RSS Feed Scraper] 
       ↓
[Extract Article Links (20–30 per site)]
       ↓
[Browser-based Scraper (Visible Chrome)]
       ↓
[Parse Title, Date, Body Content]
       ↓
[Send to GPT-4 for Summary]
       ↓
[Save: Title, Summary, Date, Source, URL]
       ↓
[Store in DB or use for tagging downstream]
*/

const isRelevant = (url) => {
  return /markets|economy|finance/.test(url.toLowerCase()) && 
         !/opinion|sports|lifestyle|arts|editorial/.test(url.toLowerCase());
};

const puppeteer = require("puppeteer");

async function scrapeArticle(url) {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36"
  );

  await page.goto(url, { waitUntil: "networkidle2" });
  await page.waitForTimeout(2000); // Simulate human delay

  const content = await page.evaluate(() => {
    const title = document.querySelector("h1")?.innerText || "";
    const date = document.querySelector("time")?.innerText || "";
    const body = Array.from(document.querySelectorAll("article p, .story-body p"))
      .map((p) => p.innerText)
      .join("\n");

    return { title, date, body };
  });

  await browser.close();
  return { ...content, url };
}


const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function summarizeArticle({ title, date, body, url, source }) {
  const prompt = `
Summarize the following article in structured form. Focus on key details, not just the headline.
Include: Title, Summary, Date, Source, and URL.

---
Title: ${title}
Date: ${date}
Source: ${source}
URL: ${url}

Content:
${body}
`;

  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
  });

  return chatCompletion.choices[0].message.content;
}


const cron = require("node-cron");

cron.schedule("0 7 * * *", () => {
  // Run the full pipeline at 7am daily
});
