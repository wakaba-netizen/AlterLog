// src/types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    GEMINI_API_KEY: string
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
  }
}
