import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import anonymyse from 'puppeteer-extra-plugin-anonymize-ua'
import sendEmail from './sendEmail.js'
import cron  from 'node-cron'
import pkg from 'pg';
import fs from 'fs'
import xlsx from 'xlsx'

    const {Pool} = pkg;

    const db = new Pool(
        {
        user: 'postgres',
        host: 'localhost',
        database: 'price_product',
        password: 'securepassword',
        port: 5432, 
        }
    )

    async function connectToDB() {
        try {
          const client = await db.connect();
          console.log('Connected to PostgreSQL database');
          console.log(res);
          client.release();
        } catch (err) {
          console.error('Error connecting to PostgreSQL:', err);
        }
      }
      
    async function saveProductToDB(product) {
        const query = `
          INSERT INTO product (title, price, product_url, image_url, brand, product_id, category)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id;
        `;
        const values = [
          product.title,
          product.price,
          product.productUrl,
          product.imageUrl,
          product.brand,
          product.productId,
          product.category,
        ];
      
        try {
          const res = await db.query(query, values);
          console.log(`Product saved with ID: ${res.rows[0].id}`);
        } catch (err) {
          console.error('Error saving product:', err);
        }
      }

      async function executeQuery(query, params) {
        try {
          const res = await client.query(query, params);
          client.release();
          return res.rows;
        } catch (err) {
          console.error('Database query error:', err);
          throw err;
        }
      }

      async function getLowestPrice() {
        const query = `
          SELECT MIN(price) AS lowest_price 
          FROM products;
        `;
        return executeQuery(query);
      }

      async function getHighestPrice() {
        const query = `
          SELECT MAX(price) AS highest_price 
          FROM products;
        `;
        return executeQuery(query);
      }

      async function getPriceTrend() {
        const query = `
          SELECT price, created_at 
          FROM products 
          ORDER BY created_at ASC;
        `;
        return executeQuery(query);
      }

      async function getAveragePrice() {
        const query = `
          SELECT AVG(price) AS average_price 
          FROM products 
        `;
        return executeQuery(query);
      }

      async function getPriceVolatility() {
        const query = `
          SELECT STDDEV(price) AS price_volatility 
          FROM products 
        `;
        return executeQuery(query);
      }

      async function getTimeBelowThreshold(threshold) {
        const query = `
          SELECT COUNT(*) AS below_threshold_count 
          FROM products 
          WHERE price < $1;
        `;
        return executeQuery(query, [threshold]);
      }

      async function getDurationBetweenPriceChanges() {
        const query = `
          SELECT 
            price, 
            created_at, 
            LAG(created_at) OVER (ORDER BY created_at) AS previous_time, 
            EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at))) AS time_difference 
          FROM products 
        `;
        return executeQuery(query);
      }

      async function getDailyPriceTrends() {
        const query = `
          SELECT DATE(created_at) AS day, AVG(price) AS avg_price 
          FROM products  
          GROUP BY DATE(created_at) 
          ORDER BY day;
        `;
        return executeQuery(query);
      }

      async function getMonthlyPriceTrends() {
        const query = `
          SELECT DATE_TRUNC('month', created_at) AS month, AVG(price) AS avg_price 
          FROM products 
          GROUP BY DATE_TRUNC('month', created_at) 
          ORDER BY month;
        `;
        return executeQuery(query);
      }

      async function getAlertFrequency(threshold) {
        const query = `
          SELECT COUNT(*) AS alert_count 
          FROM products 
          WHERE price < $1;
        `;
        return executeQuery(query,[threshold]);
      }
      
      async function getProductsWithMostPriceDrops() {
        const query = `
          SELECT COUNT(DISTINCT price) AS price_changes 
          FROM products 
          ORDER BY price_changes DESC;
        `;
        return executeQuery(query);
      }

      async function getProductsWithLowestAveragePrice() {
        const query = `
          SELECT product_id, AVG(price) AS avg_price 
          FROM products 
          ORDER BY avg_price ASC;
        `;
        return executeQuery(query);
      }

      async function getTimeToThreshold(threshold) {
        const query = `
          SELECT MIN(created_at) AS time_to_threshold 
          FROM products 
          WHERE price < $1;
        `;
        return executeQuery(query, [threshold]);
      }

      async function getPricePercentageChange() {
        const query = `
          SELECT 
            product_id, 
            ((MAX(price) - MIN(price)) / MIN(price)) * 100 AS percentage_change 
          FROM products 
        `;
        return executeQuery(query);
      }


    async function monitor(){
        try{
        await connectToDB()
        puppeteer.use(StealthPlugin())
        puppeteer.use(anonymyse())
        const browser = await puppeteer.launch({headless:false});

        const page = await browser.newPage()
        const threshold = 5000
        await page.goto('https://www.jumia.com.ng/health-beauty/', { waitUntil: 'domcontentloaded', timeout: 200000 })

        await page.screenshot({ path: 'beautyPages.png' })
        await page.waitForSelector('div.itm.col > article.prd._box._hvr');
        console.log('gotten listings page')

        const productData = await page.evaluate(() => {
        const productElement = document.querySelector('div.itm.col > article.prd._box._hvr');
        
        const title = productElement.querySelector('.name')?.innerText || null;
        const priceString = productElement.querySelector('.prc')?.innerText || null;
        const productUrl = productElement.querySelector('a.core')?.href || null;
        const imageUrl = productElement.querySelector('img.img')?.getAttribute('data-src') || null;
        const brand = productElement.querySelector('[data-gtm-brand]')?.getAttribute('data-gtm-brand') || null;
        const productId = productElement.querySelector('[data-gtm-id]')?.getAttribute('data-gtm-id') || null;
        const category = productElement.querySelector('[data-gtm-category]')?.getAttribute('data-gtm-category') || null;
    
        return {
            title,
            price:parseFloat(priceString.replace(/[^\d.-]/g, '').replace(',', '')),
            productUrl,
            imageUrl,
            brand,
            productId,
            category
        };
        });

        console.log(productData);

        if (productData.price < threshold) {
            sendEmail('fikayoadele@gmail.com',`Price is below the threshold! Current price: ₦${productData.price}`)
        } 
        
        // save to local db
        saveProductToDB(productData)

        // optionally run historical data operations on data set
        const [
              lowestPrice, highestPrice, priceTrend, averagePrice, 
              priceVolatility,timeBelowThreshold, durationBetweenPriceChanges,
              dailyPriceTrends, monthlyPriceTrends, alertFrequency
            ] = 
        await Promise.all([
            getLowestPrice(productId),
            getHighestPrice(productId),
            getPriceTrend(productId),
            getAveragePrice(productId),
            getPriceVolatility(productId),
            getTimeBelowThreshold(productId, threshold),
            getDurationBetweenPriceChanges(productId),
            getDailyPriceTrends(productId),
            getMonthlyPriceTrends(productId),
            getAlertFrequency(productId, threshold),
        ]);

        if (lowestPrice && lowestPrice[0].price < threshold) {
            sendEmail('user@example.com', `Alert: Lowest price for product ${productId} is below the threshold!`);
        }
      
        if (highestPrice && highestPrice[0].price > 10000) {
        sendEmail('user@example.com', `Alert: High price volatility detected for product ${productId}!`);
        }

        //visualize price trend maybe
    
        console.log('Monitoring complete and alerts sent based on analysis');

        await browser.close();

        } catch (error) {
            console.error('Error in task:', error);
          }
    } 

monitor()
// cron.schedule('*/5 * * * *', monitor)