const PUBLIC_VIEW = {
  localesConfigPath: 'data/public/locales.yaml',
  storageKey: 'resume-studio:locale',
  defaultLocale: 'en',
};

const SEO_CONFIG = Object.freeze({
  path: 'data/public/seo-config.yaml',
});

const OG_LOCALE_MAP = Object.freeze({
  en: 'en_US',
  pl: 'pl_PL',
});

const DEFAULT_OG_LOCALE = 'en_US';
const SUMMARY_SNIPPET_LENGTH = 155;

const LANGUAGE_PRESETS = Object.freeze({
  en: {
    faq: {
      roleQuestion: 'What type of roles does {name} focus on?',
      roleFallback: '{name} focuses on {role}.',
      locationQuestion: 'Where is {name} based?',
      locationAnswer: '{name} is currently based in {location}.',
      contactQuestion: 'How can recruiters contact {name}?',
      contactAnswerPrefix: 'Please reach out to {name} via {channels}.',
      contactConnector: ' or ',
      toolsQuestion: 'What tools does {name} work with?',
      toolsAnswer: '{name} regularly collaborates with {tools}.',
    },
  },
  pl: {
    faq: {
      roleQuestion: 'Jakimi rolami zajmuje się {name}?',
      roleFallback: '{name} koncentruje się na roli {role}.',
      locationQuestion: 'Gdzie obecnie pracuje {name}?',
      locationAnswer: '{name} działa w {location}.',
      contactQuestion: 'Jak skontaktować się z {name}?',
      contactAnswerPrefix: 'Skontaktuj się z {name} przez {channels}.',
      contactConnector: ' lub ',
      toolsQuestion: 'Z jakich narzędzi korzysta {name}?',
      toolsAnswer: '{name} najczęściej korzysta z {tools}.',
    },
  },
});

const FALLBACK_LABELS = Object.freeze({
  language_switcher: 'Language',
  summary_heading: 'Summary',
  github_activity_heading: 'GitHub Activity',
  experience_heading: 'Experience',
  education_heading: 'Education',
  courses_heading: 'Courses',
  personal_info_heading: 'Personal Info',
  skills_heading: 'Skills',
  tech_stack_heading: 'Tech stack',
  languages_heading: 'Languages',
  interests_heading: 'Interests',
  faq_heading: 'FAQ',
  continuation_template: '{heading} {current}/{total}',
  public_view_badge: 'Public view',
  private_view_badge: 'Private view',
  edit_button_label: 'Edit',
  save_button_label: 'Save',
  ats_download_label: 'Download ATS text',
});

function normalizeAdminPassword(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return null;
}

const ADMIN_CONFIG = (() => {
  let password = normalizeAdminPassword(window.ADMIN_PASSWORD);
  return {
    storageKeys: Object.freeze({
      unlocked: 'resume-studio:admin-unlocked',
      presets: 'resume-studio:presets:v2',
      activePreset: 'resume-studio:active-preset:v2',
      items: 'resume-studio:item-visibility:v1',
    }),
    presetQueryParam: 'version',
    customPresetId: '__custom__',
    get password() {
      return password;
    },
    set password(next) {
      password = normalizeAdminPassword(next);
    },
  };
})();

const SECTION_DEFINITIONS = Object.freeze([
  { id: 'summary', selector: '[data-section="summary"]', fallbackLabel: 'Summary', configurable: false },
  { id: 'github', selector: '[data-section="github"]', fallbackLabel: 'GitHub Activity', configurable: false },
  { id: 'experience', selector: '[data-section="experience"]', fallbackLabel: 'Experience', configurable: true },
  { id: 'education', selector: '[data-section="education"]', fallbackLabel: 'Education', configurable: true },
  { id: 'courses', selector: '[data-section="courses"]', fallbackLabel: 'Courses', configurable: true },
  { id: 'personal-info', selector: '[data-section="personal-info"]', fallbackLabel: 'Personal Info', configurable: false },
  { id: 'skills', selector: '[data-section="skills"]', fallbackLabel: 'Skills', configurable: true },
  { id: 'tech-stack', selector: '[data-section="tech-stack"]', fallbackLabel: 'Tech stack', configurable: true },
  { id: 'languages', selector: '[data-section="languages"]', fallbackLabel: 'Languages', configurable: true },
  { id: 'interests', selector: '[data-section="interests"]', fallbackLabel: 'Interests', configurable: true },
]);

const CONFIGURABLE_SECTIONS = SECTION_DEFINITIONS.filter((section) => section.configurable);

const DEFAULT_PRESET = Object.freeze({
  id: 'default',
  name: 'All elements',
  visibility: {},
});

const RESOURCE_CACHE = Object.freeze({
  prefix: 'resume-studio:cache:',
  ttlMs: 1000 * 60 * 10,
});

class ValidationError extends Error {
  constructor(message, context = '') {
    super(message);
    this.name = 'ValidationError';
    this.context = context;
  }
}

function condenseWhitespace(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/\s+/g, ' ').trim();
}

function formatTemplate(template, dictionary) {
  if (typeof template !== 'string') return '';
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const replacement = dictionary?.[key];
    if (replacement === undefined || replacement === null) {
      return match;
    }
    return String(replacement);
  });
}

function extractFirstSentence(text) {
  const condensed = condenseWhitespace(text);
  if (!condensed) return '';
  const match = condensed.match(/.+?[.!?](?=\s|$)/);
  return (match ? match[0] : condensed).trim();
}

function mergeNestedConfigs(target, source) {
  if (!source || typeof source !== 'object') {
    return target;
  }
  const result = { ...target };
  Object.entries(source).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      result[key] = [...value];
    } else if (value && typeof value === 'object') {
      const existing = result[key] && typeof result[key] === 'object' ? result[key] : {};
      result[key] = mergeNestedConfigs(existing, value);
    } else if (value !== undefined) {
      result[key] = value;
    }
  });
  return result;
}

function slugify(value) {
  const raw = String(value || '').trim();
  const normalized = typeof raw.normalize === 'function' ? raw.normalize('NFKD') : raw;
  const base = normalized
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return base || 'resume';
}

function getPageUrl() {
  if (typeof window === 'undefined' || !window.location) {
    return '';
  }
  return `${window.location.origin}${window.location.pathname}`;
}

function setMetaContentById(id, value) {
  const node = document.getElementById(id);
  if (node && typeof value === 'string' && value) {
    node.setAttribute('content', value);
  }
}

function setMetaContentBySelector(selector, value) {
  if (typeof value !== 'string' || !value) {
    return;
  }
  const node = document.querySelector(selector);
  if (node) {
    node.setAttribute('content', value);
  }
}

function deriveMetaDescription(profile) {
  if (!profile) return '';
  const summarySentence = extractFirstSentence(profile.summary || '');
  if (summarySentence) {
    if (summarySentence.length > SUMMARY_SNIPPET_LENGTH) {
      return `${summarySentence.slice(0, SUMMARY_SNIPPET_LENGTH - 1)}…`;
    }
    return summarySentence;
  }
  const role = profile.role ? ` · ${profile.role}` : '';
  return `${profile.name || 'Resume'}${role}`.trim();
}

function mapLocaleToOg(localeCode) {
  if (!localeCode) return DEFAULT_OG_LOCALE;
  return OG_LOCALE_MAP[localeCode] || DEFAULT_OG_LOCALE;
}

function findContactEntry(contactItems, matcher) {
  if (!Array.isArray(contactItems)) return null;
  return contactItems.find((item) => {
    if (!item) return false;
    try {
      return matcher(item);
    } catch (matcherError) {
      console.warn('Contact matcher error', matcherError);
      return false;
    }
  }) || null;
}

function findContactValue(contactItems, predicate) {
  const entry = findContactEntry(contactItems, predicate);
  if (!entry) return '';
  if (typeof entry.value === 'string' && entry.value.trim()) {
    return entry.value.trim();
  }
  if (typeof entry.link === 'string' && entry.link.trim()) {
    return entry.link.trim();
  }
  return '';
}

function findContactLink(contactItems, prefix) {
  const entry = findContactEntry(contactItems, (item) => typeof item.link === 'string' && item.link.startsWith(prefix));
  return entry?.link?.trim() || '';
}

function collectSameAsLinks(contactItems) {
  if (!Array.isArray(contactItems)) return [];
  return contactItems
    .map((item) => (typeof item?.link === 'string' ? item.link.trim() : ''))
    .filter((link) => link && !link.startsWith('mailto:') && !link.startsWith('tel:'));
}

function pruneEmptyFields(payload) {
  if (!payload || typeof payload !== 'object') return {};
  const result = Array.isArray(payload) ? [] : {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (Array.isArray(value)) {
      const cleaned = value
        .map((entry) => (typeof entry === 'object' ? pruneEmptyFields(entry) : entry))
        .filter((entry) => {
          if (entry === undefined || entry === null) return false;
          if (typeof entry === 'object') {
            return Object.keys(entry).length > 0;
          }
          return String(entry).trim().length > 0;
        });
      if (cleaned.length) {
        if (Array.isArray(result)) {
          result.push(...cleaned);
        } else {
          result[key] = cleaned;
        }
      }
      return;
    }
    if (typeof value === 'object') {
      const nested = pruneEmptyFields(value);
      if (Object.keys(nested).length) {
        if (Array.isArray(result)) {
          result.push(nested);
        } else {
          result[key] = nested;
        }
      }
      return;
    }
    const strValue = typeof value === 'string' ? value.trim() : value;
    if (strValue !== '' && strValue !== undefined) {
      if (Array.isArray(result)) {
        result.push(strValue);
      } else {
        result[key] = strValue;
      }
    }
  });
  return result;
}

