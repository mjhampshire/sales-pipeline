# Sales Pipeline Tracker

A web application for tracking and reporting sales pipeline with a spreadsheet-like interface.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

This will start both the backend (port 3001) and frontend (port 5173).

3. Open http://localhost:5173 in your browser.

## Features

- **Spreadsheet-like Interface**: Inline editing for all fields
- **Sortable Columns**: Click any column header to sort
- **Dropdown Fields**: Partners, Platforms, Products, and Deal Stages
- **Status Colors**: Won (green), Active (blue), Keep Warm (yellow), Lost (red)
- **Weighted Forecast**: Auto-calculated based on deal value and stage probability
- **Settings Modal**: Manage lists and deal stages with probabilities

## Tech Stack

- Frontend: React 18 + Vite
- Backend: Node.js + Express
- Database: SQLite (sql.js)
