# NPPES NPI Registry - Data Extractor

A production-ready Next.js web application that takes an Excel/CSV file containing State, NPI Type, and Taxonomy Description, queries the NPPES API for each row, and returns a new downloadable Excel file enriched with:
- NPI Number
- Organization Name
- Authorized Official First Name, Last Name, Title, and Phone
- Match Status & Details

## Features
- **Server-side processing**: Excel parsing and API queries map securely on the server.
- **Smart Matching**: Does a best-effort match using the Taxonomy Description field against the NPPES registry.
- **Vercel Ready**: Easily deployable to Vercel with zero config.

## Requirements
- Node.js 18.x or later

## Local Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Example Input Format
Your uploaded Excel or CSV should contain columns named similar to:
- `State` (e.g., MD)
- `NPI Type` (1, 2, Individual, Organization)
- `Taxonomy Description` (e.g., Audiologist, Assisted Living Facility)

The app handles flexible column names (e.g. `Type` vs `NPI Type`, `Taxonomy` vs `Taxonomy Description`).

## Rate Limiting Note
The NPPES API has limits on how many requests can be processed. This app includes a small delay between row queries to prevent IP blocking. For massive spreadsheets, it is recommended to split them into chunks if deploying on serverless environments with strict execution timeouts (like Vercel Hobby tier).