function updateMetaTags(profile, localeCode) {
  if (!profile) return;
  const seoSettings = getSeoSettingsForLocale(localeCode);
  if (seoSettings.robots) {
    setMetaContentBySelector('meta[name="robots"]', seoSettings.robots);
  }
  if (seoSettings.keywords) {
    const keywordValue = Array.isArray(seoSettings.keywords)
      ? seoSettings.keywords.join(', ')
      : seoSettings.keywords;
    setMetaContentBySelector('meta[name="keywords"]', keywordValue);
  }
  if (seoSettings.og?.type) {
    setMetaContentBySelector('meta[property="og:type"]', seoSettings.og.type);
  }
  if (seoSettings.og?.site_name) {
    setMetaContentBySelector('meta[property="og:site_name"]', seoSettings.og.site_name);
  }
  if (seoSettings.twitter?.card) {
    setMetaContentBySelector('meta[name="twitter:card"]', seoSettings.twitter.card);
  }
  const title = profile.role ? `${profile.name} · ${profile.role}` : profile.name || document.title;
  const description = deriveMetaDescription(profile);
  const authorMeta = document.getElementById('meta-author');
  if (authorMeta && profile.name) {
    authorMeta.setAttribute('content', profile.name);
  }

  setMetaContentById('meta-description', description);
  setMetaContentById('og-title', title);
  setMetaContentById('og-description', description);
  setMetaContentById('twitter-title', title);
  setMetaContentById('twitter-description', description);

  const localeTag = mapLocaleToOg(localeCode);
  setMetaContentById('og-locale', localeTag);

  const canonical = document.getElementById('canonical-link');
  const canonicalUrl = seoSettings.canonical || getPageUrl();
  if (canonical && canonicalUrl) {
    canonical.setAttribute('href', canonicalUrl);
  }
  if (canonicalUrl) {
    setMetaContentById('og-url', canonicalUrl);
  }
}

function updateStructuredData(profile, localeCode) {
  const script = document.getElementById('person-structured-data');
  if (!script || !profile) return;

  const contactItems = Array.isArray(profile.contact) ? profile.contact : [];
  const location = findContactValue(contactItems, (item) => String(item.label || '').toLowerCase().includes('location'));
  const emailLink = findContactLink(contactItems, 'mailto:');
  const phoneLink = findContactLink(contactItems, 'tel:');
  const sameAs = collectSameAsLinks(contactItems);
  const latestExperience = Array.isArray(profile.experience) && profile.experience.length ? profile.experience[0] : null;
  const skills = Array.isArray(profile.skills) ? profile.skills.map((skill) => skill?.name).filter(Boolean).slice(0, 6) : [];
  const description = extractFirstSentence(profile.summary || '');
  const seoSettings = getSeoSettingsForLocale(localeCode);
  const canonicalUrl = seoSettings.canonical || getPageUrl();
  const baseUrl = seoSettings.base_url;
  const schemaSameAs = Array.from(
    new Set([
      ...sameAs,
      typeof baseUrl === 'string' ? baseUrl : null,
      typeof canonicalUrl === 'string' ? canonicalUrl : null,
    ].filter(Boolean))
  );

  const personData = pruneEmptyFields({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.role,
    description,
    url: canonicalUrl || schemaSameAs[0],
    worksFor: latestExperience?.company
      ? {
          '@type': 'Organization',
          name: latestExperience.company,
        }
      : undefined,
    address: location
      ? {
          '@type': 'PostalAddress',
          addressLocality: location,
        }
      : undefined,
    email: emailLink ? emailLink.replace(/^mailto:/, '') : undefined,
    telephone: phoneLink ? phoneLink.replace(/^tel:/, '') : undefined,
    sameAs: schemaSameAs.length ? schemaSameAs : undefined,
    knowsAbout: skills,
    speaksLanguage:
      Array.isArray(profile.languages)
        ? profile.languages.map((item) => item?.name).filter(Boolean)
        : undefined,
  });

  script.textContent = JSON.stringify(personData, null, 2);
}
let currentProfile;

let localeMetadata;
let activeLocaleCode;
let activeLabels = { ...FALLBACK_LABELS };
let seoMetadata;
let localeRequestToken = 0;
let languageSwitcherBusy = false;
let adminUnlocked = false;
let adminPresets = [DEFAULT_PRESET];
let activePresetId = DEFAULT_PRESET.id;
let itemVisibilityMap = new Map();
let currentSectionData = {};
let activeConfigSectionId = '';
let adminLoginFormState = null;

function focusElement(element) {
  if (!element || typeof element.focus !== 'function') {
    return false;
  }
  if (typeof element.matches === 'function' && element.matches('[disabled], [aria-disabled="true"]')) {
    return false;
  }
  try {
    element.focus({ preventScroll: true });
  } catch (focusError) {
    element.focus();
  }
  return document.activeElement === element;
}

function focusFirstAdminControl() {
  const activeSectionRadio = document.querySelector('#section-select-form input[name="admin-section"]');
  if (focusElement(activeSectionRadio)) {
    return;
  }
  const presetSelect = document.getElementById('preset-select');
  if (focusElement(presetSelect)) {
    return;
  }
  const panel = document.getElementById('admin-panel');
  if (panel && !panel.hasAttribute('tabindex')) {
    panel.setAttribute('tabindex', '-1');
    panel.dataset.adminFocusTabindex = 'true';
  }
  if (panel && !focusElement(panel)) {
    if (panel.dataset.adminFocusTabindex === 'true') {
      panel.removeAttribute('tabindex');
      delete panel.dataset.adminFocusTabindex;
    }
  }
}

const PAGE_CONTEXT = document.body?.dataset.viewMode || 'public';
const isEditorView = PAGE_CONTEXT === 'user';

document.addEventListener('DOMContentLoaded', () => {
  initNavbarBehaviour();
  initAtsExport();
  initPublicView();
  bootstrapAdminFeatures().catch((error) => {
    console.error('Admin features failed to initialize.', error);
  });
});

window.addEventListener('admin-env-ready', (event) => {
  const password = normalizeAdminPassword(event?.detail?.password);
  ADMIN_CONFIG.password = password;
  refreshAdminLoginState();
});

async function bootstrapAdminFeatures() {
  const password = await resolveAdminPassword();
  ADMIN_CONFIG.password = password;
  restoreAdminState();
  initAdminPanel();
  initLogoutButton();
}

async function resolveAdminPassword() {
  try {
    const candidate = window.__adminEnvPromise;
    if (candidate && typeof candidate.then === 'function') {
      const resolved = await candidate;
      return normalizeAdminPassword(resolved);
    }
    return normalizeAdminPassword(window.ADMIN_PASSWORD);
  } catch (error) {
    console.error('Unable to resolve admin password from environment.', error);
    return null;
  }
}

function setAppLoading(state) {
  const isBusy = Boolean(state);
  document.documentElement.classList.toggle('is-loading', isBusy);
  const indicator = document.getElementById('app-loading-indicator');
  if (indicator) {
    indicator.hidden = !isBusy;
    indicator.setAttribute('aria-hidden', String(!isBusy));
    indicator.setAttribute('aria-busy', String(isBusy));
  }
}

function getCacheKey(path) {
  return `${RESOURCE_CACHE.prefix}${path}`;
}

function readCachedResource(path) {
  try {
    const key = getCacheKey(path);
    const stored = window.localStorage?.getItem(key);
    if (!stored) {
      return null;
    }
    const payload = JSON.parse(stored);
    if (!payload || typeof payload !== 'object') {
      window.localStorage?.removeItem(key);
      return null;
    }
    const timestamp = Number(payload.timestamp);
    if (!Number.isFinite(timestamp)) {
      window.localStorage?.removeItem(key);
      return null;
    }
    const age = Date.now() - timestamp;
    if (Number.isNaN(age) || age > RESOURCE_CACHE.ttlMs) {
      window.localStorage?.removeItem(key);
      return null;
    }
    return typeof payload.value === 'string' ? payload.value : null;
  } catch (error) {
    return null;
  }
}

function writeCachedResource(path, text) {
  try {
    const payload = JSON.stringify({ value: text, timestamp: Date.now() });
    window.localStorage?.setItem(getCacheKey(path), payload);
  } catch (error) {
    // Ignore storage quota errors
  }
}

