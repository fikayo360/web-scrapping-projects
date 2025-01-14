import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import anonymyse from 'puppeteer-extra-plugin-anonymize-ua'

// import natural from 'natural'
// import stopword from 'stopword'
// import sendEmail from './sendEmail.js'
// import cron  from 'node-cron'
// import pkg from 'pg';
// import fs from 'fs'
// import xlsx from 'xlsx'

(
    async function main(){
       const finalPayload = []
        puppeteer.use(StealthPlugin())
        puppeteer.use(anonymyse())
        const browser = await puppeteer.launch({headless:false});

        const page = await browser.newPage()
        await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 0 })
        console.log(`loading url`)
        // await page.waitForNavigation({timeout:0})
        await page.waitForSelector('.x1qjc9v5.x78zum5.x1q0g3np.xl56j7k.xh8yej3',{timeout: 0,waitUntil:'domcontentloaded' });
        await page.goto('https://www.instagram.com/explore/tags/weddingphotography/',{timeout:0});
  
      const postLinks = await page.evaluate(() => {
          const links = [];
          document.querySelectorAll('article a').forEach(anchor => {
              links.push(anchor.href);
          });
          return links;
        });

        postLinks.forEach(postlink => async() => {
          
          await page.goto(postlink, {timeout: 0 });
          console.log('visiting postlink');
          const profileLink = await page.$eval('header a', anchor => anchor.href);

          await page.goto(profileLink, {timeout: 0 });
          console.log('visiting profilelink');
          const email = await page.evaluate(() => {
              const mailtoLink = document.querySelector('a[href^="mailto:"]');
              return mailtoLink ? mailtoLink.href : null;
          });
          const bio = await page.evaluate(() => {
              return document.querySelector('div.-vDIg span')?.innerText || '';
          });

          finalPayload.push({email,bio})
        })

        console.log(finalPayload);

        // await browser.close();
        
    }
)()