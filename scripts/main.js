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
});

let currentProfile;

let localeMetadata;
let activeLocaleCode;
let activeLabels = { ...FALLBACK_LABELS };
let localeRequestToken = 0;
let languageSwitcherBusy = false;

document.addEventListener('DOMContentLoaded', () => {
  initNavbarBehaviour();
  initPublicView();
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
  setText('public-view-badge', labels.public_view_badge);
}

function renderResume(data) {
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

  renderTimeline('experience-list', data.experience || [], {
    headingKey: 'company',
    subheadingKey: 'role',
    highlightKey: 'highlights',
  });

  renderTimeline('education-list', data.education || [], {
    headingKey: 'school',
    detailKey: 'detail',
  });

  renderTimeline('courses-list', data.courses || [], {
    headingKey: 'name',
    customPeriod: (course) => (course.year ? String(course.year) : ''),
  });

  renderContactList('contact-list', data.contact || []);
  renderQrList('qr-list', data.qr_codes || []);
  renderMeters('skills-list', data.skills || []);
  renderMeters('languages-list', data.languages || [], { showLevelText: true });
  renderPills('tech-stack', data.tech_stack || []);
  renderGithubActivity(data.github_activity);
  renderPills('interests-list', data.interests || []);
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
    const formattedValue = formatContactValue(item.value || '');
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

