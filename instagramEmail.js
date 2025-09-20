import puppeteer from 'puppeteer-extra'
import fs from 'fs'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import anonymyse from 'puppeteer-extra-plugin-anonymize-ua'
import { timeout } from 'puppeteer';


/**
 * Instagram Business Contact Scraper
 * This script allows you to scrape business contact information from Instagram
 * including business name, bio, email, phone number, and website URL.
 * It includes proxy rotation functionality to avoid getting blocked.
 */

// Configuration
const config = {
  username: 'the_software_merchant',
  password: 'adelefikayo02#$',
  searchTerms: ['roofing companies in america', 'construction companies in america'],
  resultsLimit: 30,
  outputFile: 'instagram_business_contacts.json',
  // csvOutputFile: 'instagram_business_contacts.csv',

  // ScraperAPI configuration
  proxyRotation: {
    enabled: true,
    scraperApiKey: '9fcdd4eb55d422e6a4a868b81d47792b',
    baseUrl: 'http://api.scraperapi.com',
    rotationInterval: 10
  },

  delays: {
    typing: { min: 100, max: 300 },
    navigation: { min: 2000, max: 4000 },
    scrolling: { min: 1000, max: 3000 },
  }
};

// Helper for random delays
const randomDelay = async (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
};

// // Get a random proxy from the list
// let proxyCounter = 0;
// const getNextProxy = () => {
//   if (!config.proxyRotation.enabled || config.proxyRotation.proxies.length === 0) {
//     return null;
//   }
  
//   const proxy = config.proxyRotation.proxies[proxyCounter % config.proxyRotation.proxies.length];
//   proxyCounter++;
//   console.log(`Rotating to new proxy: ${proxy.replace(/:[^:]*@/, ':****@')}`);
//   return proxy;
// };

function getScraperApiUrl(targetUrl) {
  return `http://api.scraperapi.com?api_key=${config.proxyRotation.scraperApiKey}&url=${encodeURIComponent(targetUrl)}`;
}

// Setup a new browser with a proxy
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

// Login to Instagram
async function loginToInstagram(page) {
  console.log('Navigating to Instagram login page...');
  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });
  
  // Wait for cookie dialog and accept
  try {
    const cookieButton = await page.waitForSelector('button[tabindex="0"]', { timeout: 5000 });
    if (cookieButton) {
      await cookieButton.click();
      await randomDelay(1000, 2000);
    }
  } catch (error) {
    console.log('No cookie dialog found, continuing...');
  }
  
  console.log('Entering login credentials...');
  
  // Enter username
  await page.type('input[name="username"]', config.username, { delay: 150 });
  await randomDelay(config.delays.typing.min, config.delays.typing.max);
  
  // Enter password
  await page.type('input[name="password"]', config.password, { delay: 200 });
  await randomDelay(config.delays.typing.min, config.delays.typing.max);
  
  // Click login button
  const loginButton = await page.waitForSelector('button[type="submit"]');
  await loginButton.click();
  
  // Wait for navigation to complete
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  
  // Check if login was successful
  const url = page.url();
  if (url.includes('instagram.com/accounts/login/')) {
    throw new Error('Login failed. Please check your credentials.');
  }
  
  console.log('Successfully logged in to Instagram');
  
  // Handle "Save Your Login Info" dialog if it appears
  try {
    const notNowButton = await page.waitForSelector('button:not([type="submit"])', { timeout: 5000 });
    if (notNowButton) {
      await notNowButton.click();
      await randomDelay(1000, 2000);
    }
  } catch (error) {
    console.log('No "Save Login Info" dialog found, continuing...');
  }
  
  // Handle notifications dialog if it appears
  try {
    const notNowNotifications = await page.waitForXPath('//button[contains(text(), "Not Now")]', { timeout: 5000 });
    if (notNowNotifications) {
      await notNowNotifications.click();
      await randomDelay(1000, 2000);
    }
  } catch (error) {
    console.log('No notifications dialog found, continuing...');
  }
}