async function fetchResourceWithCache(path) {
  try {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Unable to load resource: ${path}`);
    }
    const text = await response.text();
    writeCachedResource(path, text);
    return { text, fromCache: false };
  } catch (networkError) {
    const cached = readCachedResource(path);
    if (cached !== null) {
      console.warn(`Using cached data for ${path} after fetch failure`, networkError);
      return { text: cached, fromCache: true };
    }
    throw networkError;
  }
}

function parseYaml(text, path) {
  try {
    return jsyaml.load(text);
  } catch (parseError) {
    const error = new ValidationError(`YAML parsing failed for ${path}. ${parseError.message}`, path);
    error.cause = parseError;
    throw error;
  }
}

async function initPublicView() {
  try {
    const [loadedSeoConfig, localesConfig] = await Promise.all([
      loadSeoConfig().catch((error) => {
        console.warn('Unable to load SEO metadata configuration.', error);
        return null;
      }),
      loadLocalesConfig(),
    ]);
    seoMetadata = loadedSeoConfig;
    localeMetadata = localesConfig;
    if (!localeMetadata.locales.length) {
      throw new Error('No locales configured for public view.');
    }
    const initialLocale = resolveInitialLocale(localeMetadata);
    renderLocaleSwitcher(localeMetadata.locales, initialLocale);
    await applyLocale(initialLocale);
  } catch (error) {
    showError(error);
  }
}

async function loadLocalesConfig() {
  const raw = await fetchYaml(PUBLIC_VIEW.localesConfigPath);
  const locales = [];
  const map = new Map();

  if (!raw || !Array.isArray(raw.locales)) {
    throw new ValidationError('Locale manifest must include a "locales" array.', PUBLIC_VIEW.localesConfigPath);
  }

  raw.locales.forEach((entry, index) => {
    if (!entry) return;
    const code = String(entry.code || '').trim().toLowerCase();
    const resumePath = String(entry.resume_path || '').trim();
    if (!code) {
      throw new ValidationError(`Locale entry at index ${index} is missing a locale code.`, PUBLIC_VIEW.localesConfigPath);
    }
    if (!resumePath) {
      throw new ValidationError(`Locale "${code}" is missing a resume_path value.`, PUBLIC_VIEW.localesConfigPath);
    }
    if (map.has(code)) {
      console.warn(`Duplicate locale code "${code}" found in locales manifest. This duplicate entry will be ignored.`);
      return;
    }
    const configPath = String(entry.config_path || `data/public/config/${code}.yaml`).trim();
    const normalized = {
      code,
      resumePath,
      configPath,
      label: String(entry.label || code.toUpperCase()),
    };
    map.set(code, normalized);
    locales.push(normalized);
  });

  let defaultLocale = String(raw?.default_locale || PUBLIC_VIEW.defaultLocale).trim().toLowerCase();
  if (!map.has(defaultLocale) && locales.length) {
    defaultLocale = locales[0].code;
  }

  return { defaultLocale, locales, map };
}

function resolveInitialLocale(metadata) {
  try {
    const stored = window.localStorage?.getItem(PUBLIC_VIEW.storageKey);
    if (stored && metadata.map.has(stored)) {
      return stored;
    }
  } catch (storageError) {
    // ignore storage access issues
  }

  const navigatorLanguage = (navigator.language || navigator.userLanguage || '').slice(0, 2).toLowerCase();
  if (navigatorLanguage && metadata.map.has(navigatorLanguage)) {
    return navigatorLanguage;
  }

  return metadata.defaultLocale;
}

async function applyLocale(requestedCode) {
  if (!localeMetadata) return;
  const token = ++localeRequestToken;
  const targetCode = localeMetadata.map.has(requestedCode)
    ? requestedCode
    : localeMetadata.defaultLocale;
  const localeEntry = localeMetadata.map.get(targetCode);
  if (!localeEntry) {
    setLanguageSwitcherBusy(false);
    setAppLoading(false);
    showError(new Error('Selected locale is not available.'));
    return;
  }

    setAppLoading(true);
    setLanguageSwitcherBusy(true);

    try {
      const resumeData = validateResumeData(await fetchYaml(localeEntry.resumePath), localeEntry.resumePath);
      let configData = {};
      if (localeEntry.configPath) {
        try {
          configData = validateLocaleConfig(await fetchYaml(localeEntry.configPath), localeEntry.configPath);
        } catch (configError) {
          console.warn(`Unable to load locale config for ${localeEntry.code}`, configError);
        }
      }

      if (token !== localeRequestToken) {
        return;
      }

      const {
        labels: resumeLabels = {},
        locale: resumeLocale,
        language_name: resumeLanguageName,
        ...profile
      } = resumeData || {};

      const configLabels = configData?.labels || {};
      const localeTag = configData?.locale || resumeLocale;
      const languageName = configData?.language_name || resumeLanguageName;
      activeLabels = { ...FALLBACK_LABELS, ...resumeLabels, ...configLabels };

      activeLocaleCode = localeEntry.code;

      if (localeTag || localeEntry.code) {
        document.documentElement.lang = (localeTag || localeEntry.code).toLowerCase();
      }
      if (languageName) {
        document.documentElement.setAttribute('data-language-name', languageName);
      } else {
        document.documentElement.removeAttribute('data-language-name');
      }

      try {
        window.localStorage?.setItem(PUBLIC_VIEW.storageKey, activeLocaleCode);
      } catch (storageError) {
        // ignore storage persistence errors
      }

      applyLabels(activeLabels);
      renderResume(profile);
      currentProfile = profile;
      renderLocaleSwitcher(localeMetadata.locales, activeLocaleCode);
    } catch (error) {
    if (token === localeRequestToken) {
      showError(error);
    }
  } finally {
    if (token === localeRequestToken) {
      setLanguageSwitcherBusy(false);
        setAppLoading(false);
    }
  }
}

async function fetchYaml(path) {
  const { text } = await fetchResourceWithCache(path);
  return parseYaml(text, path);
}

function validateResumeData(data, path) {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Resume file must define an object with resume fields.', path);
  }

  const scalarFields = ['name', 'role', 'brand_initials', 'summary'];
  scalarFields.forEach((field) => {
    if (field in data && data[field] !== null && typeof data[field] !== 'string') {
      throw new ValidationError(`Field "${field}" must be a string in resume data.`, path);
    }
  });

  const arrayFields = [
    'experience',
    'education',
    'courses',
    'skills',
    'languages',
    'tech_stack',
    'interests',
    'contact',
    'qr_codes',
  ];
  arrayFields.forEach((field) => {
    if (field in data && data[field] !== null && !Array.isArray(data[field])) {
      throw new ValidationError(`Field "${field}" must be an array in resume data.`, path);
    }
  });

  return data;
}

function validateLocaleConfig(data, path) {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Locale config must be an object.', path);
  }

  if ('labels' in data && (typeof data.labels !== 'object' || data.labels === null)) {
    throw new ValidationError('Locale config "labels" must be an object map.', path);
  }

  const scalarFields = ['locale', 'language_name'];
  scalarFields.forEach((field) => {
    if (field in data && data[field] !== null && typeof data[field] !== 'string') {
      throw new ValidationError(`Locale config field "${field}" must be a string.`, path);
    }
  });

  return data;
}

function validateSeoConfig(data, path) {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('SEO configuration must be an object.', path);
  }

  if ('site' in data && (typeof data.site !== 'object' || data.site === null)) {
    throw new ValidationError('SEO config "site" must be an object.', path);
  }

  if ('locales' in data && (typeof data.locales !== 'object' || data.locales === null)) {
    throw new ValidationError('SEO config "locales" must be an object map.', path);
  }

  if ('ats' in data && (typeof data.ats !== 'object' || data.ats === null)) {
    throw new ValidationError('SEO config "ats" must be an object.', path);
  }

  return data;
}

async function loadSeoConfig() {
  const data = await fetchYaml(SEO_CONFIG.path);
  return validateSeoConfig(data, SEO_CONFIG.path);
}

function getSeoSettingsForLocale(localeCode) {
  if (!seoMetadata || typeof seoMetadata !== 'object') {
    return {};
  }
  const siteConfig = seoMetadata.site || {};
  const locales = seoMetadata.locales || {};
  const defaultLocale = seoMetadata.default_locale;
  const defaultOverrides = defaultLocale ? locales[defaultLocale] : null;
  const localeOverrides = localeCode ? locales[localeCode] : null;
  let merged = mergeNestedConfigs({}, siteConfig);
  merged = mergeNestedConfigs(merged, defaultOverrides);
  merged = mergeNestedConfigs(merged, localeOverrides);
  return merged;
}

function getAtsSettingsForLocale(localeCode) {
  if (!seoMetadata || typeof seoMetadata !== 'object' || !seoMetadata.ats) {
    return {};
  }
  const atsLocales = seoMetadata.ats.locales || {};
  const defaultLocale = seoMetadata.ats.default_locale;
  const defaultOverrides = defaultLocale ? atsLocales[defaultLocale] : null;
  const localeOverrides = localeCode ? atsLocales[localeCode] : null;
  let merged = mergeNestedConfigs({}, defaultOverrides || {});
  merged = mergeNestedConfigs(merged, localeOverrides || {});
  return merged;
}

function getAtsHeadings(localeCode) {
  const settings = getAtsSettingsForLocale(localeCode);
  const sections = settings.sections || {};
  return {
    summary: sections.summary || 'SUMMARY',
    experience: sections.experience || 'EXPERIENCE',
    education: sections.education || 'EDUCATION',
    courses: sections.courses || 'COURSES & CERTIFICATIONS',
    skills: sections.skills || 'SKILLS',
    tech_stack: sections.tech_stack || 'TECHNOLOGIES',
    languages: sections.languages || 'LANGUAGES',
    interests: sections.interests || 'INTERESTS',
  };
}

function renderLocaleSwitcher(locales, activeCode) {
  const container = document.getElementById('language-switcher');
  if (!container) return;

  container.innerHTML = '';
  container.setAttribute('aria-label', activeLabels.language_switcher);

  locales.forEach((locale) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'language-switcher__option';
    button.dataset.locale = locale.code;
    button.textContent = locale.label;
    if (locale.code === activeCode) {
      button.classList.add('language-switcher__option--active');
    }
    button.addEventListener('click', () => {
      if (locale.code !== activeLocaleCode && !languageSwitcherBusy) {
        applyLocale(locale.code);
      }
    });
    container.appendChild(button);
  });

  updateLanguageSwitcherState();
}

function setLanguageSwitcherBusy(state) {
  languageSwitcherBusy = state;
  updateLanguageSwitcherState();
}

function updateLanguageSwitcherState() {
  const container = document.getElementById('language-switcher');
  if (!container) return;

  container.classList.toggle('language-switcher--busy', languageSwitcherBusy);
  const buttons = container.querySelectorAll('button');
  buttons.forEach((button) => {
    const isActive = button.dataset.locale === activeLocaleCode;
    button.disabled = languageSwitcherBusy || isActive;
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function applyLabels(labels) {
  setText('summary-heading', labels.summary_heading);
  setText('github-activity-heading', labels.github_activity_heading);
  setText('experience-heading', labels.experience_heading);
  setText('education-heading', labels.education_heading);
  setText('courses-heading', labels.courses_heading);
  setText('personal-info-heading', labels.personal_info_heading);
  setText('skills-heading', labels.skills_heading);
  setText('tech-stack-heading', labels.tech_stack_heading);
  setText('languages-heading', labels.languages_heading);
  setText('interests-heading', labels.interests_heading);
  setText('faq-heading', labels.faq_heading);
  setText('edit-view-button', labels.edit_button_label);
  setText('download-ats-button', labels.ats_download_label);
  setText('admin-logout-button', labels.save_button_label);
  updateAdminSectionLabels();
  updateViewModeBadge();
}

function renderResume(data, options = {}) {
  if (!data || typeof data !== 'object') {
    return;
  }

  const name = data.name ?? '';
  const role = data.role ?? '';
  if (name) {
    document.title = role ? `${name} · ${role}` : name;
  }

  setText('brand-initials', data.brand_initials ?? 'LM');
  setText('name', name);
  setText('role', role);
  setText('summary', (data.summary || '').trim());

  currentProfile = data;
  currentSectionData = extractSectionData(data);

  renderFaq(data);
  updateMetaTags(data, activeLocaleCode);
  updateStructuredData(data, activeLocaleCode);
  updateAtsButtonState(data);

  if (options.skipVisibilityInit) {
    reconcileItemVisibilityWithCurrentData();
  } else {
    initializeItemVisibilitySets();
  }

  const experienceItems = getVisibleItems('experience', currentSectionData.experience);
  renderTimeline('experience-list', experienceItems, {
    headingKey: 'company',
    subheadingKey: 'role',
    highlightKey: 'highlights',
  });
  toggleSectionVisibility('experience', experienceItems.length > 0);

  const educationItems = getVisibleItems('education', currentSectionData.education);
  renderTimeline('education-list', educationItems, {
    headingKey: 'school',
    detailKey: 'detail',
  });
  toggleSectionVisibility('education', educationItems.length > 0);

  const courseItems = getVisibleItems('courses', currentSectionData.courses);
  renderTimeline('courses-list', courseItems, {
    headingKey: 'name',
    customPeriod: (course) => (course.year ? String(course.year) : ''),
  });
  toggleSectionVisibility('courses', courseItems.length > 0);

  renderContactList('contact-list', data.contact || []);
  renderQrList('qr-list', data.qr_codes || []);

  const skillItems = getVisibleItems('skills', currentSectionData.skills);
  renderMeters('skills-list', skillItems, {});
  toggleSectionVisibility('skills', skillItems.length > 0);

  const languageItems = getVisibleItems('languages', currentSectionData.languages);
  renderMeters('languages-list', languageItems, { showLevelText: true });
  toggleSectionVisibility('languages', languageItems.length > 0);

  const techStackItems = getVisibleItems('tech-stack', currentSectionData['tech-stack']);
  renderPills('tech-stack', techStackItems);
  toggleSectionVisibility('tech-stack', techStackItems.length > 0);

  const interestItems = getVisibleItems('interests', currentSectionData.interests);
  renderPills('interests-list', interestItems);
  toggleSectionVisibility('interests', interestItems.length > 0);

  renderGithubActivity(data.github_activity);

  if (adminUnlocked) {
    refreshAdminDynamicUI();
  }
}

function setText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element && typeof text === 'string') {
    element.textContent = text;
  }
}

function renderTimeline(containerId, items, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  items.forEach((item) => {
    const wrapper = document.createElement('article');
    wrapper.className = 'timeline-item';

    const period = document.createElement('div');
    period.className = 'timeline-item__period';
    period.textContent = formatPeriod(item.period, options.customPeriod, item);
    wrapper.appendChild(period);

    const content = document.createElement('div');
    content.className = 'timeline-item__content';

    const heading = document.createElement('h3');
    heading.textContent = item[options.headingKey] || '';
    content.appendChild(heading);

    if (options.subheadingKey && item[options.subheadingKey]) {
      const subheading = document.createElement('p');
      subheading.className = 'timeline-item__subheading';
      subheading.textContent = item[options.subheadingKey];
      content.appendChild(subheading);
    }

    if (options.highlightKey && Array.isArray(item[options.highlightKey])) {
      const list = document.createElement('ul');
      list.className = 'item-list';
      item[options.highlightKey].forEach((highlight) => {
        const listItem = document.createElement('li');
        listItem.textContent = highlight;
        list.appendChild(listItem);
      });
      content.appendChild(list);
    }

    if (options.detailKey && item[options.detailKey]) {
      const detailParagraph = document.createElement('p');
      detailParagraph.className = 'timeline-item__detail';
      detailParagraph.textContent = item[options.detailKey];
      content.appendChild(detailParagraph);
    }

    wrapper.appendChild(content);
    container.appendChild(wrapper);
  });
}

function renderContactList(containerId, contacts) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  contacts.forEach((item) => {
    const term = document.createElement('dt');
    term.textContent = item.label;
    const definition = document.createElement('dd');
    const formattedValue = formatContactValue(item.value || '', item.label || '');
    if (item.link) {
      const link = document.createElement('a');
      link.href = item.link;
      link.innerHTML = formattedValue;
      if (item.link.startsWith('http')) {
        link.target = '_blank';
        link.rel = 'noreferrer noopener';
      }
      definition.appendChild(link);
    } else {
      definition.innerHTML = formattedValue;
    }
    container.appendChild(term);
    container.appendChild(definition);
  });
}

function renderQrList(containerId, codes) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  codes.forEach((code) => {
    const figure = document.createElement('figure');
    figure.className = 'qr-card';
    const img = document.createElement('img');
    img.src = code.image;
    img.alt = code.label;
    const baseSize = typeof code.size === 'number' ? code.size : 140;
    const constrainedSize = Math.min(Math.max(baseSize, 60), 200);
    img.style.width = `${constrainedSize}px`;
    img.style.height = `${constrainedSize}px`;
    img.style.margin = '0 auto';
    const caption = document.createElement('figcaption');
    caption.textContent = code.label;
    figure.appendChild(img);
    figure.appendChild(caption);
    container.appendChild(figure);
  });
}

function renderMeters(containerId, items, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const steps = 5;
  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'meter-item';

    const label = document.createElement('div');
    label.className = 'meter-item__label';
    const title = document.createElement('span');
    title.textContent = item.name;
    label.appendChild(title);

    if (options.showLevelText && item.level_text) {
      const note = document.createElement('span');
      note.className = 'meter-item__note';
      note.textContent = item.level_text;
      label.appendChild(note);
    }

    const meter = document.createElement('div');
    meter.className = 'meter';
    for (let i = 0; i < steps; i += 1) {
      const dot = document.createElement('span');
      dot.className = 'meter__dot';
      if (i < (item.level || 0)) {
        dot.classList.add('meter__dot--active');
      }
      meter.appendChild(dot);
    }

    row.appendChild(label);
    row.appendChild(meter);
    container.appendChild(row);
  });
}

function renderPills(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  items.forEach((item) => {
    const pill = document.createElement('li');
    pill.textContent = item;
    container.appendChild(pill);
  });
}

function buildFaqEntries(profile) {
  if (!profile) return [];
  const entries = [];
  const name = profile.name || 'This professional';
  const preset = LANGUAGE_PRESETS[activeLocaleCode] || LANGUAGE_PRESETS.en;
  const faqLabels = preset.faq;
  const summarySentence = extractFirstSentence(profile.summary || '');
  const contactItems = Array.isArray(profile.contact) ? profile.contact : [];
  const location = findContactValue(contactItems, (item) => String(item.label || '').toLowerCase().includes('location'));
  const emailLink = findContactLink(contactItems, 'mailto:');
  const email = emailLink ? emailLink.replace(/^mailto:/, '') : '';
  const linkedinLink = findContactValue(contactItems, (item) => typeof item.link === 'string' && item.link.includes('linkedin.com'));
  const techStack = Array.isArray(profile.tech_stack) ? profile.tech_stack.filter(Boolean).slice(0, 5).join(', ') : '';

  if (profile.role || summarySentence) {
    entries.push({
      question: formatTemplate(faqLabels.roleQuestion, { name }),
      answer:
        summarySentence ||
        formatTemplate(faqLabels.roleFallback, {
          name,
          role: profile.role || 'product leadership roles',
        }),
    });
  }

  if (location) {
    entries.push({
      question: formatTemplate(faqLabels.locationQuestion, { name }),
      answer: formatTemplate(faqLabels.locationAnswer, { name, location }),
    });
  }

  if (email || linkedinLink) {
    const parts = [];
    if (email) parts.push(`email ${email}`);
    if (linkedinLink) parts.push(`LinkedIn ${linkedinLink}`);
    const connector = faqLabels.contactConnector || ', ';
    const channels = parts.join(connector);
    entries.push({
      question: formatTemplate(faqLabels.contactQuestion, { name }),
      answer: formatTemplate(faqLabels.contactAnswerPrefix, { name, channels }),
    });
  }

  if (techStack) {
    entries.push({
      question: formatTemplate(faqLabels.toolsQuestion, { name }),
      answer: formatTemplate(faqLabels.toolsAnswer, { name, tools: techStack }),
    });
  }

  return entries;
}

function updateFaqStructuredData(entries) {
  const script = document.getElementById('faq-structured-data');
  if (!script) return;
  if (!Array.isArray(entries) || !entries.length) {
    script.textContent = '';
    return;
  }

  const faqPayload = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer,
      },
    })),
  };

  script.textContent = JSON.stringify(faqPayload, null, 2);
}

function renderFaq(profile) {
  const container = document.getElementById('faq-list');
  const section = document.getElementById('faq-section');
  if (!container) return;
  container.innerHTML = '';
  const entries = buildFaqEntries(profile);
  if (!entries.length) {
    if (section) {
      section.hidden = true;
    }
    updateFaqStructuredData([]);
    return;
  }

  if (section) {
    section.hidden = false;
  }

  entries.forEach((entry, index) => {
    const details = document.createElement('details');
    if (index === 0) {
      details.open = true;
    }
    const summary = document.createElement('summary');
    summary.textContent = entry.question;
    const answer = document.createElement('p');
    answer.textContent = entry.answer;
    details.appendChild(summary);
    details.appendChild(answer);
    container.appendChild(details);
  });

  updateFaqStructuredData(entries);
}

function updateAtsButtonState(profile) {
  const button = document.getElementById('download-ats-button');
  if (!button) return;
  button.disabled = !profile;
}

function initAtsExport() {
  const button = document.getElementById('download-ats-button');
  if (!button) return;
  button.addEventListener('click', () => {
    if (!currentProfile) return;
    const text = buildAtsPlainText(currentProfile, activeLocaleCode);
    if (!text) return;
    if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      console.warn('Current environment does not support file downloads.');
      return;
    }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const nameSlug = slugify(currentProfile.name || 'resume');
    link.download = `${nameSlug}-resume.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 750);
  });
}

