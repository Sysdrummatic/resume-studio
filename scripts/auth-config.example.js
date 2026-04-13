window.RESUME_STUDIO_AUTH_ENV = {
  production: {
    supabaseUrl: 'https://YOUR_PRODUCTION_PROJECT.supabase.co',
    supabaseAnonKey: 'YOUR_PRODUCTION_PUBLIC_ANON_KEY'
  },
  preview: {
    supabaseUrl: 'https://YOUR_TEST_PROJECT.supabase.co',
    supabaseAnonKey: 'YOUR_TEST_PUBLIC_ANON_KEY'
  },
  development: {
    supabaseUrl: 'https://YOUR_TEST_PROJECT.supabase.co',
    supabaseAnonKey: 'YOUR_TEST_PUBLIC_ANON_KEY'
  }
};
