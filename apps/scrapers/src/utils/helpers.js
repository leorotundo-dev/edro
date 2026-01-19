const axios = require('axios');
const cheerio = require('cheerio');
const pdfParse = require('pdf-parse');

async function fetchHtml(url) {
  const response = await axios.get(url, {
    timeout: 30000,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  return response.data;
}

function extractTextFromHtml(html) {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

async function fetchPdf(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
  const data = await pdfParse(response.data);
  return data.text;
}

function isPdfUrl(url) {
  return /\.pdf(\?|$)/i.test(url || '');
}

function sanitizeText(text) {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { fetchHtml, extractTextFromHtml, fetchPdf, isPdfUrl, sanitizeText, sleep };
