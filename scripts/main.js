const PUBLIC_VIEW = {
  localesConfigPath: 'data/public/locales.yaml',
  storageKey: 'resume-studio:locale',
  defaultLocale: 'en',
};

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
  continuation_template: '{heading} {current}/{total}',
  public_view_badge: 'Public view',
  private_view_badge: 'Private view',
});

const RESOLVED_ADMIN_PASSWORD = (() => {
  if (typeof ADMIN_PASSWORD === 'string') {
    const trimmed = ADMIN_PASSWORD.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof ADMIN_PASSWORD === 'number') {
    return String(ADMIN_PASSWORD);
  }
  return null;
})();

const ADMIN_CONFIG = Object.freeze({
  password: RESOLVED_ADMIN_PASSWORD,
  storageKeys: {
    unlocked: 'resume-studio:admin-unlocked',
    presets: 'resume-studio:presets:v2',
    activePreset: 'resume-studio:active-preset:v2',
    items: 'resume-studio:item-visibility:v1',
  },
  presetQueryParam: 'version',
  customPresetId: '__custom__',
});

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

let currentProfile;

let localeMetadata;
let activeLocaleCode;
let activeLabels = { ...FALLBACK_LABELS };
let localeRequestToken = 0;
let languageSwitcherBusy = false;
let adminUnlocked = false;
let adminPresets = [DEFAULT_PRESET];
let activePresetId = DEFAULT_PRESET.id;
let itemVisibilityMap = new Map();
let currentSectionData = {};
let activeConfigSectionId = '';

const PAGE_CONTEXT = document.body?.dataset.viewMode || 'public';
const isAdminView = PAGE_CONTEXT === 'admin';

document.addEventListener('DOMContentLoaded', () => {
  restoreAdminState();
  initNavbarBehaviour();
  initPublicView();
  initAdminPanel();
  initLogoutButton();
});

async function initPublicView() {
  try {
    localeMetadata = await loadLocalesConfig();
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

  if (raw && Array.isArray(raw.locales)) {
    raw.locales.forEach((entry) => {
      if (!entry) return;
      const code = String(entry.code || '').trim().toLowerCase();
      const resumePath = String(entry.resume_path || '').trim();
      if (!code || !resumePath || map.has(code)) return;
      const normalized = {
        code,
        resumePath,
        label: String(entry.label || code.toUpperCase()),
      };
      map.set(code, normalized);
      locales.push(normalized);
    });
  }

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
    showError(new Error('Selected locale is not available.'));
    return;
  }

  setLanguageSwitcherBusy(true);

  try {
    const raw = await fetchYaml(localeEntry.resumePath);
    if (token !== localeRequestToken) {
      return;
    }

    const {
      labels = {},
      locale: localeTag,
      language_name: languageName,
      ...profile
    } = raw || {};

    activeLabels = { ...FALLBACK_LABELS, ...labels };
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
    }
  }
}

