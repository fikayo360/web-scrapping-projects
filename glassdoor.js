console.log(`scrape glassdoor`)

import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import anonymyse from 'puppeteer-extra-plugin-anonymize-ua'
import xlsx from 'xlsx'
import {sendEmailWithAttachment} from './sendEmail.js'
(
    async function main(){
        puppeteer.use(StealthPlugin())
        puppeteer.use(anonymyse())
        const browser = await puppeteer.launch({headless:false});

        const page = await browser.newPage()
        await page.goto('https://www.glassdoor.com/profile/login_input.htm', { waitUntil: 'domcontentloaded', timeout: 0 })
        console.log(`loading url`)

        await page.waitForSelector('li.YYTrP5dLmothWdNovvge[data-test="site-header-jobs"] a',{ waitUntil: 'domcontentloaded', timeout: 0 })
          const link = await page.$eval(
            'li.YYTrP5dLmothWdNovvge[data-test="site-header-jobs"] a',
            el => el.href
        );
    
        await page.goto(link);
        await page.waitForNavigation({waitUntil:'domcontentloaded', timeout: 0})
        await page.waitForSelector('.JobCard_jobCardContainer__arQlW',{timeout:0});

        let previousHeight = 0;

        while (true) {
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
          await new Promise(resolve => setTimeout(resolve, 30000));
          const currentHeight = await page.evaluate(() => document.body.scrollHeight);
          if (currentHeight === previousHeight) {
              console.log('No more content to load');
              break;
          }
          previousHeight = currentHeight
        }

        const jobDetails = await page.evaluate(() => {
          let items = []
           document.querySelectorAll('.JobCard_jobCardContainer__arQlW')
           .forEach((item) => {
              items.push({
                  employerName :item.querySelector('.EmployerProfile_compactEmployerName__9MGcV')?.textContent.trim() || '',
                  employerLogo :item.querySelector('.avatar-base_Image__2RcF9')?.src || '',
                  rating : item.querySelector('.rating-single-star_RatingText__XENmU')?.textContent.trim() || '',
                  jobTitle :item.querySelector('.JobCard_jobTitle__GLyJ1')?.textContent.trim() || '',
                  jobLocation :item.querySelector('.JobCard_location__Ds1fM')?.textContent.trim() || '',
                  salaryEstimate :item.querySelector('.JobCard_salaryEstimate__QpbTW')?.textContent.trim() || '',
                  jobAge : item.querySelector('.JobCard_listingAge__jJsuc')?.textContent.trim() || '',
                  jobLink : item.querySelector('.JobCard_jobTitle__GLyJ1')?.href || ''
              })
          })
          return items
        });
      
        console.log(jobDetails)
        const worksheet = xlsx.utils.json_to_sheet(jobDetails);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'job details');
        const filePath = './jobs.xlsx'
        xlsx.writeFile(workbook, filePath);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'jobs')
        sendEmailWithAttachment('jobs.xlsx',filePath)
        await browser.close();
    }
)()