function buildAtsPlainText(profile, localeCode) {
  if (!profile) return '';
  const lines = [];
  const headings = getAtsHeadings(localeCode);
  const contactItems = Array.isArray(profile.contact) ? profile.contact : [];
  const location = findContactValue(contactItems, (item) => String(item.label || '').toLowerCase().includes('location'));
  const emailLink = findContactLink(contactItems, 'mailto:');
  const phoneLink = findContactLink(contactItems, 'tel:');
  const otherLinks = collectSameAsLinks(contactItems);

  if (profile.name) {
    lines.push(profile.name);
  }
  if (profile.role) {
    lines.push(profile.role);
  }

  const contactParts = [];
  if (location) contactParts.push(location);
  if (phoneLink) contactParts.push(phoneLink.replace(/^tel:/, ''));
  if (emailLink) contactParts.push(emailLink.replace(/^mailto:/, ''));
  contactParts.push(...otherLinks);
  if (contactParts.length) {
    lines.push(contactParts.join(' | '));
  }

  lines.push('');

  if (profile.summary) {
    lines.push(headings.summary);
    lines.push(condenseWhitespace(profile.summary));
    lines.push('');
  }

  if (Array.isArray(profile.experience) && profile.experience.length) {
    lines.push(headings.experience);
    profile.experience.forEach((item) => {
      const headerParts = [item.period, item.role, item.company].filter(Boolean);
      if (headerParts.length) {
        lines.push(headerParts.join(' | '));
      }
      if (Array.isArray(item.highlights)) {
        item.highlights.forEach((highlight) => {
          lines.push(`- ${condenseWhitespace(highlight)}`);
        });
      }
      lines.push('');
    });
  }

  if (Array.isArray(profile.education) && profile.education.length) {
    lines.push(headings.education);
    profile.education.forEach((item) => {
      const headerParts = [item.period, item.school].filter(Boolean);
      if (headerParts.length) {
        lines.push(headerParts.join(' | '));
      }
      if (item.detail) {
        lines.push(condenseWhitespace(item.detail));
      }
      lines.push('');
    });
  }

  if (Array.isArray(profile.courses) && profile.courses.length) {
    lines.push(headings.courses);
    profile.courses.forEach((course) => {
      const entry = [course.year, course.name].filter(Boolean).join(' | ');
      lines.push(entry);
    });
    lines.push('');
  }

  if (Array.isArray(profile.skills) && profile.skills.length) {
    lines.push(headings.skills);
    lines.push(profile.skills.map((item) => item?.name).filter(Boolean).join(', '));
    lines.push('');
  }

  if (Array.isArray(profile.tech_stack) && profile.tech_stack.length) {
    lines.push(headings.tech_stack);
    lines.push(profile.tech_stack.join(', '));
    lines.push('');
  }

  if (Array.isArray(profile.languages) && profile.languages.length) {
    lines.push(headings.languages);
    lines.push(profile.languages.map((item) => `${item?.name}${item?.level_text ? ` (${item.level_text})` : ''}`).filter(Boolean).join(', '));
    lines.push('');
  }

  if (Array.isArray(profile.interests) && profile.interests.length) {
    lines.push(headings.interests);
    lines.push(profile.interests.join(', '));
    lines.push('');
  }

  const text = lines.join('\n').replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function formatPeriod(periodText, customFormatter, item) {
  if (typeof customFormatter === 'function') {
    const customValue = customFormatter(item);
    return customValue || '';
  }
  if (!periodText) return '';
  const parts = String(periodText).split('–').map((part) => part.trim());
  if (parts.length <= 1) return parts[0];
  return `${parts[0]}\n${parts.slice(1).join(' – ')}`;
}

function formatContactValue(value) {
  if (!value) return '';
  let formatted = value;
  if (value.includes('@')) {
    formatted = value.replace('@', '@<wbr>');
  } else if (value.toLowerCase().includes('linkedin.com/in/')) {
    formatted = value.replace('in/', 'in/<wbr>');
  }
  return formatted;
}

function renderGithubActivity(activity) {
  const card = document.getElementById('github-activity-card');
  if (!card) return;

  if (!activity || !activity.image) {
    card.style.display = 'none';
    return;
  }

  card.style.display = '';
  const heading = card.querySelector('h2');
  if (activity.label && heading) {
    heading.textContent = activity.label;
  }

  const image = document.getElementById('github-activity-image');
  image.src = activity.image;
  image.alt = activity.label || 'GitHub activity heatmap';

  const link = document.getElementById('github-activity-link');
  if (activity.profile) {
    link.href = activity.profile;
    link.style.pointerEvents = '';
    link.style.cursor = '';
  } else {
    link.removeAttribute('href');
    link.style.pointerEvents = 'none';
    link.style.cursor = 'default';
  }
}

function showError(error) {
  console.error(error);
  const resume = document.querySelector('.resume');
  if (!resume) return;
  const errorBanner = document.querySelector('.error-banner') || document.createElement('div');
  errorBanner.className = 'error-banner';
  const detail = error instanceof ValidationError ? error.message : error?.message || 'Unexpected error occurred.';
  errorBanner.textContent = `Something went wrong while loading the resume. ${detail}`;
  if (!errorBanner.isConnected) {
    resume.appendChild(errorBanner);
  }
}

function initNavbarBehaviour() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const threshold = 20;

  function onScroll() {
    const currentScroll = window.scrollY;
    if (currentScroll > threshold) {
      hero.classList.add('hero--scrolled');
    } else {
      hero.classList.remove('hero--scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
}

function extractSectionData(data) {
  return {
    experience: Array.isArray(data.experience) ? data.experience : [],
    education: Array.isArray(data.education) ? data.education : [],
    courses: Array.isArray(data.courses) ? data.courses : [],
    skills: Array.isArray(data.skills) ? data.skills : [],
    'tech-stack': Array.isArray(data.tech_stack) ? data.tech_stack : [],
    languages: Array.isArray(data.languages) ? data.languages : [],
    interests: Array.isArray(data.interests) ? data.interests : [],
  };
}

function ensureActiveConfigSection() {
  // Keep the admin section selection aligned with available configuration slots.
  if (!CONFIGURABLE_SECTIONS.length) {
    activeConfigSectionId = '';
    return activeConfigSectionId;
  }
  const hasActive = CONFIGURABLE_SECTIONS.some((section) => section.id === activeConfigSectionId);
  if (!hasActive) {
    activeConfigSectionId = CONFIGURABLE_SECTIONS[0].id;
  }
  return activeConfigSectionId;
}

function applyVisibilityChange(sectionId, updater, options = {}) {
  // Centralizes visibility updates to keep storage, UI, and resume rendering in sync.
  if (!sectionId) {
    return;
  }
  const items = currentSectionData[sectionId] || [];
  const currentSet = itemVisibilityMap.get(sectionId) || new Set(createFullIndexArray(items.length));
  const nextSet = updater(new Set(currentSet), items.length, items) || new Set();
  itemVisibilityMap.set(sectionId, nextSet);
  persistItemVisibility();
  syncPresetSelectionFromVisibility();
  if (options.refreshDetail !== false && sectionId === activeConfigSectionId) {
    renderSectionDetail(activeConfigSectionId);
  }
  renderResume(currentProfile, { skipVisibilityInit: true });
}

function initializeItemVisibilitySets() {
  itemVisibilityMap = new Map();
  const storedSnapshot = loadStoredItemVisibility();
  const preset = getPresetById(activePresetId) || DEFAULT_PRESET;
  const snapshot = activePresetId === ADMIN_CONFIG.customPresetId ? storedSnapshot : preset.visibility;
  applyVisibilitySnapshot(snapshot);
}

function reconcileItemVisibilityWithCurrentData() {
  CONFIGURABLE_SECTIONS.forEach((section) => {
    const items = currentSectionData[section.id] || [];
    const existing = itemVisibilityMap.get(section.id);
    const normalized = normalizeIndexArray(Array.from(existing || []), items.length);
    itemVisibilityMap.set(section.id, new Set(normalized));
  });
  persistItemVisibility();
}

function getVisibleItems(sectionId, items) {
  if (!Array.isArray(items) || !CONFIGURABLE_SECTIONS.some((section) => section.id === sectionId)) {
    return items || [];
  }
  const visibleSet = itemVisibilityMap.get(sectionId);
  if (!visibleSet) {
    return items || [];
  }
  return items.filter((_, index) => visibleSet.has(index));
}

function toggleSectionVisibility(sectionId, hasContent) {
  const definition = SECTION_DEFINITIONS.find((section) => section.id === sectionId);
  if (!definition) return;
  const element = document.querySelector(definition.selector);
  if (!element) return;
  element.hidden = !hasContent && definition.configurable;
}

function restoreAdminState() {
  let persisted = false;
  try {
    persisted = window.localStorage?.getItem(ADMIN_CONFIG.storageKeys.unlocked) === '1';
    if (!ADMIN_CONFIG.password && persisted) {
      window.localStorage?.removeItem(ADMIN_CONFIG.storageKeys.unlocked);
      persisted = false;
    }
  } catch (error) {
    persisted = false;
  }

  adminUnlocked = Boolean(persisted && isEditorView && ADMIN_CONFIG.password);

  const storedPresets = loadStoredPresets();
  adminPresets = [DEFAULT_PRESET, ...storedPresets];

  const urlPreset = new URL(window.location.href).searchParams.get(ADMIN_CONFIG.presetQueryParam);
  const storedActive = loadStoredActivePreset();
  const presetFromUrl = getPresetById(urlPreset);

  if (presetFromUrl) {
    activePresetId = presetFromUrl.id;
  } else if (storedActive && getPresetById(storedActive)) {
    activePresetId = storedActive;
  } else {
    activePresetId = DEFAULT_PRESET.id;
  }
}

function loadStoredPresets() {
  try {
    const raw = window.localStorage?.getItem(ADMIN_CONFIG.storageKeys.presets);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    return parsed
      .map((preset) => ({
        id: String(preset?.id || '').trim(),
        name: String(preset?.name || '').trim() || 'Preset',
        visibility: sanitizeVisibilitySnapshot(preset?.visibility || {}),
      }))
      .filter((preset) => preset.id && !seen.has(preset.id) && seen.add(preset.id));
  } catch (error) {
    return [];
  }
}

function loadStoredActivePreset() {
  try {
    return window.localStorage?.getItem(ADMIN_CONFIG.storageKeys.activePreset) || '';
  } catch (error) {
    return '';
  }
}

function refreshAdminLoginState() {
  if (!adminLoginFormState) return;

  const {
    passwordInput,
    submitButton,
    errorElement,
    defaultErrorMessage,
    disabledMessage,
  } = adminLoginFormState;

  const passwordConfigured = Boolean(ADMIN_CONFIG.password);
  if (!passwordConfigured) {
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.disabled = true;
    }
    if (submitButton) {
      submitButton.disabled = true;
    }
    if (errorElement) {
      errorElement.textContent = disabledMessage;
      errorElement.hidden = false;
    }
    return;
  }

  if (passwordInput) {
    passwordInput.disabled = false;
    if (document.activeElement !== passwordInput) {
      focusElement(passwordInput);
    }
  }
  if (submitButton) {
    submitButton.disabled = false;
  }
  if (errorElement) {
    errorElement.textContent = defaultErrorMessage;
    errorElement.hidden = true;
  }
}

function loadStoredItemVisibility() {
  try {
    const raw = window.localStorage?.getItem(ADMIN_CONFIG.storageKeys.items);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return sanitizeVisibilitySnapshot(parsed || {});
  } catch (error) {
    return {};
  }
}

function sanitizeVisibilitySnapshot(snapshot) {
  const result = {};
  CONFIGURABLE_SECTIONS.forEach((section) => {
    const rawList = Array.isArray(snapshot?.[section.id]) ? snapshot[section.id] : [];
    const cleaned = [];
    rawList.forEach((value) => {
      const index = Number(value);
      if (Number.isInteger(index) && index >= 0) {
        cleaned.push(index);
      }
    });
    result[section.id] = Array.from(new Set(cleaned)).sort((a, b) => a - b);
  });
  return result;
}

function normalizeIndexArray(list, length) {
  const normalized = new Set();
  list.forEach((value) => {
    const index = Number(value);
    if (Number.isInteger(index) && index >= 0 && index < length) {
      normalized.add(index);
    }
  });
  return Array.from(normalized.values()).sort((a, b) => a - b);
}

function initAdminPanel() {
  const loginForm = document.getElementById('admin-login-form');
  const panel = document.getElementById('admin-panel');
  const errorElement = document.getElementById('admin-login-error');
  if (!loginForm || !panel) return;

  const submitButton = loginForm.querySelector('button[type="submit"]');
  const passwordInput = loginForm.querySelector('input[name="password"]');
  const defaultErrorMessage = errorElement && typeof errorElement.textContent === 'string'
    ? (errorElement.textContent.trim() || 'Incorrect password. Try again.')
    : 'Incorrect password. Try again.';
  const disabledMessage = 'Editor login disabled. Configure the ADMIN_PASSWORD environment variable.';

  adminLoginFormState = {
    form: loginForm,
    submitButton,
    passwordInput,
    errorElement,
    defaultErrorMessage,
    disabledMessage,
  };

  if (passwordInput && !passwordInput.dataset.handlerBound) {
    passwordInput.dataset.handlerBound = 'true';
    passwordInput.addEventListener('input', () => {
      if (errorElement && !errorElement.hidden && errorElement.textContent !== disabledMessage) {
        errorElement.textContent = defaultErrorMessage;
        errorElement.hidden = true;
      }
    });
  }

  refreshAdminLoginState();

  if (adminUnlocked) {
    unlockAdminPanel();
  }

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!ADMIN_CONFIG.password) {
      if (errorElement) {
        errorElement.textContent = disabledMessage;
        errorElement.hidden = false;
      }
      loginForm.reset();
      return;
    }
    const formData = new FormData(loginForm);
    const password = (formData.get('password') || '').toString().trim();
    if (password === ADMIN_CONFIG.password) {
      try {
        window.localStorage?.setItem(ADMIN_CONFIG.storageKeys.unlocked, '1');
      } catch (storageError) {
        // ignore
      }
      adminUnlocked = true;
      unlockAdminPanel();
      if (errorElement) {
        errorElement.hidden = true;
      }
    } else if (errorElement) {
      errorElement.textContent = defaultErrorMessage;
      errorElement.hidden = false;
      focusElement(passwordInput);
    }
    loginForm.reset();
  });
}

