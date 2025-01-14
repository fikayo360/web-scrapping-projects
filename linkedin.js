import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker'
import {DEFAULT_INTERCEPT_RESOLUTION_PRIORITY} from 'puppeteer'
import anonymyse from 'puppeteer-extra-plugin-anonymize-ua'

(
    async function main(){
        puppeteer.use(StealthPlugin())
        puppeteer.use(anonymyse())
        const browser = await puppeteer.launch({headless:'shell'});

        const page = await browser.newPage()
        await page.goto('https://www.linkedin.com/home', { waitUntil: 'domcontentloaded', timeout: 200000 })
        console.log(`loading url`)
        await page.screenshot({ path: 'landing.png' })

        await page.waitForSelector('.nav__button-secondary.btn-md.btn-secondary-emphasis',{timeout: 1000000});
        console.log(`gotten signin inputs`)
        await page.click('.nav__button-secondary.btn-md.btn-secondary-emphasis')
        await page.screenshot({ path: 'sigin.png' })

        await page.waitForSelector('input[name="session_key"]');
        await page.waitForSelector('input[name="session_password"]');
        console.log(`gotten inputs`)

        await page.type('input[name="session_key"]','fikayoadele@gmail.com');
        await page.type('input[name="session_password"]', 'fk070560');
        await page.click('button[type="submit"]')
        console.log(`submitting inputs`)

        await page.waitForNavigation({ timeout: 1000000 })
        await page.screenshot({ path: 'home-result.png' })
        // await page.waitForSelector('.ember-view.feed-left-nav-common-module__link',{timeout: 1000000});
        // console.log(`gotten next inputs`)
        // await page.click('.ember-view.feed-left-nav-common-module__link',{ waitUntil: 'domcontentloaded', timeout: 200000 })
        // console.log(`home baby`)
        // await page.screenshot({ path: 'home-page.png' })
      
        // await page.waitForNavigation({ timeout: 1000000 })
        // await page.waitForSelector('.app-aware-link.global-nav__primary-link--active.global-nav__primary-link',{timeout: 1000000});
        // console.log(`gotten jobs selector `)
        // await page.click('.app-aware-link.global-nav__primary-link--active.global-nav__primary-link',{waitUntil: 'domcontentloaded',timeout: 200000 })
        // console.log(`now on jobs page`)
        
        // await page.screenshot({ path: 'job-page.png' })
        await browser.close();
    }
)()
