const axios = require('axios');
const { JSDOM } = require('jsdom');
const cheerio = require('cheerio');

//Odebere escape sekvence a nové řádky
const cleanText = (text) => text.replace(/[\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

const splitTextByKeywords = (text) => {
  //Pole klíčových slov
  const keywords = ['Tvůrci', 'Režie', 'Scénář', 'Kamera', 'Hudba', 'Hrají'];
  //Tvorba reger vzoru na dělení dle klíčových slov
  const regexPattern = new RegExp(`\\s*(${keywords.join('|')})\\s*`, 'g');
  //Dělení vstupu a odfiltrování prázdných výstupů
  const splitText = text.split(regexPattern).filter(Boolean);
  //Spojení výstupů do pole ve formátu [Klíč, Hodnota]
  let result = {};
  for (let i = 0; i < splitText.length; i += 2) {
    const key = splitText[i];
    const value = splitText[i + 1];
    if (key && value) {
      result[key] = value.length > 2 ? value.substring(2).trim() : ''; //Odebere první 2 znaky na začátku výstupu
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
    rating,
    animeName,
    storySummary
  };
};

// Funkce na zpracování dat z Steam
const handleSteamData = async (url) => {

  const  result  = await fetchAgeVerifiedPage(url);
  //console.log(result);
  //const  { obj }  = await fetchAgeVerifiedPage(url);
  //const  document = new JSDOM(obj).window;
  //const out = document.querySelector('html');

  return {
    //out,
    result

  };
};

const fetchAgeVerifiedPage = async (url) => {
    try {
      //Inicializatce úvodní stránky
      const initialResponse = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36'
        }
      });
  
      // Data na odeslání
      const formData = {
        ageDay: '1',
        ageMonth: 'January',
        ageYear: '1990'
      };
  
      // Výběr potředných cookies
      const cookies = initialResponse.headers['set-cookie'].join('; ');
  
      // Post request na formulář s datem narození
      const postResponse = await axios.post(url, new URLSearchParams(formData), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36',
          'Cookie': cookies,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 303
      });
  
      //Fetch přesměrování
      const redirectedUrl = postResponse.headers.location;
      const finalResponse = await axios.get(redirectedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36',
          'Cookie': cookies
        }
      });
  
      // Finální zpracování dat
      const finalPage = cheerio.load(finalResponse.data).html();
  
      return { finalPage };
    } catch (error) {
      console.error(error);
      return { error: error.message };
    }
  };

// Hlavní funkce, který zavolá další funkci dle formátu url
const processDataBasedOnUrl = async (url) => {
  try {
    const { data } = await axios.get(url);
    const { document } = new JSDOM(data).window;

    //TODO: Ověřit si správnost url př kontrola startswith - https://www.csfd.cz/
    //TODO: Přidat url encode a decode
    let content;
    switch (true) {
      case url.includes('csfd.cz'):
        content = handleCsfdData(document);
        break;
      case url.includes('myanimelist.net'):
        content = handleMalData(document);
        break;
      case url.includes('store.steampowered.com'):
        content = await handleSteamData(url);
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
