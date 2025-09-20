// Instagram Profile Scraper
// This script extracts contact info from Instagram profiles based on a search term
// Uses best practices: Bright Data proxies, user agent rotation, and random behavior

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

// Apply stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Configuration
const config = {
  searchTerm: process.argv[2] || 'ui/ux designers', // Default search or from command line arg
  maxProfiles: parseInt(process.argv[3]) || 20,     // Number of profiles to scrape
  outputFile: 'instagram_contacts.csv',
  brightDataProxy: {
    host: 'brd.superproxy.io',
    port: 22225,
    username: 'YOUR_BRIGHTDATA_USERNAME', // Replace with your credentials
    password: 'YOUR_BRIGHTDATA_PASSWORD'  // Replace with your credentials
  },
  // Array of User Agents to rotate
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36 Edg/92.0.902.78'
  ],
  // Instagram login credentials
  instagram: {
    username: 'YOUR_INSTAGRAM_USERNAME', // Replace with your credentials
    password: 'YOUR_INSTAGRAM_PASSWORD'   // Replace with your credentials
  }
};

// Helper functions
const randomSleep = async (min = 2000, max = 5000) => {
  const sleepTime = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, sleepTime));
};

const getRandomUserAgent = () => {
  return config.userAgents[Math.floor(Math.random() * config.userAgents.length)];
};

const randomMouseMovement = async (page) => {
  const viewportWidth = page.viewport().width;
  const viewportHeight = page.viewport().height;
  
  // Generate 3-7 random movements
  const movements = Math.floor(Math.random() * 5) + 3;
  
  for (let i = 0; i < movements; i++) {
    const x = Math.floor(Math.random() * viewportWidth);
    const y = Math.floor(Math.random() * viewportHeight);
    
    await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
    await randomSleep(300, 800);
  }
};

const randomScroll = async (page) => {
  // Random scroll down
  const scrolls = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < scrolls; i++) {
    const scrollDistance = Math.floor(Math.random() * 500) + 100;
    await page.evaluate((distance) => {
      window.scrollBy(0, distance);
    }, scrollDistance);
    await randomSleep(500, 1500);
  }
};

