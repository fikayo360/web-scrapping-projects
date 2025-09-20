import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import anonymyse from 'puppeteer-extra-plugin-anonymize-ua'
import fs from 'fs'
import xlsx from 'xlsx'


puppeteer.use(StealthPlugin())
puppeteer.use(anonymyse())

const browser = await puppeteer.launch({headless:false});
const page = await browser.newPage()
let pageCount = 0
const filePath = './stockData.json';

async function getSTockData(pageCount){   
        await page.goto(`https://finance.yahoo.com/markets/stocks/most-active/?start=${pageCount}&count=100`, { waitUntil: 'domcontentloaded', timeout:0 })
        await page.screenshot({ path: 'yahooFinance.png' })
        await page.waitForSelector('table.markets-table tbody tr');

        const stockData = await page.evaluate(() => {
            const rows = document.querySelectorAll('table.markets-table tbody tr');
            const data = [];
        
            rows.forEach(row => {
              const symbol = row.querySelector('.ticker')?.textContent.trim() || 'N/A';
              const name = row.querySelector('.ticker')?.getAttribute('aria-label') || 'N/A';
              const price = row.querySelectorAll('td')[3]?.textContent.trim() || 'N/A';
              const change = row.querySelectorAll('td')[4]?.textContent.trim() || 'N/A';
              const changePercent = row.querySelectorAll('td')[5]?.textContent.trim() || 'N/A';
              const volume = row.querySelectorAll('td')[6]?.textContent.trim() || 'N/A';
              const avgVolume = row.querySelectorAll('td')[7]?.textContent.trim() || 'N/A';
              const marketCap = row.querySelectorAll('td')[8]?.textContent.trim() || 'N/A';
              const peRatio = row.querySelectorAll('td')[9]?.textContent.trim() || 'N/A';
              const wkChange = row.querySelectorAll('td')[10]?.textContent.trim() || 'N/A';
              const wkRange = row.querySelectorAll('td')[11]?.textContent.trim() || 'N/A';
        
              data.push({ symbol, name, price, change, changePercent, volume, avgVolume, marketCap, peRatio, wkChange, wkRange });
            });
        
            return data;
          });
        
          fs.writeFileSync(filePath, JSON.stringify(stockData, null, 2), 'utf-8');
          console.log(`Data saved to ${filePath}`);
} 

while(pageCount <= 200){
    await getSTockData(pageCount);
    pageCount += 100
}

await browser.close();