async function fetchYaml(path) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Unable to load resource: ${path}`);
  }
  const text = await response.text();
  return jsyaml.load(text);
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
  errorBanner.textContent = `Something went wrong while loading the resume. ${error.message}`;
  if (!errorBanner.isConnected) {
    resume.appendChild(errorBanner);
  }
}

function initNavbarBehaviour() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  let lastScrollY = window.scrollY;
  const threshold = 20;

  function onScroll() {
    const currentScroll = window.scrollY;
    if (currentScroll > threshold) {
      hero.classList.add('hero--scrolled');
    } else {
      hero.classList.remove('hero--scrolled');
    }
    lastScrollY = Math.max(currentScroll, 0);
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

  adminUnlocked = Boolean(persisted && isAdminView && ADMIN_CONFIG.password);

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
  const defaultErrorMessage = errorElement ? errorElement.textContent : 'Incorrect password. Try again.';
  const disabledMessage = 'Admin login disabled. Configure the ADMIN_PASSWORD environment variable.';

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
  } else {
    if (passwordInput) {
      passwordInput.disabled = false;
    }
    if (submitButton) {
      submitButton.disabled = false;
    }
    if (errorElement) {
      errorElement.textContent = defaultErrorMessage;
      errorElement.hidden = true;
    }
  }

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
    }
    loginForm.reset();
  });
}

function unlockAdminPanel() {
  const loginForm = document.getElementById('admin-login-form');
  const panel = document.getElementById('admin-panel');
  if (loginForm) {
    loginForm.hidden = true;
  }
  if (panel) {
    panel.hidden = false;
  }

  if (!activeConfigSectionId && CONFIGURABLE_SECTIONS.length) {
    activeConfigSectionId = CONFIGURABLE_SECTIONS[0].id;
  }

  updateViewModeBadge();
  updateLogoutButtonVisibility();

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
}

function initLogoutButton() {
  if (!isAdminView) return;
  const button = document.getElementById('admin-logout-button');
  if (!button || button.dataset.handlerBound) return;
  button.dataset.handlerBound = 'true';
  button.addEventListener('click', handleAdminLogout);
  updateLogoutButtonVisibility();
}

function updateLogoutButtonVisibility() {
  if (!isAdminView) return;
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
  const loginForm = document.getElementById('admin-login-form');
  if (panel) {
    panel.hidden = true;
  }
  if (loginForm) {
    loginForm.hidden = false;
    loginForm.reset();
  }

  const currentPath = window.location.pathname || '';
  const targetPath = currentPath.replace(/admin\.html$/, 'index.html');
  window.location.href = targetPath === currentPath ? '/index.html' : targetPath;
}

function renderSectionSelection() {
  const form = document.getElementById('section-select-form');
  if (!form || !adminUnlocked) return;
  form.innerHTML = '';

  if (!CONFIGURABLE_SECTIONS.length) {
    return;
  }

  if (!activeConfigSectionId || !CONFIGURABLE_SECTIONS.some((section) => section.id === activeConfigSectionId)) {
    activeConfigSectionId = CONFIGURABLE_SECTIONS[0].id;
  }

  CONFIGURABLE_SECTIONS.forEach((section) => {
    const label = document.createElement('label');
    label.className = 'admin-section-option';
    label.dataset.sectionSelect = section.id;

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'admin-section';
    radio.value = section.id;
    radio.className = 'admin-section-option__input';
    radio.checked = section.id === activeConfigSectionId;
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

  const items = currentSectionData[sectionId] || [];
  const visibleSet = itemVisibilityMap.get(sectionId) || new Set(createFullIndexArray(items.length));

  if (checkbox.checked) {
    visibleSet.add(index);
  } else {
    visibleSet.delete(index);
  }

  itemVisibilityMap.set(sectionId, new Set(visibleSet));
  persistItemVisibility();
  syncPresetSelectionFromVisibility();
  renderResume(currentProfile, { skipVisibilityInit: true });
}

function handleDetailSelectAll() {
  if (!activeConfigSectionId) return;
  const items = currentSectionData[activeConfigSectionId] || [];
  itemVisibilityMap.set(activeConfigSectionId, new Set(createFullIndexArray(items.length)));
  persistItemVisibility();
  syncPresetSelectionFromVisibility();
  renderSectionDetail(activeConfigSectionId);
  renderResume(currentProfile, { skipVisibilityInit: true });
}

function handleDetailClear() {
  if (!activeConfigSectionId) return;
  itemVisibilityMap.set(activeConfigSectionId, new Set());
  persistItemVisibility();
  syncPresetSelectionFromVisibility();
  renderSectionDetail(activeConfigSectionId);
  renderResume(currentProfile, { skipVisibilityInit: true });
}

function refreshAdminDynamicUI() {
  if (!adminUnlocked) return;
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
  renderSectionSelection();
  renderSectionDetail(activeConfigSectionId);
}

function updateViewModeBadge() {
  const badge = document.getElementById('public-view-badge');
  if (!badge) return;
  const usePrivateBadge = adminUnlocked && isAdminView;
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