function unlockAdminPanel() {
  const loginForm = document.getElementById('admin-login-form');
  const accessSection = document.getElementById('admin-access');
  const panel = document.getElementById('admin-panel');
  const panelSection = document.getElementById('admin-config');
  if (accessSection) {
    accessSection.hidden = true;
  }
  if (loginForm) {
    loginForm.hidden = true;
  }
  if (panelSection) {
    panelSection.hidden = false;
  }
  if (panel) {
    panel.hidden = false;
  }

  ensureActiveConfigSection();

  updateViewModeBadge();
  updateLogoutButtonVisibility();

  if (isEditorView) {
    const layout = document.querySelector('.layout');
    if (layout) {
      layout.hidden = true;
    }
  }

  renderPresetOptions();
  updatePresetButtonsState();
  renderSectionSelection();
  renderSectionDetail(activeConfigSectionId);

  const resetButton = document.getElementById('reset-visibility-button');
  if (resetButton && !resetButton.dataset.handlerBound) {
    resetButton.dataset.handlerBound = 'true';
    resetButton.addEventListener('click', () => {
      CONFIGURABLE_SECTIONS.forEach((section) => {
        const items = currentSectionData[section.id] || [];
        itemVisibilityMap.set(section.id, new Set(createFullIndexArray(items.length)));
      });
      persistItemVisibility();
      activePresetId = DEFAULT_PRESET.id;
      saveActivePreset(activePresetId);
      updatePresetQueryParam(activePresetId);
      renderPresetOptions();
      updatePresetButtonsState();
      renderSectionSelection();
      renderSectionDetail(activeConfigSectionId);
      renderResume(currentProfile, { skipVisibilityInit: true });
    });
  }

  const saveButton = document.getElementById('preset-save-button');
  if (saveButton && !saveButton.dataset.handlerBound) {
    saveButton.dataset.handlerBound = 'true';
    saveButton.addEventListener('click', saveNewPreset);
  }

  const updateButton = document.getElementById('preset-update-button');
  if (updateButton && !updateButton.dataset.handlerBound) {
    updateButton.dataset.handlerBound = 'true';
    updateButton.addEventListener('click', updateExistingPreset);
  }

  const deleteButton = document.getElementById('preset-delete-button');
  if (deleteButton && !deleteButton.dataset.handlerBound) {
    deleteButton.dataset.handlerBound = 'true';
    deleteButton.addEventListener('click', deletePreset);
  }

  const selectAllButton = document.getElementById('section-detail-select-all');
  if (selectAllButton && !selectAllButton.dataset.handlerBound) {
    selectAllButton.dataset.handlerBound = 'true';
    selectAllButton.addEventListener('click', handleDetailSelectAll);
  }

  const clearButton = document.getElementById('section-detail-clear');
  if (clearButton && !clearButton.dataset.handlerBound) {
    clearButton.dataset.handlerBound = 'true';
    clearButton.addEventListener('click', handleDetailClear);
  }

  focusFirstAdminControl();
}