// Search for business accounts
async function searchBusinessAccounts(page, searchTerm) {
  console.log(`Searching for: ${searchTerm}`);
  
  // Go to search page
  await page.goto('https://www.instagram.com/explore/search/', { waitUntil: 'networkidle2',timeout:0});
  
  await randomDelay(500, 1000);
  const searchButton = await page.$('svg[aria-label="Search"]');
  const clickableParent = await searchButton.evaluateHandle(el => el.closest('a, button, div'));
  await clickableParent.click();

  // Click on search input
  await page.waitForSelector('input[placeholder="Search"]',{timeout:0});
  await page.click('input[placeholder="Search"]');
  await randomDelay(500, 1000);
  
  // Enter search term
  await page.type('input[placeholder="Search"]', searchTerm, { delay: 150 });
  await randomDelay(1000, 2000);
  
  // Wait for search results
  await page.waitForSelector('div[role="none"] a', { timeout: 10000 });
  
  // Click on "Accounts" tab if available
  try {
    const accountsTab = await page.waitForXPath('//span[contains(text(), "Accounts")]', { timeout: 3000 });
    if (accountsTab) {
      await accountsTab.click();
      await randomDelay(1000, 2000);
    }
  } catch (error) {
    console.log('No Accounts tab found, continuing with default results...');
  }
  
  // Get list of accounts
  const accounts = await page.evaluate(() => {
    const accountNodes = document.querySelectorAll('div[role="none"] a');
    return Array.from(accountNodes)
      .filter(node => node.href.includes('/'))
      .map(node => {
        // Get username from href
        const username = node.href.split('/').filter(Boolean).pop();
        
        // Try to find if it's a business account
        const divs = node.querySelectorAll('div');
        let bio = '';
        if (divs.length > 2) {
          bio = divs[2].textContent || '';
        }
        
        return { username, bio, href: node.href };
      });
  });
  
  console.log(`Found ${accounts.length} accounts for "${searchTerm}"`);
  return accounts.slice(0, config.resultsLimit);
}

// Extract business information from a profile
async function extractBusinessInfo(page, username) {
  console.log(`Extracting info for: ${username}`);
  
  // Navigate to profile page
  await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });
  await randomDelay(config.delays.navigation.min, config.delays.navigation.max);
  
  // Extract profile information
  const profileInfo = await page.evaluate(() => {
    // Business name (display name)
    const nameElement = document.querySelector('h2');
    const name = nameElement ? nameElement.textContent.trim() : '';
    
    // Bio
    const bioElement = document.querySelector('h1 + div');
    const bio = bioElement ? bioElement.textContent.trim() : '';
    
    // Check if it's a business account
    const categoryElement = document.querySelector('div > div > div > span');
    const category = categoryElement ? categoryElement.textContent.trim() : '';
    
    // Website (if available)
    const websiteElement = document.querySelector('a[href^="http"]:not([href*="instagram.com"])');
    const website = websiteElement ? websiteElement.href : '';
    
    // Contact info button
    const contactButton = Array.from(document.querySelectorAll('div[role="button"]')).find(
      el => el.textContent.includes('Contact') || el.textContent.includes('Email')
    );
    
    return { name, bio, category, website, hasContactButton: !!contactButton };
  });
  
  // If there's a contact button, click it to get email and phone
  let contactInfo = { email: '', phoneNumber: '' };
  
  if (profileInfo.hasContactButton) {
    try {
      // Find and click the contact button
      const contactButton = await page.waitForXPath(
        '//div[@role="button"][contains(text(), "Contact") or contains(text(), "Email")]',
        { timeout: 5000 }
      );
      
      if (contactButton) {
        await contactButton.click();
        await randomDelay(1000, 2000);
        
        // Extract contact info from the modal
        contactInfo = await page.evaluate(() => {
          const modalContent = document.querySelector('div[role="dialog"]');
          if (!modalContent) return { email: '', phoneNumber: '' };
          
          const textContent = modalContent.textContent;
          
          // Extract email
          const emailMatch = textContent.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
          const email = emailMatch ? emailMatch[0] : '';
          
          // Extract phone number
          const phoneMatch = textContent.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/);
          const phoneNumber = phoneMatch ? phoneMatch[0] : '';
          
          return { email, phoneNumber };
        });
        
        // Close the dialog by clicking outside
        await page.keyboard.press('Escape');
        await randomDelay(500, 1000);
      }
    } catch (error) {
      console.log(`Error getting contact info for ${username}: ${error.message}`);
    }
  }
  
  // Check if the account is relevant to business consulting
  const isRelevant = profileInfo.category.toLowerCase().includes('consult') || 
                     profileInfo.bio.toLowerCase().includes('consult') ||
                     profileInfo.bio.toLowerCase().includes('business') ||
                     profileInfo.bio.toLowerCase().includes('strategy') ||
                     profileInfo.name.toLowerCase().includes('consult');
  
  return {
    username,
    businessName: profileInfo.name,
    category: profileInfo.category,
    bio: profileInfo.bio,
    website: profileInfo.website,
    email: contactInfo.email,
    phoneNumber: contactInfo.phoneNumber,
    isBusinessAccount: !!profileInfo.category,
    isRelevant
  };
}

