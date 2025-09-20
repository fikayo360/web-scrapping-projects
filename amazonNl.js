import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import anonymyse from 'puppeteer-extra-plugin-anonymize-ua'
import xlsx from 'xlsx'
import Papa from 'papaparse'
import fs from 'fs'

let attributes = {
    brandName:'h2.a-size-base-plus span',
    title: 'h2.a-size-base-plus span', // Product title
    link: 'a.a-link-normal[href*="sspa/click"].s-link-style', // Product detail page URL
    image: 'img.s-image', // Product image
    rating: 'i.a-icon-star-small span.a-icon-alt',// Star rating
    price: 'span.a-price', // Price
    availability: 'div.udm-primary-delivery-message', // Delivery availability
    reviews_count: 'a[aria-label*="beoordelingen"] span.a-size-base.s-underline-text', // Number of reviews
    // prime: 'i.a-icon-prime', // Prime badge
    // add_to_cart: 'button[name="submit.addToCart"]' // Add to cart button
}

const browser = await setupBrowser();
const page = await browser.newPage();
let pageNumber = 1
let allData = [];
const excludedBrands = ["PUMA", "Nike", "Adidas", "Apple", "Samsung", "JBL", "Sony"];
const trademarkKeywords = ["Pro", "Air", "Galaxy", "Xiaomi", "Bose", "Logitech"];

async function setupBrowser() {
    puppeteer.use(StealthPlugin())
    puppeteer.use(anonymyse())
    const browser = await puppeteer.launch({
      headless: false,
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

async function LoadWebsite(page,searchTerm,pageNum){
    let url = `https://www.amazon.nl/s?k=${searchTerm}&page=${pageNum}`
    console.log(url);
    console.log('starting to load site');
    if(typeof url !== 'string'){
        return `${url} is not a string`
    }

    await page.goto(url, { waitUntil: 'networkidle2',timeout:0 });
    console.log('done');
}

async function extractDataFromPage(page,selector,attributes){
    let items = []
    if(typeof selector !== 'string'){
        return `${selector} is not a string`
    }

    console.log(`waiting for selector`);
    await page.waitForSelector(selector,{ waitUntil: 'domcontentloaded', timeout: 0 })
    console.log('gotten selector');
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

function saveDataToSheet(data,sheetname,destination){
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetname);
    xlsx.writeFile(workbook, destination);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'products')
    console.log('done saved')
}


const main = async() => {

    try{
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        while(pageNumber <= 3){
            try{
                await LoadWebsite(page,'school bags',pageNumber)
                console.log('done loading website');
            }catch(err){
                console.log(`error occured:${err.message}`);
            }
            
            try{
                let selector = 'div[data-component-type="s-search-result"]'
                let payload = await extractDataFromPage(page,selector,attributes)
                console.log(payload);
                allData.push(...payload)
                console.log('done getting items');
            }catch(err){
                console.log(`err occured : ${err.message}`);
            }
            pageNumber++
        }

        console.log(allData.length);

        const genericProducts = allData.filter(item => {
            const brand = item.brand?.toLowerCase();
            const title = item.title?.toLowerCase();
            return (
              !excludedBrands.some(excluded => brand?.includes(excluded.toLowerCase())) &&
              !trademarkKeywords.some(keyword => title?.includes(keyword.toLowerCase()))
            );
          });

       saveDataToSheet(genericProducts,'school bags','schoolBags.xlsx')
    
    }catch(err){
        console.log(err.message);
    }finally{
        if (browser) {
            await browser.close();
        }
    }
}

main().catch((err) => console.error(err.message))
