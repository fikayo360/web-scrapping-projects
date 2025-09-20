import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import anonymyse from 'puppeteer-extra-plugin-anonymize-ua'
import fs from 'fs'
import xlsx from 'xlsx'


const scrapeGooglemaps = async (businessType,location) => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
  
    const searchUrl = `https://www.google.com/maps/search/${businessType}+in+${location}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2',timeout:0 });
  
    await page.waitForSelector('.Nv2PK',{timeout:0});

    let businesses = new Set();
    let prevSize = 0; 
    let maxScrolls = 50;
    let scrollCount = 0;

    while(businesses.size <= 200 && scrollCount <= maxScrolls){
        console.log(`Scrolling attempt ${scrollCount}...`);

        await page.evaluate(() => {
        let container = document.querySelectorAll('.m6QErb')[1];
        container.scrollTo(0, container.scrollHeight);
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000))
    
        let newBusinesses = await page.evaluate(() => {
            return [...document.querySelectorAll('.Nv2PK')].map(el => {
            let websiteElement = el.querySelector('a.lcr4fd.S9kvJb'); 
            let websiteLink = websiteElement ? websiteElement.href : 'No Website';
    
            return {
                name: el.querySelector('.qBF1Pd')?.innerText || 'No Name',
                rating: el.querySelector('.MW4etd')?.innerText || 'No Rating',
                address: el.querySelector('.rllt__details')?.innerText || 'No Address',
                website: websiteLink
            };
            });
        });

        newBusinesses.forEach(biz => businesses.add(JSON.stringify(biz)));

        if (businesses.size === 100 && scrollCount === 50) {
            console.log(`gotten 500 items`);
            break;
        }

        scrollCount++;
    }
  
    // Convert Set to Array
    const results = Array.from(businesses).map(biz => JSON.parse(biz));
     const worksheet = xlsx.utils.json_to_sheet(results);
    
    // Create a new workbook and append the worksheet
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'plumbers');

    // Write workbook to file
    const filePath = './floridaPlumbers.xlsx';
    xlsx.writeFile(workbook, filePath);
    console.log(`Scraped ${results.length} businesses.`);
    console.log(results);
  
    await browser.close();
  }

  scrapeGooglemaps('plumbers','florida')