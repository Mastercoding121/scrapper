const { chromium } = require('playwright');
const fs = require('fs');

async function runScraper() {
  console.log("🚀 Starting Headless Browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 }
  });

  const page = await context.newPage();
  
  // Example Target URL (Replace with your specific target category or product link)
  const targetUrl = 'https://m.1688.com'; 
  
  try {
    console.log(`📡 Fetching market data from: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Extract structure from the target marketplace
    const products = await page.evaluate(() => {
      const items = [];
      // Generic selectors that target product grids/cards
      const cards = document.querySelectorAll('[class*="card"], [class*="item"], a[href*="detail"]');
      
      cards.forEach((card, index) => {
        if (index > 10) return; // Limit to top 10 items for initial test
        
        const titleEl = card.querySelector('[class*="title"], [class*="name"]');
        const priceEl = card.querySelector('[class*="price"], [class*="amount"]');
        const imgEl = card.querySelector('img');

        if (titleEl && priceEl) {
          items.push({
            id: `scraped-${Date.now()}-${index}`,
            title: titleEl.innerText.trim(),
            priceRaw: priceEl.innerText.trim(),
            thumbnail: imgEl ? imgEl.src : '',
            scrapedAt: new Date().toISOString()
          });
        }
      });
      return items;
    });

    // Save the scraped array data to a local file
    fs.writeFileSync('products.json', JSON.stringify(products, null, 2));
    console.log(`✅ Scraped ${products.length} products successfully and saved to products.json`);

  } catch (error) {
    console.error("❌ Scraping process encountered an error:", error.message);
  } finally {
    await browser.close();
  }
}

runScraper();