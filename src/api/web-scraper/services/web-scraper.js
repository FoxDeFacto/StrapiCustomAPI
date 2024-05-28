const axios = require('axios');
const { JSDOM } = require('jsdom');
const validUrl = require('valid-url');
const puppeteer = require('puppeteer');

// Odebere escape sekvence a nové řádky
const cleanText = (text) => text.replace(/[\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

const splitTextByKeywords = (text) => {
  // Pole klíčových slov
  const keywords = ['Tvůrci', 'Režie', 'Scénář', 'Kamera', 'Hudba', 'Hrají'];
  // Tvorba regex vzoru na dělení dle klíčových slov
  const regexPattern = new RegExp(`\\s*(${keywords.join('|')})\\s*`, 'g');
  // Dělení vstupu a odfiltrování prázdných výstupů
  const splitText = text.split(regexPattern).filter(Boolean);
  // Spojení výstupů do pole ve formátu [Klíč, Hodnota]
  let result = {};
  for (let i = 0; i < splitText.length; i += 2) {
    const key = splitText[i];
    const value = splitText[i + 1];
    if (key && value) {
      result[key] = value.length > 2 ? value.substring(2).trim() : ''; // Odebere první 2 znaky na začátku výstupu
    }
  }
  return result;
};

// Funkce na zpracování dat z ČSFD
const handleCsfdData = (document) => {
  const showName = cleanText(document.querySelector('.film-header-name h1').textContent);
  const genres = Array.from(document.querySelectorAll('.genres a')).map(el => cleanText(el.textContent));
  const originLength = cleanText(document.querySelector('.origin').textContent);
  const creators = splitTextByKeywords(cleanText(document.querySelector('.creators').textContent));
  const storySummary = cleanText(document.querySelector('.plot-full p')?.textContent || document.querySelector('.plot-preview p')?.textContent || '');

  return {
    showName,
    genres,
    originLength,
    creators,
    storySummary
  };
};

// Funkce na zpracování dat z MyAnimeListu
const handleMalData = (document) => {
  const rating = cleanText(document.querySelector('.score-label').textContent);
  const animeName = cleanText(document.querySelector('.title-name.h1_bold_none').textContent);
  const storySummary = cleanText(document.querySelector('[itemprop="description"]').textContent);

  return { 
    animeName,
    rating,
    storySummary
  };
};

// Funkce na zpracování dat ze Steam
const handleSteamData = async (url) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Disable loading images and styles
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });

  await page.goto(url, { waitUntil: 'networkidle2' });


  if (await page.$('#view_product_page_btn') !== null) 
  {

    // Počká na vykreslení formuláře
    await page.waitForSelector('form');

    // Vybere dle id jednotlivé hodnoty
    await page.select('select#ageYear', '1990'); // Rok
    await page.select('select#ageMonth', '01');  // Měsíc
    await page.select('select#ageDay', '01');    // Den

    // Klikne na ověření věku
    await page.click('#view_product_page_btn');

    // Počká až se stránka přesměruje
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  }

  // Vybere data na základě parametrů
  const gameName = cleanText(await page.evaluate(element => element.textContent, await page.$('#appHubAppName'))); // id
  const description = cleanText(await page.evaluate(element => element.textContent, await page.$('.game_description_snippet'))); // třída
  
  // Vybere skupinu elementů v divu
  const tags = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('.glance_tags.popular_tags .app_tag'));
      return elements.slice(0, -1).map(tag => tag.textContent.trim());
  });

  // Vybere skupinu elementů v divu
  const requirements = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.game_area_sys_req_rightCol li')).map(tag => tag.textContent.trim());
  });

  await browser.close();

  return { 
    gameName, 
    description, 
    tags, 
    requirements 
  };
};


// Funkce na zpracování dat z EpicGames - nefunguje, protože to axios crashn
//TODO fix ten zkurvený axios
const handleEpicStoreData = async (url) => {

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Disable loading images and styles
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });


  await page.goto(url, { waitUntil: 'networkidle2' });


  if (await page.$('#btn_age_continue') !== null) 
  {
    // Počká na vykreslení formuláře
    await page.waitForSelector('form');

    // Vybere dle id jednotlivé hodnoty
    await page.select('select#year_toggle', '1990'); // Rok
    await page.select('select#month_menu', '01');  // Měsíc
    await page.select('select#day_toggle', '01');    // Den

    // Klikne na ověření věku
    await page.click('#btn_age_continue');

    // Počká až se stránka přesměruje
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  }


  // Vybere data na základě parametrů
  const gameName = cleanText(await page.evaluate(element => element.textContent, await page.$('.zkurvena_classa'))); // id

  /*
  const description = cleanText(await page.evaluate(element => element.textContent, await page.$('.game_description_snippet'))); // třída
  
  // Vybere skupinu elementů v divu
  const tags = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('.glance_tags.popular_tags .app_tag'));
      return elements.slice(0, -1).map(tag => tag.textContent.trim());
  });

  // Vybere skupinu elementů v divu
  const requirements = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.game_area_sys_req_rightCol li')).map(tag => tag.textContent.trim());
  });
 */
  await browser.close();

  console.log(gameName);

  return { 
    gameName, 
    /*
    description, 
    tags, 
    requirements 
    */
  };
};


// Hlavní funkce, která zavolá další funkci dle formátu url
const processDataBasedOnUrl = async (url) => {
  try {
    const decodedUrl = decodeURIComponent(url);
    if (!validUrl.isHttpsUri(decodedUrl)) { //Kontroluje, zde je url ve správném formátu
      throw new Error('Invalid URL');
    }

    const { data } = await axios.get(url);
    const { document } = new JSDOM(data).window;

    let content;

    switch (true) {
      case decodedUrl.startsWith('https://www.csfd.cz/'):
        console.log("ČSFD");
        content = handleCsfdData(document);
        break;
      case decodedUrl.startsWith('https://myanimelist.net/'):
        console.log("MAL");
        content = handleMalData(document);
        break;
      case decodedUrl.startsWith('https://store.steampowered.com/'):
        console.log("Steam");
        content = await handleSteamData(decodedUrl);
        break;
      case decodedUrl.startsWith('https://store.epicgames.com/'):
        console.log("Epic");
        content = await handleEpicStoreData(decodedUrl);
        break;
      default:
        content = { error: 'Unsupported URL type' };
    }
    return { content };
  } catch (err) {
    return { error: err.message };
  }
};

module.exports = {
  extractContent: processDataBasedOnUrl
};