function initLogoutButton() {
  if (!isEditorView) return;
  const button = document.getElementById('admin-logout-button');
  if (!button || button.dataset.handlerBound) return;
  button.dataset.handlerBound = 'true';
  button.addEventListener('click', handleAdminLogout);
  updateLogoutButtonVisibility();
}

function updateLogoutButtonVisibility() {
  if (!isEditorView) return;
  const button = document.getElementById('admin-logout-button');
  if (!button) return;
  button.hidden = !adminUnlocked;
}

function handleAdminLogout() {
  try {
    window.localStorage?.removeItem(ADMIN_CONFIG.storageKeys.unlocked);
  } catch (error) {
    // ignore
  }
  adminUnlocked = false;
  updateLogoutButtonVisibility();
  updateViewModeBadge();

  const panel = document.getElementById('admin-panel');
  const panelSection = document.getElementById('admin-config');
  const accessSection = document.getElementById('admin-access');
  const loginForm = document.getElementById('admin-login-form');
  if (panel) {
    panel.hidden = true;
  }
  if (panelSection) {
    panelSection.hidden = true;
  }
  if (accessSection) {
    accessSection.hidden = false;
  }
  if (loginForm) {
    loginForm.hidden = false;
    loginForm.reset();
  }

  if (isEditorView) {
    const layout = document.querySelector('.layout');
    if (layout) {
      layout.hidden = false;
    }
  }

  const currentPath = window.location.pathname || '';
  const targetPath = currentPath.replace(/user\.html$/, 'index.html');
  window.location.href = targetPath === currentPath ? '/index.html' : targetPath;
}