// Main scraping function
async function scrapeInstagramBusinesses() {
  const allBusinesses = [];
  let browser = null;
  let page = null;
  
  try {
    // Setup browser with initial proxy
    browser = await setupBrowser();
    page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set viewport to a typical desktop size
    await page.setViewport({ width: 1366, height: 768 });
    
    // Login to Instagram
    await loginToInstagram(page);

    
    for (const searchTerm of config.searchTerms) {
      // // Check if we need to rotate proxy
      // if (config.proxyRotation.enabled) {
      //   console.log(`Request counter reached ${requestCounter}, rotating proxy...`);
      //   await browser.close();
      //   browser = await setupBrowser();
      //   page = await browser.newPage();
      //   await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      //   await page.setViewport({ width: 1366, height: 768 });
      //   await loginToInstagram(page);
      //   requestCounter = 0;
      // }
      await randomDelay(1000, 2000);
      // Search for business accounts
      const accounts = await searchBusinessAccounts(page, searchTerm);
   
      // Process each account
      for (const account of accounts) {
        try {
          // Extract business info
          const businessInfo = await extractBusinessInfo(page, account.username);
          
          // Only save relevant business accounts
          if (businessInfo.isBusinessAccount && businessInfo.isRelevant) {
            allBusinesses.push(businessInfo);
            console.log(`Added: ${businessInfo.businessName} (@${businessInfo.username})`);
          }
          
          
          // // Check if we need to rotate proxy
          // if (config.proxyRotation.enabled && requestCounter >= config.proxyRotation.rotationInterval) {
          //   console.log(`Request counter reached ${requestCounter}, rotating proxy...`);
          //   await browser.close();
          //   browser = await setupBrowser();
          //   page = await browser.newPage();
          //   await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
          //   await page.setViewport({ width: 1366, height: 768 });
          //   await loginToInstagram(page);
          //   requestCounter = 0;
          // }
          
        } catch (error) {
          console.error(`Error processing account @${account.username}: ${error.message}`);
        }
        
        // Random delay between profiles to avoid detection
        await randomDelay(config.delays.navigation.min, config.delays.navigation.max);
      }
    }
    
    // Save results to JSON file
    fs.writeFileSync(config.outputFile, JSON.stringify(allBusinesses, null, 2));
    console.log(`Saved ${allBusinesses.length} business contacts to ${config.outputFile}`);
    
    // // Create CSV file
    // const csvHeader = 'Username,Business Name,Category,Email,Phone,Website,Bio\n';
    // const csvRows = allBusinesses.map(business => 
    //   `"${business.username}","${business.businessName.replace(/"/g, '""')}","${business.category.replace(/"/g, '""')}","${business.email}","${business.phoneNumber}","${business.website}","${business.bio.replace(/"/g, '""')}"`
    // );
    
    // fs.writeFileSync(config.csvOutputFile, csvHeader + csvRows.join('\n'));
    // console.log(`Saved results as CSV to ${config.csvOutputFile}`);
    
  } catch (error) {
    console.error(`Scraping failed: ${error.message}`);
  } finally {
    // Close the browser
    if (browser) {
      await browser.close();
    }
  }
}

// Run the scraper
scrapeInstagramBusinesses().catch(console.error);