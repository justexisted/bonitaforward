Missing tables (optional Admin features)
--------------------------------------

Create these if you want Owner Change Requests and Job Posts to work:

```sql
create extension if not exists pgcrypto;

create table if not exists provider_change_requests (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null,
  owner_user_id uuid not null,
  type text not null check (type in ('update','delete','feature_request','claim')),
  changes jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  reason text,
  created_at timestamptz default now(),
  decided_at timestamptz
);

create table if not exists provider_job_posts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null,
  owner_user_id uuid not null,
  title text not null,
  description text,
  apply_url text,
  salary_range text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','archived')),
  created_at timestamptz default now(),
  decided_at timestamptz
);
```

Environment setup
-----------------

Create a local env file (not committed):

1) Copy `.env.example` to `.env.local` and fill in values:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GOOGLE_CLIENT_ID=
VITE_ADMIN_EMAILS=
```

2) Do NOT commit secrets. Ensure your gitignore ignores env files.

3) In production (Netlify/Vercel), set environment variables in the dashboard.

Server-only keys
----------------

`SUPABASE_SERVICE_ROLE` must only be set on the serverless platform environment (e.g., Netlify) and must never be exposed in browser `.env` (avoid any `VITE_` prefix for it).

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