function renderSectionSelection() {
  const form = document.getElementById('section-select-form');
  if (!form || !adminUnlocked) return;
  form.innerHTML = '';

  if (!CONFIGURABLE_SECTIONS.length) {
    return;
  }

  const activeSectionId = ensureActiveConfigSection();

  CONFIGURABLE_SECTIONS.forEach((section) => {
    const label = document.createElement('label');
    label.className = 'admin-section-option';
    label.dataset.sectionSelect = section.id;

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'admin-section';
    radio.value = section.id;
    radio.className = 'admin-section-option__input';
    radio.checked = section.id === activeSectionId;
    radio.addEventListener('change', handleSectionRadioChange);

    const text = document.createElement('span');
    text.className = 'admin-section-option__label';
    text.textContent = getSectionDisplayName(section);

    label.appendChild(radio);
    label.appendChild(text);
    form.appendChild(label);
  });
}

function renderSectionDetail(sectionId) {
  const panel = document.getElementById('section-detail-panel');
  const title = document.getElementById('section-detail-title');
  const form = document.getElementById('section-detail-form');
  if (!panel || !title || !form) return;

  const definition = CONFIGURABLE_SECTIONS.find((section) => section.id === sectionId);
  if (!definition || !adminUnlocked) {
    panel.hidden = true;
    form.innerHTML = '';
    return;
  }

  const items = currentSectionData[sectionId] || [];
  let visibleSet = itemVisibilityMap.get(sectionId);
  if (!visibleSet) {
    visibleSet = new Set(createFullIndexArray(items.length));
    itemVisibilityMap.set(sectionId, visibleSet);
    persistItemVisibility();
  }

  panel.hidden = false;
  title.textContent = getSectionDisplayName(definition);
  form.innerHTML = '';

  if (!items.length) {
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = 'No items available for this section.';
    emptyMessage.className = 'admin-panel__note';
    form.appendChild(emptyMessage);
    return;
  }

  items.forEach((item, index) => {
    const row = document.createElement('label');
    row.className = 'admin-detail-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'admin-detail-item__checkbox';
    checkbox.checked = visibleSet.has(index);
    checkbox.dataset.section = sectionId;
    checkbox.dataset.index = String(index);
    checkbox.addEventListener('change', handleDetailCheckboxChange);

    const text = document.createElement('span');
    text.className = 'admin-detail-item__label';
    text.textContent = formatSectionItemLabel(sectionId, item, index);

    row.appendChild(checkbox);
    row.appendChild(text);
    form.appendChild(row);
  });
}

function handleSectionRadioChange(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.type !== 'radio') return;
  activeConfigSectionId = input.value;
  renderSectionDetail(activeConfigSectionId);
}

function handleDetailCheckboxChange(event) {
  const checkbox = event.target;
  if (!(checkbox instanceof HTMLInputElement)) return;
  const sectionId = checkbox.dataset.section;
  const index = Number(checkbox.dataset.index);
  if (!sectionId || Number.isNaN(index)) return;

  applyVisibilityChange(sectionId, (visibility) => {
    if (checkbox.checked) {
      visibility.add(index);
    } else {
      visibility.delete(index);
    }
    return visibility;
  }, { refreshDetail: false });
}

function handleDetailSelectAll() {
  const sectionId = ensureActiveConfigSection();
  if (!sectionId) return;
  applyVisibilityChange(sectionId, (_, length) => new Set(createFullIndexArray(length)));
}

function handleDetailClear() {
  const sectionId = ensureActiveConfigSection();
  if (!sectionId) return;
  applyVisibilityChange(sectionId, () => new Set());
}

function refreshAdminDynamicUI() {
  if (!adminUnlocked) return;
  ensureActiveConfigSection();
  renderSectionSelection();
  renderSectionDetail(activeConfigSectionId);
  renderPresetOptions();
  highlightActivePresetOption();
  updatePresetButtonsState();
}

function getSectionDisplayName(section) {
  const element = document.querySelector(`${section.selector} .section-title h2`);
  if (element && element.textContent) {
    return element.textContent.trim();
  }
  return section.fallbackLabel;
}

function updateAdminSectionLabels() {
  if (!adminUnlocked) return;
  ensureActiveConfigSection();
  renderSectionSelection();
  renderSectionDetail(activeConfigSectionId);
}

function updateViewModeBadge() {
  const badge = document.getElementById('public-view-badge');
  if (!badge) return;
  const usePrivateBadge = adminUnlocked && isEditorView;
  const labelKey = usePrivateBadge ? 'private_view_badge' : 'public_view_badge';
  const text = activeLabels[labelKey] || FALLBACK_LABELS[labelKey];
  badge.textContent = text;
  badge.dataset.viewMode = usePrivateBadge ? 'private' : 'public';
}

function formatSectionItemLabel(sectionId, item, index) {
  switch (sectionId) {
    case 'experience': {
      const parts = [item.role, item.company].filter(Boolean);
      return parts.length ? parts.join(' · ') : `Experience ${index + 1}`;
    }
    case 'education': {
      const parts = [item.school, item.detail].filter(Boolean);
      return parts.length ? parts.join(' · ') : `Education ${index + 1}`;
    }
    case 'courses': {
      const parts = [item.year, item.name].filter(Boolean);
      return parts.length ? parts.join(' · ') : `Course ${index + 1}`;
    }
    case 'skills':
      return item.name || `Skill ${index + 1}`;
    case 'tech-stack':
      return item || `Tech ${index + 1}`;
    case 'languages':
      return item.name || `Language ${index + 1}`;
    case 'interests':
      return item || `Interest ${index + 1}`;
    default:
      return `Item ${index + 1}`;
  }
}

function createFullIndexArray(length) {
  return Array.from({ length }, (_, index) => index);
}

function collectVisibilitySnapshot() {
  const snapshot = {};
  CONFIGURABLE_SECTIONS.forEach((section) => {
    const items = currentSectionData[section.id] || [];
    const set = itemVisibilityMap.get(section.id) || new Set(createFullIndexArray(items.length));
    snapshot[section.id] = Array.from(set.values()).sort((a, b) => a - b);
  });
  return snapshot;
}

function persistItemVisibility() {
  const snapshot = collectVisibilitySnapshot();
  try {
    window.localStorage?.setItem(ADMIN_CONFIG.storageKeys.items, JSON.stringify(snapshot));
  } catch (error) {
    // ignore persistence failures
  }
}

function syncPresetSelectionFromVisibility() {
  const snapshot = collectVisibilitySnapshot();
  const matchingPreset = findMatchingPreset(snapshot);
  if (matchingPreset) {
    activePresetId = matchingPreset.id;
    saveActivePreset(activePresetId);
    updatePresetQueryParam(activePresetId);
  } else {
    activePresetId = ADMIN_CONFIG.customPresetId;
    saveActivePreset(activePresetId);
    updatePresetQueryParam('');
  }
  updatePresetButtonsState();
  highlightActivePresetOption();
}

function findMatchingPreset(snapshot) {
  return adminPresets.find((preset) => snapshotsEqual(snapshot, preset.visibility));
}

