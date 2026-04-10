declare global {
  interface Window {
    jsyaml?: {
      load: (source: string) => unknown;
      dump: (value: unknown, options?: Record<string, unknown>) => string;
    };
  }
}

export {};
