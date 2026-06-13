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
  
  // Directly targeting a popular wholesale category feed ensures predictable grid structures
  const targetUrl = 'https://m.1688.com/page/index.html'; 
  
  try {
    console.log(`📡 Fetching market data from: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });

    // Force extra wait time for lazy components to mount fully
    await page.waitForTimeout(5000);

    // Mimic real scrolling to push lazy items down and pull up DOM nodes
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 200;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= 1600) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });

    // Precise extraction logic targeting common mobile web elements
    const products = await page.evaluate(() => {
      const items = [];
      
      // Target standard continuous feed item containers or lists
      const elements = document.querySelectorAll('div[class*="item"], div[class*="card"], a[data-click-log]');
      
      elements.forEach((el, index) => {
        if (items.length >= 12) return; // Cap at top 12 items for clean catalog display

        // Traverse structural elements searching for valid pricing characters
        const txt = el.innerText || "";
        const priceMatch = txt.match(/(?:¥|元|Price)?\s*([0-9]+\.[0-9]+|[0-9]+)/);
        
        if (priceMatch) {
          const imgEl = el.querySelector('img');
          // Skip tracking icons or transparent layouts
          if (imgEl && imgEl.src && !imgEl.src.includes('blank.gif')) {
            
            // Clean out line-breaks from dynamic text dumps
            let extractedTitle = txt.split('\n')[0].trim();
            if (extractedTitle.length < 5 || extractedTitle.match(/^[0-9¥.\s]+$/)) {
              extractedTitle = "Wholesale Factory Item";
            }

            items.push({
              id: `scraped-${Date.now()}-${index}`,
              title: extractedTitle.substring(0, 60),
              priceRaw: `¥${priceMatch[1]}`,
              thumbnail: imgEl.src,
              scrapedAt: new Date().toISOString()
            });
          }
        }
      });
      
      return items;
    });

    // Deduplicate entries based on thumbnail links
    const uniqueProducts = Array.from(new Map(products.map(item => [item.thumbnail, item])).values());

    fs.writeFileSync('products.json', JSON.stringify(uniqueProducts, null, 2));
    console.log(`✅ Scraped ${uniqueProducts.length} products successfully and saved to products.json`);

  } catch (error) {
    console.error("❌ Scraping process encountered an error:", error.message);
  } finally {
    await browser.close();
  }
}

runScraper();