console.log(`scrape pdf bot`)

import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import anonymyse from 'puppeteer-extra-plugin-anonymize-ua'
import path from 'path'
import UserPreferencesPlugin from 'puppeteer-extra-plugin-user-preferences'

    async function getBookLIsts(book){
        try{
            puppeteer.use(StealthPlugin())
            puppeteer.use(anonymyse())
            if(typeof book !== 'string'){
                console.log('must be a string')
                return
            }
            const browser = await puppeteer.launch();
            const page = await browser.newPage()
            await page.goto('https://www.pdfdrive.com', { waitUntil: 'domcontentloaded', timeout: 200000 })
            console.log(`loading url`)
            await page.screenshot({ path: 'landing.png' })
            await page.waitForSelector('#search-form input[name="q"]')
            await page.type('#search-form input[name="q"]',book);
            console.log('entered info succesfully')
            await page.waitForSelector('#search-form button[type="submit"]')
            console.log('gotten button succesfully')
            await page.click('#search-form button[type="submit"]')
            console.log('click button succesfully')
            await page.waitForNavigation({waitUntil:'domcontentloaded', timeout: 300000 });
            await page.screenshot({ path: 'search-results.png' });

            const linkTitles = await page.evaluate(()=> {
            const elements = Array.from(document.querySelectorAll('.files-new ul li .row .col-sm'))
            let items = elements.map(items => ({
                bookImg:items.querySelector('.file-left a .img-zoom.file-img').src,
                booktitle:items.querySelector('.file-right .ai-search h2').textContent,
                bookLink:items.querySelector('.file-right .ai-search').href,
                }));
            return items
            })
            await browser.close();   
            return linkTitles
            
        }catch(error){
            throw error
        }
    }

    function getbook(name,arr){
        const finalItem = arr.find((item) => item.booktitle === name)
        return finalItem
   }

    async function navigateToBook(bk){
        puppeteer.use(StealthPlugin())
        puppeteer.use(anonymyse())
        const userPreferenceOptions = {
            userPrefs: {
              plugins: {
                always_open_pdf_externally: true,
              },
              download: {
                open_pdf_in_system_reader: false,
                prompt_for_download: false,
              },
            }
          };
          puppeteer.use(UserPreferencesPlugin(userPreferenceOptions));

        if(typeof bk !== 'object'){
            console.log('must be an object')
            return
        }

        const browser = await puppeteer.launch({headless:false,defaultViewport:null});
        const page = await browser.newPage()
        const ppath = path.resolve('./files')
        
        const client = await page.createCDPSession()
        await client.send('Page.setDownloadBehavior', {
               behavior: 'allow',
               downloadPath:ppath
        });
           
        await page.goto(bk.bookLink, { waitUntil: 'domcontentloaded', timeout: 200000 })
        await page.waitForSelector('#download-button #download-button-link')
        console.log('gotten dwbtn')
        await page.click('#download-button #download-button-link')
        await new Promise(resolve => setTimeout(resolve,25000))
        await page.screenshot({path: 'clickDownload1.png'})
        console.log('click dwbtn')
        await page.waitForSelector('.btn-group a[type="button"]')
        console.log('gotten final click button')
        await page.screenshot({path: 'downloadPage.png'})
        await page.click('.btn-group a[type="button"]');
        await new Promise(resolve => setTimeout(resolve, 200000));
        console.log('final click')
        await page.screenshot({path: 'final-click.png'})
        console.log('download done')
        await browser.close();
    }

    const bookItems =  await getBookLIsts('startup companies')
    console.log(bookItems)
    const singleBook = getbook(`Crack the Funding Code: How Investors Think and What They Need to Hear to Fund Your Startup`,bookItems)
    console.log(singleBook)
    const downloadSingle = await navigateToBook(singleBook)