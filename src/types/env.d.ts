// src/types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    GEMINI_API_KEY: string
    NEXT_PUBLIC_SUPABASE_URL: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  }
}
