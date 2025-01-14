import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import anonymyse from 'puppeteer-extra-plugin-anonymize-ua'
import fs from 'fs'
import xlsx from 'xlsx'

(
    async function main(){
        puppeteer.use(StealthPlugin())
        puppeteer.use(anonymyse())
        const browser = await puppeteer.launch({headless:false});
        
        const page = await browser.newPage()
        await page.goto('https://www.realtor.com/realestateandhomes-search/Los-Angeles_CA/show-newest-listings/sby-6/pg-1', { waitUntil: 'domcontentloaded', timeout: 200000 })
        console.log(`loading url`)
        await page.screenshot({ path: 'listingsLanding.png' })
        await page.waitForSelector('div.BasePropertyCard_propertyCardWrap__30VCU div.BasePropertyCard_propertyCard__N5tuo');
        console.log('gotten listings page')

        await new Promise(resolve => setTimeout(resolve, 60000));
        const properties = await page.evaluate(()=> {
            const listings = []
            const elements = document.querySelectorAll('div.BasePropertyCard_propertyCardWrap__30VCU').forEach((property) => {
                
            listings.push({
                title : property.querySelector('[data-testid="broker-title"] .BrokerTitle_titleText__RvFV6')?.innerText || null,
                imageUrl : property.querySelector('[data-testid="picture-img"]')?.getAttribute('src') || null,
                price : property.querySelector('[data-testid="card-price"] .base__StyledType-rui__sc-108xfm0-0')?.innerText || null,
                beds : property.querySelector('[data-testid="property-meta-beds"] [data-testid="meta-value"]')?.innerText || null,
                baths : property.querySelector('[data-testid="property-meta-baths"] [data-testid="meta-value"]')?.innerText || null,
                sqft : property.querySelector('[data-testid="property-meta-sqft"] .meta-value')?.innerText || null,
                lotSize : property.querySelector('[data-testid="property-meta-lot-size"] .meta-value')?.innerText || null,
                addressLine1 : property.querySelector('[data-testid="card-address-1"]')?.innerText || null,
                addressLine2 : property.querySelector('[data-testid="card-address-2"]')?.innerText || null
                })
            })

            return listings
        })

        console.log(properties);
        const worksheet = xlsx.utils.json_to_sheet(properties);

        // Create a new workbook and append the worksheet
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'RealEstateListings');

        // Write workbook to file
        const filePath = './real_estate_listings.xlsx';
        xlsx.writeFile(workbook, filePath);
        await browser.close();
    } 
)()