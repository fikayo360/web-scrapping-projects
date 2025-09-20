import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import anonymyse from 'puppeteer-extra-plugin-anonymize-ua'
import fs from 'fs'
import xlsx from 'xlsx'

(async () => {

puppeteer.use(StealthPlugin())
puppeteer.use(anonymyse())
const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

const realtors = async () => {
    let pageCount = 1
    let agents = []

    while (pageCount <= 4) {
           // Zillow Agent Finder URL (Change location in URL for different cities)
        const baseURL = `https://www.zillow.com/professionals/real-estate-agent-reviews/chicago-il/?page=${pageCount}`;
        console.log(`loading url ${baseURL}`);
        await page.goto(baseURL, { waitUntil: "load", timeout: 0 });
        // Wait for agent cards to load
        await page.waitForSelector("div.Grid-c11n-8-101-3__sc-18zzowe-0.iZzmpw a.StyledCard-c11n-8-101-3__sc-1w6p0lv-0.cfmRww", { timeout: 0 });

        // Scrape agent data
        const agentData = await page.evaluate(() => {
            let agentsArray = [];
            const agentCards = document.querySelectorAll("div.Grid-c11n-8-101-3__sc-18zzowe-0.iZzmpw a.StyledCard-c11n-8-101-3__sc-1w6p0lv-0.cfmRww");

            agentCards.forEach((agent) => {
                let name = agent.querySelector("h2")?.innerText.trim() || "N/A";
                let profileUrl = agent.href || "N/A";
                let brokerage = agent.querySelector("span.KgRLu")?.innerText.trim() || "N/A";
                let reviews = agent.querySelector(".StyledNumberRating-c11n-8-101-3__sc-ilk12m-0")?.innerText.trim() || "0";
                let priceRange = agent.querySelector(".StyledParagraph-c11n-8-101-3__sc-e666if-0 span")?.innerText.trim() || "N/A";
                let salesLast12Months = agent.querySelectorAll(".StyledParagraph-c11n-8-101-3__sc-e666if-0 span")[1]?.innerText.trim() || "N/A";
                let image = agent.querySelector("img")?.src || "N/A";

                agentsArray.push({
                    name,
                    profileUrl,
                    brokerage,
                    reviews,
                    priceRange,
                    salesLast12Months,
                    image,
                });
            });
            console.log('gotten data from url');
            return agentsArray;
        });

        agents = agents.concat(agentData);
        pageCount++
    }
    return agents;

};

const realtorProfiles = async(realtors) => {
    let fullAgentData = [];

    for (let agent of realtors) {
        if (agent.profileUrl !== "N/A") {
            console.log(`Visiting profile: ${agent.profileUrl}`);
            await page.goto(agent.profileUrl, { waitUntil: 'networkidle2',timeout:0 });

            await page.waitForSelector('a[href^="mailto:"]', { timeout: 0 });
            // Extract email & phone
            const contactInfo = await page.evaluate(() => {
                const phone = document.querySelector('a[href^="tel:"]').textContent
                const email = document.querySelector('a[href^="mailto:"]').textContent
                console.log({email,phone});
                return { email, phone };
            });

            fullAgentData.push({
                ...agent,
                email: contactInfo.email,
                phone: contactInfo.phone,
            });
        }
    }
    
    return fullAgentData
}

const brokers = await realtors()
await new Promise(resolve => setTimeout(resolve, 5000))
const fullProfile  = await realtorProfiles(brokers)
console.log(fullProfile);
const worksheet = xlsx.utils.json_to_sheet(fullProfile);

const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, worksheet, 'brokers');

const filePath = './brokers.xlsx';
xlsx.writeFile(workbook, filePath);


await browser.close();

})()
