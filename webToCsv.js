import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import anonymyse from 'puppeteer-extra-plugin-anonymize-ua'
import Papa from 'papaparse'
import fs from 'fs'



async function setupBrowser() {
    puppeteer.use(StealthPlugin())
    puppeteer.use(anonymyse())
    const browser = await puppeteer.launch({
      headless: false, // Set to true in production
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      ignoreHTTPSErrors: true,
    });
  
    return browser;
  }

async function LoadWebsite(page,url){
    if(typeof url !== 'string'){
        return `${url} is not a string`
    }

    await page.goto(url, { waitUntil: 'networkidle2',timeout:0 });
}

async function extractDataFromPage(page,selector,attributes){
    let items = []
    if(typeof selector !== 'string'){
        return `${selector} is not a string`
    }

    await page.waitForSelector(selector,{ waitUntil: 'domcontentloaded', timeout: 0 })
    items = await page.$$eval(selector, (elements, attributes) => {
        return elements.map(element => {
            const data = {}
            for (let [key, attrSelector] of Object.entries(attributes)) {
                const target = element.querySelector(attrSelector)
                if (!target) {
                    data[key] = ''
                } else if (target.tagName === 'IMG') {
                    data[key] = target.src
                } else if (target.tagName === 'A' && key.toLowerCase().includes('link')) {
                    data[key] = target.href
                } else {
                    data[key] = target.textContent.trim()
                }
            }
            return data
        })
    }, attributes)

    return items
    
}

function toCsv(data, filename) {
    if (!Array.isArray(data) || data.length === 0) {
        console.error('No data to export.')
        return
    }

    const csv = Papa.unparse(data)
    fs.writeFileSync(filename, csv)
    console.log(`✅ Data exported to ${filename}`)
}


const main = async() => {

    let attributes = {
        title: 'h3 a', // Book title
        link: 'h3 a',  // Book detail page URL
        image: '.image_container img', // Book image
        rating: '.star-rating', // Star rating class
        price: '.price_color', // Price
        availability: '.instock.availability' // Availability text
    }

    const browser = await setupBrowser();
    const page = await browser.newPage();
    let allData = [];
    let payload

    try{
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });
        try{
            await LoadWebsite(page,'https://books.toscrape.com/catalogue/category/books/fantasy_19/index.html')
        }catch(err){
            console.log(`error occured:${err.message}`);
        }
        
        try{
            payload = await extractDataFromPage(page,'li.col-xs-6.col-sm-4.col-md-3.col-lg-3',attributes)
        }catch(err){
            console.log(`err occured : ${err.message}`);
        }

        toCsv(payload,'payload.csv')
    
    }catch(err){
        console.log(err.message);
    }finally{
        if (browser) {
            await browser.close();
        }
    }
}

main().catch((err) => console.error(err.message))
