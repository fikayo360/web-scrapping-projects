const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');
const UserAgent = require('user-agents');
const { setTimeout: sleep } = require('timers/promises');

// Apply stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

// Configuration
const config = {
  searchTerm: 'ui/ux designer',  // Change this to your desired search term
  maxProfiles: 50,               // Number of profiles to scrape
  maxConcurrent: 1,              // Number of concurrent browser instances
  outputFile: 'profiles.csv',    // Output file name
  
  // BrightData proxy credentials - replace with your credentials
  brightData: {
    username: 'YOUR_USERNAME',
    password: 'YOUR_PASSWORD',
    host: 'brd.superproxy.io',
    port: 22225
  },
  
  // LinkedIn credentials - replace with your credentials
  linkedin: {
    username: 'YOUR_LINKEDIN_EMAIL',
    password: 'YOUR_LINKEDIN_PASSWORD'
  }
};

// User agent rotation
const getUserAgent = () => {
  return new UserAgent({ deviceCategory: 'desktop' }).toString();
};

// Random delays to mimic human behavior
const randomDelay = async (min = 1000, max = 5000) => {
  const delay = Math.floor(Math.random() * (max - min + 1) + min);
  await sleep(delay);
};

// Human-like mouse movements
const humanizedMouseMovement = async (page) => {
  const viewportWidth = page.viewport().width;
  const viewportHeight = page.viewport().height;
  
  // Random number of mouse movements
  const numMovements = Math.floor(Math.random() * 10) + 5;
  
  for (let i = 0; i < numMovements; i++) {
    const x = Math.floor(Math.random() * viewportWidth);
    const y = Math.floor(Math.random() * viewportHeight);
    
    await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
    await randomDelay(300, 800);
  }
};

// Random scrolling behavior
const randomScrolling = async (page) => {
  // Random number of scrolls
  const numScrolls = Math.floor(Math.random() * 5) + 2;
  
  for (let i = 0; i < numScrolls; i++) {
    // Random scroll distance
    const scrollY = Math.floor(Math.random() * 500) + 100;
    
    await page.evaluate((scrollY) => {
      window.scrollBy(0, scrollY);
    }, scrollY);
    
    await randomDelay(500, 2000);
  }
};

// BrightData proxy configuration
const getProxyUrl = () => {
  const { username, password, host, port } = config.brightData;
  
  // Generate a random session ID for proxy rotation
  const sessionId = Math.random().toString(36).substring(2, 15);
  
  return `http://${username}-session-${sessionId}:${password}@${host}:${port}`;
};

// Initialize CSV writer
const initCsvWriter = () => {
  return createObjectCsvWriter({
    path: config.outputFile,
    header: [
      { id: 'name', title: 'Name' },
      { id: 'title', title: 'Title' },
      { id: 'company', title: 'Company' },
      { id: 'location', title: 'Location' },
      { id: 'email', title: 'Email' },
      { id: 'phone', title: 'Phone' },
      { id: 'website', title: 'Website' },
      { id: 'linkedin', title: 'LinkedIn URL' },
      { id: 'searchTerm', title: 'Search Term' }
    ]
  });
};