// Main scraper function
async function scrapeInstagram() {
  console.log(`Starting Instagram scraper for search term: "${config.searchTerm}"`);
  console.log(`Target: ${config.maxProfiles} profiles`);
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true in production
    args: [
      `--proxy-server=http://${config.brightDataProxy.host}:${config.brightDataProxy.port}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set current user agent
    await page.setUserAgent(getRandomUserAgent());
    
    // Set proxy authentication
    await page.authenticate({
      username: config.brightDataProxy.username,
      password: config.brightDataProxy.password
    });
    
    // Add random viewport size (common desktop resolutions)
    const viewports = [
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 1920, height: 1080 }
    ];
    const randomViewport = viewports[Math.floor(Math.random() * viewports.length)];
    await page.setViewport(randomViewport);
    
    // Navigate to Instagram
    await page.goto('https://www.instagram.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await randomSleep();
    await randomMouseMovement(page);
    
    // Handle cookie policy popup if it appears
    try {
      const cookieButton = await page.$('button[text*="Accept" i], button[text*="Accept All" i]');
      if (cookieButton) {
        await cookieButton.click();
        await randomSleep();
      }
    } catch (error) {
      console.log('No cookie popup or failed to handle it');
    }
    
    // Login to Instagram
    console.log('Logging in to Instagram...');
    await page.waitForSelector('input[name="username"]');
    
    // Type slowly like a human
    await typeWithRandomPauses(page, 'input[name="username"]', config.instagram.username);
    await randomSleep(500, 1500);
    await typeWithRandomPauses(page, 'input[name="password"]', config.instagram.password);
    
    await randomSleep();
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await randomSleep(3000, 6000);
    
    // Handle "Save Login Info" prompt if it appears
    try {
      const saveLoginButton = await page.$('button:has-text("Not Now")');
      if (saveLoginButton) {
        await saveLoginButton.click();
        await randomSleep();
      }
    } catch (error) {
      console.log('No save login prompt or failed to handle it');
    }
    
    // Handle notifications prompt if it appears
    try {
      const notificationButton = await page.$('button:has-text("Not Now")');
      if (notificationButton) {
        await notificationButton.click();
        await randomSleep();
      }
    } catch (error) {
      console.log('No notification prompt or failed to handle it');
    }
    
    console.log('Successfully logged in');
    await randomSleep();
    
    // Navigate to search
    await page.goto('https://www.instagram.com/explore/search/', {
      waitUntil: 'networkidle2'
    });
    await randomSleep();
    
    // Type search term
    const searchBox = await page.$('input[placeholder="Search"]');
    if (!searchBox) {
      console.log('Search box not found, trying alternative selector...');
      await page.click('div[role="button"]');
      await randomSleep();
    }
    
    await page.type('input[placeholder="Search"]', config.searchTerm, { delay: 100 });
    await randomSleep(2000, 3000);
    
    // Click on people tab
    const peopleTab = await page.$('span:has-text("People")');
    if (peopleTab) {
      await peopleTab.click();
      await randomSleep();
    }
    
    console.log('Collecting profile links...');
    
    // Collect profile links
    const profileLinks = [];
    while (profileLinks.length < config.maxProfiles) {
      // Extract visible profile links
      const newLinks = await page.evaluate(() => {
        const links = [];
        document.querySelectorAll('a[href^="/"]').forEach(el => {
          const href = el.getAttribute('href');
          if (href.match(/^\/[^/]+\/?$/) && !href.includes('explore') && !href.includes('direct')) {
            links.push(`https://www.instagram.com${href}`);
          }
        });
        return [...new Set(links)]; // Remove duplicates
      });
      
      // Add new links to our collection
      for (const link of newLinks) {
        if (!profileLinks.includes(link)) {
          profileLinks.push(link);
          if (profileLinks.length >= config.maxProfiles) break;
        }
      }
      
      console.log(`Found ${profileLinks.length}/${config.maxProfiles} profiles`);
      
      if (profileLinks.length < config.maxProfiles) {
        // Scroll down to load more results
        await randomScroll(page);
        await randomSleep(1000, 3000);
      } else {
        break;
      }
    }
    
    console.log(`Collected ${profileLinks.length} profile links. Starting to extract contact info...`);
    
    // Array to store profile data
    const profileData = [];
    
    // Visit each profile and extract contact info
    for (let i = 0; i < profileLinks.length; i++) {
      const profileUrl = profileLinks[i];
      console.log(`Processing profile ${i+1}/${profileLinks.length}: ${profileUrl}`);
      
      // Rotate user agent for each profile
      if (i % 3 === 0) {
        await page.setUserAgent(getRandomUserAgent());
      }
      
      try {
        await page.goto(profileUrl, { waitUntil: 'networkidle2' });
        await randomSleep(2000, 4000);
        await randomMouseMovement(page);
        
        // Extract profile information
        const profileInfo = await page.evaluate(() => {
          const data = {
            username: window.location.pathname.replace(/\//g, ''),
            name: '',
            bio: '',
            email: '',
            phone: '',
            website: '',
            category: '',
            followerCount: '',
            followingCount: '',
            postCount: ''
          };
          
          // Get name
          const nameElement = document.querySelector('h2');
          if (nameElement) data.name = nameElement.textContent.trim();
          
          // Get bio
          const bioElement = document.querySelector('h1 + div');
          if (bioElement) data.bio = bioElement.textContent.trim();
          
          // Extract contact info from bio
          const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
          const phoneRegex = /(\+\d{1,3}[\s\-()]*\d{1,4}[\s\-()]*\d{1,4}[\s\-()]*\d{1,4})|(\d{3}[\s\-()]*\d{3}[\s\-()]*\d{4})/g;
          
          // Extract email from bio
          const emailMatches = data.bio.match(emailRegex);
          if (emailMatches) data.email = emailMatches[0];
          
          // Extract phone from bio
          const phoneMatches = data.bio.match(phoneRegex);
          if (phoneMatches) data.phone = phoneMatches[0];
          
          // Get website
          const linkElement = document.querySelector('a[rel="me nofollow noopener noreferrer"]');
          if (linkElement) data.website = linkElement.getAttribute('href');
          
          // Get category/business info
          const categoryElement = document.querySelector('div[class*="category"]');
          if (categoryElement) data.category = categoryElement.textContent.trim();
          
          // Get follower/following counts
          const statsElements = document.querySelectorAll('ul li span');
          if (statsElements.length >= 3) {
            data.postCount = statsElements[0].textContent.trim();
            data.followerCount = statsElements[1].textContent.trim();
            data.followingCount = statsElements[2].textContent.trim();
          }
          
          return data;
        });
        
        // Check for contact button and extract if present
        const contactButton = await page.$('a:has-text("Contact")');
        if (contactButton) {
          await contactButton.click();
          await randomSleep();
          
          // Extract contact info from modal
          const contactInfo = await page.evaluate(() => {
            const info = { email: '', phone: '' };
            
            // Get email
            const emailElement = document.querySelector('div:has-text("Email") + div');
            if (emailElement) info.email = emailElement.textContent.trim();
            
            // Get phone
            const phoneElement = document.querySelector('div:has-text("Phone") + div');
            if (phoneElement) info.phone = phoneElement.textContent.trim();
            
            return info;
          });
          
          // Update profile info if new contact details were found
          if (contactInfo.email && !profileInfo.email) profileInfo.email = contactInfo.email;
          if (contactInfo.phone && !profileInfo.phone) profileInfo.phone = contactInfo.phone;
          
          // Close the modal
          await page.click('svg[aria-label="Close"]');
          await randomSleep();
        }
        
        // Add profile to our dataset
        profileInfo.profileUrl = profileUrl;
        profileData.push(profileInfo);
        
        // Implement random delays between profile visits to avoid detection
        await randomSleep(5000, 10000);
        
      } catch (error) {
        console.error(`Error processing profile ${profileUrl}:`, error);
        // Continue with next profile
        continue;
      }
    }
    
    // Save data to CSV
    if (profileData.length > 0) {
      const fields = [
        'username', 'name', 'profileUrl', 'bio', 'email', 'phone', 'website', 
        'category', 'followerCount', 'followingCount', 'postCount'
      ];
      
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(profileData);
      
      fs.writeFileSync(config.outputFile, csv);
      console.log(`Successfully saved ${profileData.length} profiles to ${config.outputFile}`);
    } else {
      console.log('No profile data collected');
    }
    
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

// Helper function to type text with random pauses between keystrokes
async function typeWithRandomPauses(page, selector, text) {
  for (let i = 0; i < text.length; i++) {
    await page.type(selector, text[i], { delay: Math.floor(Math.random() * 100) + 50 });
    
    // Occasionally add a longer pause
    if (Math.random() < 0.2) {
      await randomSleep(100, 300);
    }
  }
}

// Run the scraper
scrapeInstagram().catch(console.error);