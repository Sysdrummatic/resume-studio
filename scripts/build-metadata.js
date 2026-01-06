#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs/promises');
const path = require('path');
const yaml = require('js-yaml');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'data/public/seo-config.yaml');
const INDEX_PATH = path.join(PROJECT_ROOT, 'index.html');
const ROBOTS_PATH = path.join(PROJECT_ROOT, 'robots.txt');
const SITEMAP_PATH = path.join(PROJECT_ROOT, 'sitemap.xml');

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

function updateMetaBySelector(html, selector, attribute, value) {
  if (!value) return html;
  const escaped = escapeAttribute(value);
  const pattern = new RegExp(
    `(<meta\\b[^>]*${selector}[^>]*${attribute}\\s*=\\s*")(.*?)(")`,
    'i'
  );
  if (!pattern.test(html)) {
    console.warn(
      `Skipped meta update for selector ${selector}; tag not found in HTML. ` +
      `This is safe to ignore if the tag is optional for your site. ` +
      `However, if the config specifies a value for this tag, ensure it exists in index.html.`
    );
    return html;
  }
  return html.replace(pattern, `$1${escaped}$3`);
}

function updateMetaById(html, id, value) {
  if (!value) return html;
  const escaped = escapeAttribute(value);
  const pattern = new RegExp(
    `(<meta\\b[^>]*id=\"${id}\"[^>]*content\\s*=\\s*")(.*?)(")`,
    'i'
  );
  if (!pattern.test(html)) {
    console.warn(
      `Skipped meta update for id ${id}; tag not found in HTML. ` +
      `This is safe to ignore if the tag is optional for your site. ` +
      `However, if the config specifies a value for this tag, ensure it exists in index.html.`
    );
    return html;
  }
  return html.replace(pattern, `$1${escaped}$3`);
}

function updateLinkCanonical(html, value) {
  if (!value) return html;
  const escaped = escapeAttribute(value);
  const pattern = /(<link\b[^>]*rel\s*=\s*"canonical"[^>]*href\s*=\s*")(.*?)(")/i;
  if (!pattern.test(html)) {
    console.warn(
      'Skipped canonical update; <link rel="canonical"> not found in HTML. ' +
      'This is safe to ignore if canonical links are not needed for your site. ' +
      'However, for SEO best practices, ensure a canonical link exists in index.html when specified in the config.'
    );
    return html;
  }
  return html.replace(pattern, `$1${escaped}$3`);
}

function ensureTrailingSlash(value) {
  if (!value) return '';
  return value.endsWith('/') ? value : `${value}/`;
}

function mergeConfigs(target, source) {
  if (!source || typeof source !== 'object') {
    return target;
  }
  const result = { ...target };
  Object.entries(source).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      result[key] = [...value];
      return;
    }
    if (value && typeof value === 'object') {
      const existing = result[key] && typeof result[key] === 'object' ? result[key] : {};
      result[key] = mergeConfigs(existing, value);
      return;
    }
    if (value !== undefined) {
      result[key] = value;
    }
  });
  return result;
}

function resolveSeoSettings(config, locale) {
  const siteConfig = config.site || {};
  const defaultLocale = config.default_locale;
  const locales = config.locales || {};
  const defaultLocaleOverrides = defaultLocale ? locales[defaultLocale] : null;
  const localeOverrides = locales[locale] || null;
  let merged = mergeConfigs({}, siteConfig);
  merged = mergeConfigs(merged, defaultLocaleOverrides);
  merged = mergeConfigs(merged, localeOverrides);
  return merged;
}

async function updateIndexHtml(config) {
  let html = await fs.readFile(INDEX_PATH, 'utf8');
  const defaultLocale = config.default_locale || 'en';
  const seo = resolveSeoSettings(config, defaultLocale);
  if (seo.robots) {
    html = updateMetaBySelector(html, 'name="robots"', 'content', seo.robots);
  }
  if (seo.keywords) {
    const keywordsValue = Array.isArray(seo.keywords) ? seo.keywords.join(', ') : seo.keywords;
    html = updateMetaBySelector(html, 'name="keywords"', 'content', keywordsValue);
  }
  if (seo.og && seo.og.type) {
    html = updateMetaBySelector(html, 'property="og:type"', 'content', seo.og.type);
  }
  if (seo.og && seo.og.site_name) {
    html = updateMetaBySelector(html, 'property="og:site_name"', 'content', seo.og.site_name);
  }
  if (seo.twitter && seo.twitter.card) {
    html = updateMetaBySelector(html, 'name="twitter:card"', 'content', seo.twitter.card);
  }
  if (seo.canonical) {
    html = updateMetaById(html, 'og-url', seo.canonical);
    html = updateLinkCanonical(html, seo.canonical);
  }
  await fs.writeFile(INDEX_PATH, html, 'utf8');
}

async function updateRobots(config) {
  const baseUrl = config.site?.base_url || config.site?.canonical || '';
  const sitemapEntries = config.site?.sitemap?.entries || [];
  let sitemapUrl = '';
  if (sitemapEntries.length && baseUrl) {
    sitemapUrl = new URL('sitemap.xml', ensureTrailingSlash(baseUrl)).href;
  }
  const lines = ['User-agent: *', 'Allow: /'];
  if (sitemapUrl) {
    lines.push(`Sitemap: ${sitemapUrl}`);
  }
  lines.push('');
  await fs.writeFile(ROBOTS_PATH, lines.join('\n'), 'utf8');
}

async function updateSitemap(config) {
  const entries = config.site?.sitemap?.entries || [];
  if (!entries.length) {
    return;
  }
  const baseUrl = config.site?.base_url || config.site?.canonical || '';
  const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  entries.forEach((entry) => {
    const urlPath = entry.path || '';
    const absolute = baseUrl ? new URL(urlPath, ensureTrailingSlash(baseUrl)).href : urlPath;
    xml.push('  <url>');
    xml.push(`    <loc>${absolute}</loc>`);
    if (entry.changefreq) {
      xml.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    }
    if (entry.priority !== undefined) {
      xml.push(`    <priority>${entry.priority}</priority>`);
    }
    xml.push('  </url>');
  });
  xml.push('</urlset>');
  xml.push('');
  await fs.writeFile(SITEMAP_PATH, xml.join('\n'), 'utf8');
}

async function main() {
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  const config = yaml.load(raw);
  if (!config || typeof config !== 'object') {
    throw new Error('SEO configuration must be a YAML object.');
  }
  await updateIndexHtml(config);
  await updateRobots(config);
  await updateSitemap(config);
  console.log('Metadata assets refreshed.');
}

main().catch((error) => {
  console.error('Metadata build failed.', error);
  process.exitCode = 1;
});
