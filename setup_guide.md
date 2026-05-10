# SpesaSmart Setup & Deployment Guide

This guide will help you set up the Supabase database and deploy the SpesaSmart application.

## 1. Supabase Project Setup

1.  **Create a New Project**: Go to [Supabase](https://supabase.com/) and create a new project.
2.  **Database Schema**: Go to the **SQL Editor** and run the contents of [supabase/schema.sql](file:///Users/caganbariscelik/.gemini/antigravity/scratch/spesasmart/supabase/schema.sql).
3.  **Authentication**:
    *   Enable **Email/Password** authentication in the Auth settings.
    *   Create an admin user manually in the Auth table for the dashboard access.

## 2. Configuration

Update the following files with your Supabase credentials (URL and Anon key):
- [public/js/app.js](file:///Users/caganbariscelik/.gemini/antigravity/scratch/spesasmart/public/js/app.js)
- [public/js/admin.js](file:///Users/caganbariscelik/.gemini/antigravity/scratch/spesasmart/public/js/admin.js)

## 3. Data Integration (ETL)

The ETL pipeline processes raw CSV data into a standardized format.

1.  **Prepare Data**: Place raw CSV files in `data/raw/` (e.g., `lidl_prices.csv`).
2.  **Run ETL**: Run `python3 etl.py`. This will create cleaned files in `data/clean/`.
3.  **Import to Supabase**:
    *   Use the Supabase **Table Editor** to import the cleaned CSVs.
    *   Import to `products` first (to establish canonical IDs).
    *   Then import to `store_prices` (linked via `product_id`).

## 4. Deployment

Deploy the `public/` directory to **Vercel**:
1.  Initialize a GitHub repository.
2.  Connect the repository to Vercel.
3.  Set the **Output Directory** to `public`.

## 5. Security

- **Row Level Security (RLS)**: The schema automatically enables RLS, allowing public read and admin-only write.
- **Admin Access**: Only users authenticated via Supabase Auth can modify data in the Admin Dashboard.
