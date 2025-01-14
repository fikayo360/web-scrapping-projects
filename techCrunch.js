console.log(`scrape tech crunch`)
 
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import anonymyse from 'puppeteer-extra-plugin-anonymize-ua'

async function getNews(){
    try{
        puppeteer.use(StealthPlugin())
        puppeteer.use(anonymyse())
        const browser = await puppeteer.launch();
        const page = await browser.newPage()
        await page.goto('https://techcrunch.com/', { waitUntil: 'domcontentloaded', timeout: 200000 })
        console.log(`loading url`)
        await page.screenshot({ path: 'landing.png' })
        await page.waitForSelector('.wp-block-tc23-post-picker .wp-block-columns.is-layout-flex.wp-container-core-columns-is-layout-3.wp-block-columns-is-layout-flex')
        console.log(`gotten news articles selector`);
     
        const newsArticles = await page.evaluate(()=> {
        const elements = Array.from(document.querySelectorAll('.wp-block-tc23-post-picker .wp-block-columns'))
        let items = elements.map(items => ({
            category:items.querySelector('a').innerText,
            newsTitle:items.querySelector('h2').innerText,
            author:items.querySelector('.wp-block-tc23-author-card-name a').innerText,
            newsLink:items.querySelector('h2 a').getAttribute('href'),
            timeAgo:items.querySelector('.wp-block-tc23-post-time-ago').innerText,
            newsTrim:document.querySelector('.wp-block-post-excerpt p').innerText,
            newsImg:items.querySelector('.wp-block-post-featured-image a img').src
            }));
        return items
        })
        await browser.close();   
        return newsArticles
        
    }catch(error){
        throw error
    }
}

const techCrunchNews = await getNews()
console.log(techCrunchNews);