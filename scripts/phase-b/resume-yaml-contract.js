"use strict";

const jsyaml = require("../js-yaml.min.js");

const SUPPORTED_LOCALES = new Set(["en", "pl"]);

const REQUIRED_STRING_FIELDS = ["brand_initials", "name", "role", "summary"];
const REQUIRED_ARRAY_FIELDS = [
  "contact",
  "qr_codes",
  "skills",
  "tech_stack",
  "languages",
  "interests",
  "experience",
  "education",
  "courses",
];

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLocale(locale) {
  const normalized = String(locale ?? "en").trim().toLowerCase().replace("_", "-");
  const primary = normalized.split("-")[0] || "en";
  return SUPPORTED_LOCALES.has(primary) ? primary : "en";
}

function toInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampLevel(value, fallback = 3) {
  const parsed = toInteger(value, fallback);
  return Math.min(5, Math.max(1, parsed));
}

function deriveInitials(name) {
  const words = normalizeText(name)
    .split(/\s+/)
    .map((part) => part.replace(/[^a-zA-Z]/g, ""))
    .filter(Boolean);
  if (words.length === 0) {
    return "";
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function normalizeStringList(value) {
  return asArray(value)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function normalizeContactList(value) {
  return asArray(value)
    .map((item) => {
      if (typeof item === "string") {
        return {
          label: "Info",
          value: normalizeText(item),
        };
      }

      const source = asObject(item);
      return {
        label: normalizeText(source.label || source.name),
        value: normalizeText(source.value),
        link: normalizeText(source.link),
      };
    })
    .filter((entry) => entry.label && entry.value)
    .map((entry) => {
      if (!entry.link) {
        return { label: entry.label, value: entry.value };
      }
      return entry;
    });
}

function normalizeQrCodes(value) {
  return asArray(value)
    .map((item) => {
      const source = asObject(item);
      return {
        label: normalizeText(source.label),
        image: normalizeText(source.image),
        size: toInteger(source.size, 130),
      };
    })
    .filter((entry) => entry.label || entry.image);
}

function normalizeSkills(value) {
  return asArray(value)
    .map((item) => {
      if (typeof item === "string") {
        return { name: normalizeText(item), level: 3 };
      }

      const source = asObject(item);
      return {
        name: normalizeText(source.name || source.skill),
        level: clampLevel(source.level, 3),
      };
    })
    .filter((entry) => entry.name);
}

function normalizeLanguages(value) {
  return asArray(value)
    .map((item) => {
      if (typeof item === "string") {
        return { name: normalizeText(item), level_text: "", level: 3 };
      }
      const source = asObject(item);
      return {
        name: normalizeText(source.name),
        level_text: normalizeText(source.level_text || source.levelText || source.level_label),
        level: clampLevel(source.level, 3),
      };
    })
    .filter((entry) => entry.name);
}

function normalizeExperience(value) {
  return asArray(value)
    .map((item) => {
      if (typeof item === "string") {
        return {
          period: "",
          company: normalizeText(item),
          role: "",
          highlights: [],
        };
      }

      const source = asObject(item);
      return {
        period: normalizeText(source.period || source.dates),
        company: normalizeText(source.company || source.organization),
        role: normalizeText(source.role || source.title),
        highlights: normalizeStringList(source.highlights || source.bullets),
      };
    })
    .filter(
      (entry) => entry.period || entry.company || entry.role || (Array.isArray(entry.highlights) && entry.highlights.length > 0),
    );
}

function normalizeEducation(value) {
  return asArray(value)
    .map((item) => {
      if (typeof item === "string") {
        return {
          period: "",
          school: normalizeText(item),
          detail: "",
        };
      }

      const source = asObject(item);
      return {
        period: normalizeText(source.period || source.dates),
        school: normalizeText(source.school || source.institution),
        detail: normalizeText(source.detail || source.degree || source.description),
      };
    })
    .filter((entry) => entry.period || entry.school || entry.detail);
}

function normalizeCourses(value) {
  return asArray(value)
    .map((item) => {
      if (typeof item === "string") {
        return {
          year: 0,
          name: normalizeText(item),
        };
      }

      const source = asObject(item);
      return {
        year: toInteger(source.year, 0),
        name: normalizeText(source.name || source.title),
      };
    })
    .filter((entry) => entry.name);
}

function buildContactFromPersonal(personal) {
  const items = [];
  const location = normalizeText(personal.location);
  const phone = normalizeText(personal.phone);
  const email = normalizeText(personal.email);
  const linkedin = normalizeText(personal.linkedin);
  const website = normalizeText(personal.website || personal.portfolio || personal.site);

  if (location) items.push({ label: "Location", value: location });
  if (phone) items.push({ label: "Phone", value: phone, link: `tel:${phone.replace(/\s+/g, "")}` });
  if (email) items.push({ label: "E-mail", value: email, link: `mailto:${email}` });
  if (linkedin) items.push({ label: "LinkedIn", value: linkedin });
  if (website) items.push({ label: "Portfolio", value: website });
  return items;
}

function createEmptyResumeDocument(name = "") {
  const safeName = normalizeText(name);
  return {
    brand_initials: deriveInitials(safeName),
    name: safeName,
    role: "",
    summary: "",
    contact: [],
    qr_codes: [],
    skills: [],
    tech_stack: [],
    languages: [],
    interests: [],
    experience: [],
    education: [],
    courses: [],
  };
}

function coerceLegacyResumeData(legacyData, options = {}) {
  const source = asObject(legacyData);
  const personal = asObject(source.personal);
  const fallbackName = normalizeText(options.fallbackName);

  const resolvedName =
    normalizeText(source.name) || normalizeText(personal.name) || fallbackName || "New User";

  const normalized = createEmptyResumeDocument(resolvedName);
  normalized.brand_initials = normalizeText(source.brand_initials) || deriveInitials(resolvedName);
  normalized.role = normalizeText(source.role || personal.headline || personal.role);
  normalized.summary = normalizeText(source.summary || personal.summary);

  const contactSource = asArray(source.contact);
  normalized.contact =
    contactSource.length > 0 ? normalizeContactList(contactSource) : buildContactFromPersonal(personal);

  normalized.qr_codes = normalizeQrCodes(source.qr_codes || source.qrCodes);
  normalized.skills = normalizeSkills(source.skills);
  normalized.tech_stack = normalizeStringList(source.tech_stack || source.techStack);
  normalized.languages = normalizeLanguages(source.languages);
  normalized.interests = normalizeStringList(source.interests);
  normalized.experience = normalizeExperience(source.experience);
  normalized.education = normalizeEducation(source.education);
  normalized.courses = normalizeCourses(source.courses);

  return normalized;
}

function validateResumeDocumentShape(input) {
  const doc = asObject(input);
  const errors = [];

  for (const fieldName of REQUIRED_STRING_FIELDS) {
    if (typeof doc[fieldName] !== "string") {
      errors.push(`Expected "${fieldName}" to be a string.`);
    }
  }

  if (!normalizeText(doc.name)) {
    errors.push('Field "name" must not be empty.');
  }

  for (const fieldName of REQUIRED_ARRAY_FIELDS) {
    if (!Array.isArray(doc[fieldName])) {
      errors.push(`Expected "${fieldName}" to be an array.`);
    }
  }

  asArray(doc.contact).forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`contact[${index}] must be an object.`);
      return;
    }
    if (!normalizeText(item.label) || !normalizeText(item.value)) {
      errors.push(`contact[${index}] requires non-empty "label" and "value".`);
    }
    if (item.link !== undefined && typeof item.link !== "string") {
      errors.push(`contact[${index}].link must be a string when provided.`);
    }
  });

  asArray(doc.qr_codes).forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`qr_codes[${index}] must be an object.`);
      return;
    }
    if (!normalizeText(item.label) || !normalizeText(item.image)) {
      errors.push(`qr_codes[${index}] requires non-empty "label" and "image".`);
    }
    if (item.size !== undefined && (!Number.isInteger(item.size) || item.size <= 0)) {
      errors.push(`qr_codes[${index}].size must be a positive integer.`);
    }
  });

  asArray(doc.skills).forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`skills[${index}] must be an object.`);
      return;
    }
    if (!normalizeText(item.name)) {
      errors.push(`skills[${index}] requires non-empty "name".`);
    }
    if (!Number.isInteger(item.level) || item.level < 1 || item.level > 5) {
      errors.push(`skills[${index}].level must be an integer in range 1..5.`);
    }
  });

  asArray(doc.languages).forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`languages[${index}] must be an object.`);
      return;
    }
    if (!normalizeText(item.name)) {
      errors.push(`languages[${index}] requires non-empty "name".`);
    }
    if (item.level_text !== undefined && typeof item.level_text !== "string") {
      errors.push(`languages[${index}].level_text must be a string.`);
    }
    if (!Number.isInteger(item.level) || item.level < 1 || item.level > 5) {
      errors.push(`languages[${index}].level must be an integer in range 1..5.`);
    }
  });

  asArray(doc.tech_stack).forEach((item, index) => {
    if (typeof item !== "string" || !normalizeText(item)) {
      errors.push(`tech_stack[${index}] must be a non-empty string.`);
    }
  });

  asArray(doc.interests).forEach((item, index) => {
    if (typeof item !== "string" || !normalizeText(item)) {
      errors.push(`interests[${index}] must be a non-empty string.`);
    }
  });

  asArray(doc.experience).forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`experience[${index}] must be an object.`);
      return;
    }
    if (item.period !== undefined && typeof item.period !== "string") {
      errors.push(`experience[${index}].period must be a string.`);
    }
    if (item.company !== undefined && typeof item.company !== "string") {
      errors.push(`experience[${index}].company must be a string.`);
    }
    if (item.role !== undefined && typeof item.role !== "string") {
      errors.push(`experience[${index}].role must be a string.`);
    }
    if (item.highlights !== undefined && !Array.isArray(item.highlights)) {
      errors.push(`experience[${index}].highlights must be an array.`);
    }
  });

  asArray(doc.education).forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`education[${index}] must be an object.`);
      return;
    }
    if (item.period !== undefined && typeof item.period !== "string") {
      errors.push(`education[${index}].period must be a string.`);
    }
    if (item.school !== undefined && typeof item.school !== "string") {
      errors.push(`education[${index}].school must be a string.`);
    }
    if (item.detail !== undefined && typeof item.detail !== "string") {
      errors.push(`education[${index}].detail must be a string.`);
    }
  });

  asArray(doc.courses).forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`courses[${index}] must be an object.`);
      return;
    }
    if (item.year !== undefined && (!Number.isInteger(item.year) || item.year < 0)) {
      errors.push(`courses[${index}].year must be a non-negative integer.`);
    }
    if (!normalizeText(item.name)) {
      errors.push(`courses[${index}] requires non-empty "name".`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateResumeYamlContent(yamlContent) {
  if (typeof yamlContent !== "string" || !yamlContent.trim()) {
    return {
      valid: false,
      errors: ["YAML content must be a non-empty string."],
    };
  }

  let parsed;
  try {
    parsed = jsyaml.load(yamlContent);
  } catch (error) {
    return {
      valid: false,
      errors: [`YAML parse error: ${error.message}`],
    };
  }

  return validateResumeDocumentShape(parsed);
}

function serializeResumeDocument(input, options = {}) {
  const normalized = coerceLegacyResumeData(input, options);
  const validation = validateResumeDocumentShape(normalized);
  if (!validation.valid) {
    throw new Error(`Resume schema validation failed: ${validation.errors.join(" | ")}`);
  }

  return jsyaml.dump(normalized, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
    quotingType: '"',
  });
}

module.exports = {
  SUPPORTED_LOCALES,
  createEmptyResumeDocument,
  normalizeLocale,
  coerceLegacyResumeData,
  validateResumeDocumentShape,
  validateResumeYamlContent,
  serializeResumeDocument,
};