// Launch browser with proxy
const launchBrowser = async () => {
  const proxyUrl = getProxyUrl();
  const userAgent = getUserAgent();
  
  console.log(`Launching browser with new proxy and UA: ${userAgent.substring(0, 25)}...`);
  
  return puppeteer.launch({
    headless: false, // Set to true for production
    args: [
      `--proxy-server=${proxyUrl}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080'
    ],
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  });
};

// Login to LinkedIn
const loginToLinkedIn = async (page) => {
  console.log('Logging in to LinkedIn...');
  
  await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });
  await randomDelay();
  
  // Type email with random delays between keystrokes
  await page.type('#username', config.linkedin.username, { delay: Math.floor(Math.random() * 100) + 50 });
  await randomDelay(500, 1500);
  
  // Type password with random delays between keystrokes
  await page.type('#password', config.linkedin.password, { delay: Math.floor(Math.random() * 100) + 50 });
  await randomDelay(500, 1500);
  
  // Click the login button
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('.login__form_action_container button')
  ]);
  
  // Check if login was successful
  const url = page.url();
  if (url.includes('checkpoint') || url.includes('login')) {
    throw new Error('LinkedIn login failed or security check required');
  }
  
  console.log('Successfully logged in to LinkedIn');
  await randomDelay(3000, 5000);
};

// Search for profiles
const searchProfiles = async (page, searchTerm) => {
  console.log(`Searching for: ${searchTerm}`);
  
  // Navigate to LinkedIn search page
  await page.goto('https://www.linkedin.com/', { waitUntil: 'networkidle2' });
  await randomDelay();
  
  // Click on search box
  await page.click('.search-global-typeahead__input');
  await randomDelay(500, 1000);
  
  // Type search term with random delays between keystrokes
  await page.type('.search-global-typeahead__input', searchTerm, { delay: Math.floor(Math.random() * 100) + 30 });
  await randomDelay(500, 1000);
  
  // Press Enter and wait for results
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.keyboard.press('Enter')
  ]);
  
  // Click on "People" filter if needed
  try {
    const peopleFilterSelector = 'button[aria-label="People"]';
    if (await page.$(peopleFilterSelector) !== null) {
      await page.click(peopleFilterSelector);
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
    }
  } catch (e) {
    console.log('People filter not found or already selected');
  }
  
  await randomDelay();
  console.log('Search completed');
};

// Extract profile URLs from search results
const extractProfileUrls = async (page, maxProfiles) => {
  console.log('Extracting profile URLs from search results...');
  
  const profileUrls = new Set();
  
  while (profileUrls.size < maxProfiles) {
    // Human-like scrolling
    await randomScrolling(page);
    
    // Extract profile URLs from current page
    const newUrls = await page.evaluate(() => {
      const urlList = [];
      const profileCards = document.querySelectorAll('.reusable-search__result-container');
      
      profileCards.forEach(card => {
        const anchorElement = card.querySelector('.app-aware-link');
        if (anchorElement && anchorElement.href) {
          // Filter out non-profile URLs
          if (anchorElement.href.includes('/in/')) {
            urlList.push(anchorElement.href);
          }
        }
      });
      
      return urlList;
    });
    
    // Add new URLs to set
    newUrls.forEach(url => profileUrls.add(url));
    console.log(`Found ${profileUrls.size}/${maxProfiles} profile URLs`);
    
    // Check if we have enough profiles
    if (profileUrls.size >= maxProfiles) break;
    
    // Click "Next" button if available
    const nextButtonSelector = 'button[aria-label="Next"]';
    const hasNextButton = await page.evaluate((selector) => {
      const nextButton = document.querySelector(selector);
      return nextButton && !nextButton.disabled;
    }, nextButtonSelector);
    
    if (hasNextButton) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click(nextButtonSelector)
      ]);
      await randomDelay(2000, 4000);
    } else {
      console.log('No more pages of search results');
      break;
    }
  }
  
  // Convert set to array and limit to maxProfiles
  return [...profileUrls].slice(0, maxProfiles);
};

// Extract contact information from a profile
const extractProfileData = async (page, profileUrl, searchTerm) => {
  console.log(`Visiting profile: ${profileUrl}`);
  
  // Navigate to profile
  await page.goto(profileUrl, { waitUntil: 'networkidle2' });
  await randomDelay();
  
  // Simulate human-like behavior
  await humanizedMouseMovement(page);
  await randomScrolling(page);
  
  // Extract basic profile information
  const profileData = await page.evaluate(() => {
    // Basic info
    const nameElement = document.querySelector('h1.text-heading-xlarge');
    const titleElement = document.querySelector('div.text-body-medium');
    const locationElement = document.querySelector('.text-body-small.inline.t-black--light.break-words');
    const companyElement = document.querySelector('.inline-show-more-text');
    
    // Initialize data object
    const data = {
      name: nameElement ? nameElement.innerText.trim() : '',
      title: titleElement ? titleElement.innerText.trim() : '',
      company: companyElement ? companyElement.innerText.trim() : '',
      location: locationElement ? locationElement.innerText.trim() : '',
      email: '',
      phone: '',
      website: ''
    };
    
    // Try to find contact info in the page
    const contactInfoSection = document.querySelector('section.pv-contact-info');
    if (contactInfoSection) {
      // Email
      const emailElement = contactInfoSection.querySelector('.ci-email .pv-contact-info__contact-link');
      if (emailElement) data.email = emailElement.innerText.trim();
      
      // Phone
      const phoneElement = contactInfoSection.querySelector('.ci-phone .pv-contact-info__contact-link');
      if (phoneElement) data.phone = phoneElement.innerText.trim();
      
      // Website
      const websiteElement = contactInfoSection.querySelector('.ci-websites .pv-contact-info__contact-link');
      if (websiteElement) data.website = websiteElement.innerText.trim();
    }
    
    return data;
  });
  
  // Add LinkedIn URL and search term to profile data
  profileData.linkedin = profileUrl;
  profileData.searchTerm = searchTerm;
  
  // Try to access contact info page if available
  try {
    // Look for "Contact info" button
    const contactInfoButtonSelector = 'button[aria-label="Contact info"]';
    const hasContactInfoButton = await page.$(contactInfoButtonSelector) !== null;
    
    if (hasContactInfoButton) {
      // Click on "Contact info" button
      await page.click(contactInfoButtonSelector);
      await page.waitForSelector('.artdeco-modal__content', { timeout: 5000 });
      await randomDelay(1000, 2000);
      
      // Extract contact information from modal
      const contactInfo = await page.evaluate(() => {
        const data = { email: '', phone: '', website: '' };
        
        // Email
        const emailSection = document.querySelector('.ci-email');
        if (emailSection) {
          const emailElement = emailSection.querySelector('.pv-contact-info__contact-link');
          if (emailElement) data.email = emailElement.innerText.trim();
        }
        
        // Phone
        const phoneSection = document.querySelector('.ci-phone');
        if (phoneSection) {
          const phoneElement = phoneSection.querySelector('.pv-contact-info__contact-link');
          if (phoneElement) data.phone = phoneElement.innerText.trim();
        }
        
        // Website
        const websiteSection = document.querySelector('.ci-websites');
        if (websiteSection) {
          const websiteElement = websiteSection.querySelector('.pv-contact-info__contact-link');
          if (websiteElement) data.website = websiteElement.href || websiteElement.innerText.trim();
        }
        
        return data;
      });
      
      // Update profile data with contact info
      if (contactInfo.email) profileData.email = contactInfo.email;
      if (contactInfo.phone) profileData.phone = contactInfo.phone;
      if (contactInfo.website) profileData.website = contactInfo.website;
      
      // Close modal
      await page.click('button[aria-label="Dismiss"]');
      await randomDelay(1000, 2000);
    }
  } catch (error) {
    console.log(`Error accessing contact info: ${error.message}`);
  }
  
  console.log(`Profile data extracted for: ${profileData.name}`);
  return profileData;
};

// Main scraping function
const scrapeProfiles = async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  
  // Set user agent
  await page.setUserAgent(getUserAgent());
  
  // Initialize CSV writer
  const csvWriter = initCsvWriter();
  
  try {
    // Login to LinkedIn
    await loginToLinkedIn(page);
    
    // Search for profiles
    await searchProfiles(page, config.searchTerm);
    
    // Extract profile URLs
    const profileUrls = await extractProfileUrls(page, config.maxProfiles);
    console.log(`Found ${profileUrls.length} profile URLs to scrape`);
    
    // Scrape each profile
    const profiles = [];
    
    for (let i = 0; i < profileUrls.length; i++) {
      try {
        // Rotate proxy and user agent periodically
        if (i > 0 && i % 5 === 0) {
          console.log('Rotating proxy and user agent...');
          await page.setUserAgent(getUserAgent());
        }
        
        // Extract profile data
        const profileData = await extractProfileData(page, profileUrls[i], config.searchTerm);
        profiles.push(profileData);
        
        // Random delay between profile visits
        if (i < profileUrls.length - 1) {
          await randomDelay(3000, 10000);
        }
      } catch (error) {
        console.error(`Error scraping profile ${profileUrls[i]}: ${error.message}`);
      }
    }
    
    // Write profiles to CSV
    await csvWriter.writeRecords(profiles);
    console.log(`Successfully scraped ${profiles.length} profiles and saved to ${config.outputFile}`);
    
  } catch (error) {
    console.error(`Scraping failed: ${error.message}`);
  } finally {
    // Close browser
    await browser.close();
  }
};

// Run the script
(async () => {
  try {
    console.log(`Starting LinkedIn profile scraper for search term: "${config.searchTerm}"`);
    console.log(`Target: ${config.maxProfiles} profiles`);
    
    await scrapeProfiles();
    
  } catch (error) {
    console.error(`Script error: ${error.message}`);
  }
})();