export type AppLocaleOption = {
  code: string;
  name: string;
  nativeName: string;
};

export type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  after?: string[];
};

export type LegalDocument = {
  title: string;
  description: string;
  last_updated: string;
  sections: LegalSection[];
};

export type AppDictionary = {
  meta: { description: string };
  common: {
    loading: string;
    close: string;
    save: string;
    cancel: string;
    home: string;
    breadcrumb: string;
    close_notification: string;
  };
  navigation: {
    personal_hub: string;
    dashboard: string;
    sample_cv: string;
    docs: string;
    sign_up: string;
    sign_in: string;
    primary_aria: string;
    open_primary_aria: string;
  };
  language_menu: { aria_label: string };
  theme: { aria_label: string };
  account: {
    open_menu_aria: string;
    actions_aria: string;
    profile: string;
    user_management: string;
    beta_test_mode: string;
    settings: string;
    signing_out: string;
    log_out: string;
    profile_modal: Record<string, string>;
  };
  landing: {
    hero: {
      eyebrow: string;
      title: string[];
      description: string;
      primary_action: string;
      secondary_action: string;
      privacy_note: string;
      process_aria: string;
      process: string[];
    };
    sample: {
      data_note: string;
      open_action: string;
      loading_aria: string;
      open_aria: string;
    };
    animation: {
      title: string;
      description: string;
      detail: string;
      iframe_title: string;
    };
    experience_base: {
      eyebrow: string;
      title: string;
      description: string;
      items: string[];
    };
    how: {
      title: string;
      description: string;
      features: Array<{
        icon: "file" | "globe" | "layers" | "link" | "refresh";
        title: string;
        description: string;
      }>;
    };
    advantages: {
      title: string;
      description: string;
      items: Array<{ title: string; description: string }>;
    };
    languages: {
      eyebrow: string;
      title: string;
      description: string;
    };
    structured_data: {
      eyebrow: string;
      title: string;
      description: string;
      detail: string;
      items: string[];
    };
    privacy: {
      title: string;
      description: string;
      note: string;
      action: string;
    };
    vision: {
      eyebrow: string;
      title: string;
      description: string;
    };
    faq: {
      title: string;
      items: Array<{ id?: string; question: string; answer: string }>;
    };
    cta: {
      title: string;
      description: string;
      primary_action: string;
    };
    footer: {
      sample_resume: string;
      platform: string;
      privacy_policy: string;
      terms: string;
      contact: string;
    };
  };
  auth: {
    contextual: Record<string, string>;
    modes: Record<
      "signup" | "reset" | "new_password" | "signin",
      {
        eyebrow: string;
        title: string;
        lead: string;
        alternate_label: string;
        alternate_action: string;
      }
    >;
    fields: { email: string; password: string; new_password: string };
    actions: Record<string, string>;
    signup: Record<string, string>;
    messages: Record<string, string>;
  };
  dashboard: {
    option_labels: Record<string, string>;
    preset_editor: Record<string, string>;
    preview: Record<string, string>;
    actions: Record<string, string>;
    messages: Record<string, string>;
    main: Record<string, string>;
    library: Record<string, string>;
    delete_modal: Record<string, string>;
    import_modal: Record<string, string>;
    language_modal: Record<string, string>;
    publish_modal: Record<string, string>;
  };
  editor: { text: Record<string, string> };
  admin: { text: Record<string, string> };
  user: { text: Record<string, string> };
  onboarding: { steps: string[]; text: Record<string, string> };
  settings: { text: Record<string, string> };
  legal: {
    privacy: LegalDocument;
    terms: LegalDocument;
  };
  docs: {
    workflow: Record<string, string>;
    title: string;
    home: string;
    help_center: string;
    overview: string;
    topics: string;
    tutorials: string;
    test_scenarios: string;
    menu: string;
    outline: string;
    development: string;
    development_note: string;
    heading: string;
    lead: string;
    search: string;
    placeholder: string;
    results: string;
    clear: string;
    no_results: string;
    start: string;
    first_cv: string;
    first_cv_note: string;
    open_guide: string;
    tools: string;
    choose: string;
    guides: string;
    privacy_tag: string;
    privacy_title: string;
    privacy_note: string;
    privacy_link: string;
    about: string;
    no_docs: string;
    article_fallback: string;
    footer: string;
    master: string;
    version: string;
    published: string;
    master_note: string;
    version_note: string;
    published_note: string;
    topics_content: Array<{ title: string; description: string; label: string }>;
  };
  sample_resume: { title: string; description: string; loading: string };
};

export type AppI18nContextValue = {
  locale: string;
  locales: AppLocaleOption[];
  dictionary: AppDictionary;
};
