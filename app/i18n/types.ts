export type AppLocaleOption = {
  code: string;
  name: string;
  nativeName: string;
};

export type AppDictionary = {
  meta: { description: string };
  common: { loading: string; close: string; save: string; cancel: string };
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
  };
  landing: {
    hero: {
      eyebrow: string;
      title_before: string;
      title_connector: string;
      title_after: string;
      rotating_words: string[];
      lead: string[];
      primary_action: string;
      secondary_action: string;
      benefits: string[];
    };
    sample: {
      eyebrow: string;
      title: string;
      description: string;
      loading_aria: string;
      open_aria: string;
      iframe_title: string;
      timeout: string;
      timeout_action: string;
    };
    model: {
      eyebrow: string;
      title: string;
      description: string;
      cards: Array<{
        tag: string;
        chip: string;
        chip_type: "t" | "a";
        title: string;
        copy: string;
      }>;
    };
    cta: {
      eyebrow: string;
      title: string;
      description: string;
      primary_action: string;
      secondary_action: string;
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
    modes: Record<"signup" | "reset" | "new_password" | "signin", {
      eyebrow: string;
      title: string;
      lead: string;
      alternate_label: string;
      alternate_action: string;
    }>;
    fields: { email: string; password: string; new_password: string };
    actions: Record<string, string>;
    signup: Record<string, string>;
    messages: Record<string, string>;
  };
  sample_resume: { title: string; description: string; loading: string };
};

export type AppI18nContextValue = {
  locale: string;
  locales: AppLocaleOption[];
  dictionary: AppDictionary;
};
