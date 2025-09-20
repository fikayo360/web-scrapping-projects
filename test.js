import fs from 'fs'

function cleanNumber(value) {
    if (value === 'N/A') return null; // Handle 'N/A' values
    return parseFloat(value.replace(/[^\d.-]/g, '')); // Remove non-numeric characters
  }

// 1. Filter by Price
function filterByPrice(data, minPrice, maxPrice) {
    return data.filter(stock => cleanNumber(stock.price) >= minPrice && cleanNumber(stock.price) <= maxPrice);
  }
  
  // 2. Filter by Percentage Change (Change %)
  function filterByChangePercent(data, minChangePercent, maxChangePercent) {
    return data.filter(stock => 
      parseFloat(cleanNumber(stock.changePercent).replace('%', '')) >= minChangePercent &&
      parseFloat(cleanNumber(stock.changePercent).replace('%', '')) <= maxChangePercent
    );
  }
  
  // 3. Filter by Market Capitalization
  function filterByMarketCap(data, minCap, maxCap) {
    return data.filter(stock => {
      const marketCap = parseFloat(stock.marketCap.replace(/B$/, '')) * 1e9;
      return marketCap >= minCap && marketCap <= maxCap;
    });
  }
  
  // 4. Filter by P/E Ratio
  function filterByPERatio(data, minPERatio, maxPERatio) {
    return data.filter(stock => stock.peRatio >= minPERatio && stock.peRatio <= maxPERatio);
  }
  
  // 5. Filter by Dividend Yield
  function filterByDividendYield(data, minYield, maxYield) {
    return data.filter(stock => stock.dividendYield >= minYield && stock.dividendYield <= maxYield);
  }
  
  // 6. Filter by Volume
  function filterByVolume(data, minVolume, maxVolume) {
    return data.filter(stock => 
      parseInt(stock.volume.replace(/,/g, '')) >= minVolume &&
      parseInt(stock.volume.replace(/,/g, '')) <= maxVolume
    );
  }
  
  // 7. Filter by 52-Week Range
  function filterBy52WeekRange(data, priceNearHigh = true, percentage = 10) {
    return data.filter(stock => {
      const [low, high] = stock.range52Week.split('-').map(price => parseFloat(price.trim()));
      const currentPrice = stock.price;
  
      if (priceNearHigh) {
        return currentPrice >= high * (1 - percentage / 100);
      } else {
        return currentPrice <= low * (1 + percentage / 100);
      }
    });
  }
  
  // 8. Filter by Average Volume (3M)
  function filterByAvgVolume(data, minAvgVolume, maxAvgVolume) {
    return data.filter(stock => 
      parseInt(stock.avgVolume.replace(/,/g, '')) >= minAvgVolume &&
      parseInt(stock.avgVolume.replace(/,/g, '')) <= maxAvgVolume
    );
  }
  
  // 9. Filter by Sector or Industry
  function filterBySector(data, sector) {
    return data.filter(stock => stock.sector === sector);
  }
  
  // 10. Filter by 52-Week Change %
  function filterBy52WeekChange(data, minChange, maxChange) {
    return data.filter(stock => 
      parseFloat(stock.wkChange.replace('%', '')) >= minChange &&
      parseFloat(stock.wkChange.replace('%', '')) <= maxChange
    );
  }
  
(
    function displayStockData(){
        const stockData = JSON.parse(fs.readFileSync('stockData.json', 'utf-8'));
        console.log(filterByPrice(stockData,50,200));
    }
   
)()