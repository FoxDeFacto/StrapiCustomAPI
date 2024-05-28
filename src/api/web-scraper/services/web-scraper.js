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
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  //Počká na vykreslení formuláře
  await page.waitForSelector('form');

  // Vybere dle id jednotlivé hodnoty
  await page.select('select#ageYear', '1990'); // Rok
  await page.select('select#ageMonth', '01');  // Měsíc
  await page.select('select#ageDay', '01');    // Den

  // Submit the form
  //await page.waitForSelector('#view_product_page_btn');
  
  // Klikne na ověření věku
  await page.click('#view_product_page_btn');

  // Počká až se stránka přesměruje
  await page.waitForNavigation();

  // Vybere data na základě parametrů
  const gameName = cleanText(await page.evaluate(element => element.textContent, await page.$('#appHubAppName'))); // id
  const description = cleanText(await page.evaluate(element => element.textContent, await page.$('.game_description_snippet'))); // třída
  
  // Vybere skupinu elementů v divu
  const tags = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('.glance_tags.popular_tags .app_tag'));
      return elements.slice(0, -1).map(tag => tag.textContent.trim());
  });

  // Vybere skupinu elementů v divu
  const reguirements = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.game_area_sys_req_rightCol li')).map(tag => tag.textContent.trim());
  });
  //await page.screenshot({ path:'test.png'});

  await browser.close();

  return { url,gameName,description,tags, reguirements };
};


// Hlavní funkce, která zavolá další funkci dle formátu url
const processDataBasedOnUrl = async (url) => {
  try {

    const decodedUrl = decodeURIComponent(url);
    
    if (!validUrl.isHttpsUri(decodedUrl)) { //Kontroluje, zde je url ve správném formátu
      throw new Error('Invalid URL');
    }

    const { data } = await axios.get(decodedUrl);
    const { document } = new JSDOM(data).window;

    let content;
    switch (true) {
      case decodedUrl.startsWith('https://www.csfd.cz/'):
        content = handleCsfdData(document);
        break;
      case decodedUrl.startsWith('https://myanimelist.net/'):
        content = handleMalData(document);
        break;
      case decodedUrl.startsWith('https://store.steampowered.com/'):
        content = await handleSteamData(decodedUrl);
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