function snapshotsEqual(leftSnapshot, rightSnapshot) {
  return CONFIGURABLE_SECTIONS.every((section) => {
    const items = currentSectionData[section.id] || [];
    const allIndexes = createFullIndexArray(items.length);
    const left = normalizeIndexArray(leftSnapshot[section.id] ?? allIndexes, items.length);
    const right = normalizeIndexArray(rightSnapshot[section.id] ?? allIndexes, items.length);
    return arraysEqual(left, right);
  });
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function renderPresetOptions() {
  const select = document.getElementById('preset-select');
  if (!select || !adminUnlocked) return;
  const currentValue = select.value;
  select.innerHTML = '';

  adminPresets.forEach((preset) => {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.name;
    select.appendChild(option);
  });

  if (activePresetId === ADMIN_CONFIG.customPresetId) {
    const option = document.createElement('option');
    option.value = ADMIN_CONFIG.customPresetId;
    option.textContent = 'Custom selection';
    select.appendChild(option);
  }

  select.value = activePresetId;
  if (select.value !== activePresetId) {
    select.value = currentValue;
  }

  select.onchange = handlePresetSelectChange;
}

function highlightActivePresetOption() {
  const select = document.getElementById('preset-select');
  if (!select || !adminUnlocked) return;
  if (activePresetId === ADMIN_CONFIG.customPresetId && !select.querySelector(`option[value="${ADMIN_CONFIG.customPresetId}"]`)) {
    const option = document.createElement('option');
    option.value = ADMIN_CONFIG.customPresetId;
    option.textContent = 'Custom selection';
    select.appendChild(option);
  }
  select.value = activePresetId;
}

function handlePresetSelectChange(event) {
  const select = event.target;
  if (!(select instanceof HTMLSelectElement)) return;
  const preset = getPresetById(select.value);
  if (!preset) {
    activePresetId = ADMIN_CONFIG.customPresetId;
    updatePresetButtonsState();
    return;
  }

  activePresetId = preset.id;
  saveActivePreset(activePresetId);
  updatePresetQueryParam(activePresetId);
  applyVisibilitySnapshot(preset.visibility);
  renderSectionSelection();
  renderSectionDetail(activeConfigSectionId);
  renderPresetOptions();
  updatePresetButtonsState();
  renderResume(currentProfile, { skipVisibilityInit: true });
}

function getPresetById(id) {
  if (!id) return undefined;
  return adminPresets.find((preset) => preset.id === id);
}

function applyVisibilitySnapshot(snapshot) {
  CONFIGURABLE_SECTIONS.forEach((section) => {
    const items = currentSectionData[section.id] || [];
    const normalized = normalizeIndexArray(snapshot?.[section.id] ?? createFullIndexArray(items.length), items.length);
    itemVisibilityMap.set(section.id, new Set(normalized));
  });
  persistItemVisibility();
}

// Preset name dialog state and helpers
let presetNameDialogElements = null;

function ensurePresetNameDialog() {
  if (presetNameDialogElements) {
    return presetNameDialogElements;
  }

  const overlay = document.createElement('div');
  overlay.className = 'preset-name-dialog-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '10000';

  const dialog = document.createElement('div');
  dialog.className = 'preset-name-dialog';
  dialog.style.backgroundColor = '#fff';
  dialog.style.borderRadius = '4px';
  dialog.style.padding = '16px';
  dialog.style.maxWidth = '400px';
  dialog.style.width = '100%';
  dialog.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';

  const title = document.createElement('h2');
  title.textContent = 'Preset name';
  title.style.margin = '0 0 8px';

  const label = document.createElement('label');
  label.textContent = 'Enter a name for this preset:';
  label.style.display = 'block';
  label.style.marginBottom = '4px';

  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 50;
  input.style.width = '100%';
  input.style.boxSizing = 'border-box';
  input.style.marginBottom = '4px';

  const hint = document.createElement('div');
  hint.textContent = 'Max 50 characters.';
  hint.style.fontSize = '12px';
  hint.style.color = '#666';
  hint.style.marginBottom = '4px';

  const error = document.createElement('div');
  error.style.color = '#c00';
  error.style.fontSize = '12px';
  error.style.minHeight = '16px';
  error.style.marginBottom = '8px';

  const buttons = document.createElement('div');
  buttons.style.display = 'flex';
  buttons.style.justifyContent = 'flex-end';
  buttons.style.gap = '8px';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.textContent = 'Save';

  buttons.appendChild(cancelBtn);
  buttons.appendChild(saveBtn);

  dialog.appendChild(title);
  dialog.appendChild(label);
  dialog.appendChild(input);
  dialog.appendChild(hint);
  dialog.appendChild(error);
  dialog.appendChild(buttons);

  overlay.appendChild(dialog);

  presetNameDialogElements = {
    overlay,
    dialog,
    input,
    error,
    cancelBtn,
    saveBtn,
  };

  return presetNameDialogElements;
}

function openPresetNameDialog() {
  const { overlay, input, error, cancelBtn, saveBtn } = ensurePresetNameDialog();

  return new Promise((resolve) => {
    let resolved = false;

    function cleanup() {
      if (overlay.parentNode) {
        document.body.removeChild(overlay);
      }
      cancelBtn.removeEventListener('click', onCancel);
      saveBtn.removeEventListener('click', onSave);
      overlay.removeEventListener('click', onOverlayClick);
      overlay.removeEventListener('keydown', onKeyDown, true);
    }

    function onCancel() {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(null);
    }

    function onSave() {
      const raw = input.value;
      const name = raw.trim();
      if (!name) {
        error.textContent = 'Name cannot be empty.';
        return;
      }
      if (name.length > 50) {
        error.textContent = 'Name must be at most 50 characters.';
        return;
      }
      error.textContent = '';
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(name);
    }

    function onOverlayClick(event) {
      if (event.target === overlay) {
        onCancel();
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        onSave();
      }
    }

    input.value = '';
    error.textContent = '';

    document.body.appendChild(overlay);
    input.focus();

    cancelBtn.addEventListener('click', onCancel);
    saveBtn.addEventListener('click', onSave);
    overlay.addEventListener('click', onOverlayClick);
    overlay.addEventListener('keydown', onKeyDown, true);
  });
}

function saveNewPreset() {
  openPresetNameDialog().then((name) => {
    if (!name) {
      return;
    }
    const snapshot = collectVisibilitySnapshot();
    const id = generatePresetId(name);
    const newPreset = { id, name, visibility: snapshot };
    adminPresets = [DEFAULT_PRESET, ...adminPresets.filter((preset) => preset.id !== DEFAULT_PRESET.id && preset.id !== id), newPreset];
    persistPresets();
    activePresetId = id;
    saveActivePreset(activePresetId);
    updatePresetQueryParam(activePresetId);
    renderPresetOptions();
    updatePresetButtonsState();
  });
}

function updateExistingPreset() {
  if (activePresetId === DEFAULT_PRESET.id || activePresetId === ADMIN_CONFIG.customPresetId) {
    return;
  }
  const preset = getPresetById(activePresetId);
  if (!preset) return;
  preset.visibility = collectVisibilitySnapshot();
  persistPresets();
  renderPresetOptions();
  updatePresetButtonsState();
}

function deletePreset() {
  if (activePresetId === DEFAULT_PRESET.id || activePresetId === ADMIN_CONFIG.customPresetId) {
    return;
  }
  adminPresets = [DEFAULT_PRESET, ...adminPresets.filter((preset) => preset.id !== DEFAULT_PRESET.id && preset.id !== activePresetId)];
  persistPresets();
  activePresetId = DEFAULT_PRESET.id;
  saveActivePreset(activePresetId);
  updatePresetQueryParam(activePresetId);
  applyVisibilitySnapshot(DEFAULT_PRESET.visibility);
  renderPresetOptions();
  updatePresetButtonsState();
  renderSectionSelection();
  renderSectionDetail(activeConfigSectionId);
  renderResume(currentProfile, { skipVisibilityInit: true });
}

function persistPresets() {
  const customPresets = adminPresets.filter((preset) => preset.id !== DEFAULT_PRESET.id);
  try {
    window.localStorage?.setItem(ADMIN_CONFIG.storageKeys.presets, JSON.stringify(customPresets));
  } catch (error) {
    // ignore persistence failures
  }
}

if (typeof window !== 'undefined') {
  window.__ADMIN_TEST_HOOKS = {
    focusElement,
    focusFirstAdminControl,
    refreshAdminLoginState,
    setAdminPassword(value) {
      ADMIN_CONFIG.password = value;
    },
    getAdminPassword() {
      return ADMIN_CONFIG.password;
    },
    initAdminPanel,
    setAdminLoginFormState(state) {
      adminLoginFormState = state;
    },
    getAdminLoginFormState() {
      return adminLoginFormState;
    },
  };
}

function saveActivePreset(id) {
  try {
    if (id) {
      window.localStorage?.setItem(ADMIN_CONFIG.storageKeys.activePreset, id);
    } else {
      window.localStorage?.removeItem(ADMIN_CONFIG.storageKeys.activePreset);
    }
  } catch (error) {
    // ignore persistence failures
  }
}

function updatePresetButtonsState() {
  if (!adminUnlocked) return;
  const updateButton = document.getElementById('preset-update-button');
  const deleteButton = document.getElementById('preset-delete-button');

  const canModify = activePresetId !== DEFAULT_PRESET.id && activePresetId !== ADMIN_CONFIG.customPresetId;
  if (updateButton) {
    updateButton.disabled = !canModify;
  }
  if (deleteButton) {
    deleteButton.disabled = !canModify;
  }
}

function updatePresetQueryParam(id) {
  const url = new URL(window.location.href);
  if (id && id !== DEFAULT_PRESET.id) {
    url.searchParams.set(ADMIN_CONFIG.presetQueryParam, id);
  } else {
    url.searchParams.delete(ADMIN_CONFIG.presetQueryParam);
  }
  window.history.replaceState({}, '', url.toString());
}

function generatePresetId(name) {
  const baseSlug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const base = baseSlug || 'preset';
  let candidate = base;
  let index = 1;
  while (getPresetById(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

