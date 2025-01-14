import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import anonymyse from 'puppeteer-extra-plugin-anonymize-ua'
import natural from 'natural'
import stopword from 'stopword'
import sendEmail from './sendEmail.js'
import cron  from 'node-cron'
import pkg from 'pg';
import fs from 'fs'
import xlsx from 'xlsx'


const wordDict = { 
    "aren't": "are not", 
    "can't": "cannot", 
    "couldn't": "could not", 
    "didn't": "did not", 
    "doesn't": "does not", 
    "don't": "do not", 
    "hadn't": "had not", 
    "hasn't": "has not", 
    "haven't": "have not", 
    "he'd": "he would", 
    "he'll": "he will", 
    "he's": "he is", 
    "i'd": "I would", 
    "i'd": "I had", 
    "i'll": "I will", 
    "i'm": "I am", 
    "isn't": "is not", 
    "it's": "it is", 
    "it'll": "it will", 
    "i've": "I have", 
    "let's": "let us", 
    "mightn't": "might not", 
    "mustn't": "must not", 
    "shan't": "shall not", 
    "she'd": "she would", 
    "she'll": "she will", 
    "she's": "she is", 
    "shouldn't": "should not", 
    "that's": "that is", 
    "there's": "there is", 
    "they'd": "they would", 
    "they'll": "they will", 
    "they're": "they are", 
    "they've": "they have", 
    "we'd": "we would", 
    "we're": "we are", 
    "weren't": "were not", 
    "we've": "we have", 
    "what'll": "what will", 
    "what're": "what are", 
    "what's": "what is", 
    "what've": "what have", 
    "where's": "where is", 
    "who'd": "who would", 
    "who'll": "who will", 
    "who're": "who are", 
    "who's": "who is", 
    "who've": "who have", 
    "won't": "will not", 
    "wouldn't": "would not", 
    "you'd": "you would", 
    "you'll": "you will", 
    "you're": "you are", 
    "you've": "you have", 
    "'re": " are", 
    "wasn't": "was not", 
    "we'll": " will", 
    "didn't": "did not"
} 
  
const convertToStandard = text => { 
    const data = text.split(' '); 
    data.forEach((word, index) => { 
        Object.keys(wordDict).forEach(key => { 
            if (key === word.toLowerCase()) { 
                data[index] = wordDict[key] 
            }; 
        }); 
    }); 
    return data.join(' '); 
} 
  
const convertTolowerCase = text => { 
    return text.toLowerCase(); 
} 
  
const removeNonAlpha = text => { 
    return text.replace(/[^a-zA-Z\s]+/g, ''); 
} 

const analyseSentiment = (score) => {
    if (score === 0 ){
        return 'neutral'
    }
    else if (score < 0){
        return 'negative'
    }
    else{
        return 'positive'
    }
}

function analyzeReviewSentiments(reviews) {
    
    const results = reviews.map(review => {
        const lexData = convertToStandard(review.reviewText); 
        const lowerCaseData = convertTolowerCase(lexData); 
        const onlyAlpha = removeNonAlpha(lowerCaseData);  
        const tokenConstructor = new natural.WordTokenizer(); 
        const tokenizedData = tokenConstructor.tokenize(onlyAlpha);  
        const filteredData = stopword.removeStopwords(tokenizedData); 
        const Sentianalyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn'); 
        const analysis_score = Sentianalyzer.getSentiment(filteredData); 
        console.log("Sentiment Score: ",analysis_score); 
        return {
            ...review,
            sentimentScore: analysis_score,
            sentimentCategory: analysis_score > 0 ? 'Positive' : analysis_score < 0 ? 'Negative' : 'Neutral',
        };
    });

    // Count categories
    const sentimentSummary = results.reduce(
        (acc, review) => {
            acc[review.sentimentCategory]++;
            return acc;
        },
        { Positive: 0, Negative: 0, Neutral: 0 }
    );

    return { results, sentimentSummary };
}

let pageCount = 1
let finalReviews

    async function extractReviews(pageCount){
        puppeteer.use(StealthPlugin())
        puppeteer.use(anonymyse())
        const browser = await puppeteer.launch({headless:false});
        const page = await browser.newPage()
        console.log(`extracting reviews from page ${pageCount}`);
        if(pageCount<= 10){
            console.log(`extracting from last page`);
        }
      
        await page.goto(`https://www.jumia.com.ng/catalog/productratingsreviews/sku/DI119ST56VV2ENAFAMZ/?page=${pageCount}`,{ waitUntil: 'domcontentloaded', timeout: 200000 })
        console.log('gotten reviews page')
        await page.waitForSelector('article.-pvs.-hr._bet');

        // Extract reviews
        const reviews = await page.evaluate(() => {
            
            const reviewElements = document.querySelectorAll('article.-pvs.-hr._bet');
            const reviewsData = [];

            reviewElements.forEach(reviewElement => {
                const starsText = reviewElement.querySelector('.stars._m._al.-mvs')?.innerText || null;
                const starWidth = reviewElement.querySelector('.stars._m._al.-mvs .in')?.style.width || null;
                const stars = starWidth ? (parseFloat(starWidth) / 20) : null;
                const reviewTitle = reviewElement.querySelector('h3.-m.-fs16.-pvs')?.innerText || null;
                const reviewText = reviewElement.querySelector('p.-pvs')?.innerText || null;
                const reviewDate = reviewElement.querySelector('div.-df.-j-bet span.-prs')?.innerText || null;
                const reviewerName = reviewElement.querySelector('div.-df.-j-bet span:nth-child(2)')?.innerText || null;
                const isVerifiedPurchase = !!reviewElement.querySelector('svg.ic');
                   reviewsData.push({
                       stars,
                       starsText,
                       reviewTitle,
                       reviewText,
                       reviewDate,
                       reviewerName,
                       isVerifiedPurchase
                   });
               });
   
               return reviewsData;
           });

        const {results, sentimentSummary} = analyzeReviewSentiments(reviews)
        // Write workbook to file
        const filePath = './reviews.xlsx';
        xlsx.writeFile(workbook, filePath);
        finalReviews = [...finalReviews,...results]
        console.log(results, sentimentSummary);

        const worksheet = xlsx.utils.json_to_sheet(finalReviews);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'reviews');
        console.log(finalReviews);
        await browser.close();
}

while (pageCount <= 10){
    extractReviews(pageCount)
    pageCount++
}
