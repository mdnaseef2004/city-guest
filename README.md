# GRD — Guest Relation Management Web App

A mobile-first, full-stack Guest Relation Management application built with React (Vite) and Supabase.

## Features

- **Authentication**: Secure login, role-based access control (Super Admin vs. Sub Admin).
- **Dashboard**: Real-time analytics, charts (Recharts), and performance summaries.
- **Guest Entry**: Add new guests with autocomplete for places and purposes. Duplicate detection prevents entering the same guest twice on the same day.
- **Records**: Searchable, filterable data table with pagination.
- **Reports**: Generate Daily, Monthly, Donation, and Sub Admin reports. Export to Excel (`.xlsx`) and CSV.
- **User Management**: Super Admins can add, edit, disable, or delete Sub Admin accounts.
- **Design**: Modern UI with dark mode support, glassmorphism, and responsive layouts.
- **PWA**: Installable as a progressive web app on mobile devices.

---

## 🚀 Setup Instructions

### 1. Supabase Setup

1. Create a new project on [Supabase](https://supabase.com).
2. Go to **SQL Editor** and paste the contents of `supabase/schema.sql`. Run it to create tables, functions, triggers, and Row Level Security (RLS) policies.
3. Go to **Authentication > Providers > Email** and turn **OFF** "Confirm email" (for a smoother admin creation flow in this MVP).
4. Go to **Project Settings > API** to get your URL and Anon Key.

### 2. Super Admin Bootstrap

You must manually create the first Super Admin. 
1. In your app (or Supabase Auth UI), sign up a new user.
2. Go to the Supabase **Table Editor** > `profiles` table.
3. Find your user row and change the `role` from `sub_admin` to `super_admin`.

### 3. Local Development

1. Clone or copy the files to your local machine.
2. Run `npm install` to install dependencies.
3. Rename `.env.example` to `.env` and fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Run `npm run dev` to start the development server.

### 4. Icons & Assets
To complete the PWA setup, generate a logo icon and place it in the `public/icons/` folder with these names:
- `icon-192x192.png`
- `icon-512x512.png`

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, React Router v6
- **Backend & DB**: Supabase (PostgreSQL, Auth)
- **Styling**: Vanilla CSS (Custom Properties, BEM-style)
- **Icons**: Lucide React
- **Charts**: Recharts
- **Exports**: XLSX (SheetJS)

## 📦 Deployment

This is a standard Vite React SPA. You can deploy it easily for free on Vercel or Netlify.

### Vercel
1. Push your code to GitHub.
2. Import the repository in Vercel.
3. Add the Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. Framework Preset: Vite.
5. Deploy.
