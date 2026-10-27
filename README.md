# Beyond — Clothing Store E-Commerce Platform

A production-grade, minimalist e-commerce website for the clothing store **Beyond**, crafted in vanilla HTML, CSS, JavaScript, Node.js, Express, and SQLite (`better-sqlite3`).

The frontend faithfully preserves the visual language of `Beyond.html`:
- **Typography:** Custom `Outfit` typeface (400, 500, 600 weight).
- **Color Palette & Themes:** Tailored stone/plaster tones with automatic `prefers-color-scheme: dark` and `data-theme` support.
- **Plaster / Grain Texture:** Multi-octave SVG fractal noise with relief diffuse lighting (`feDiffuseLighting`) and mottling.
- **Dotted Product Tiles:** 4/5 aspect ratio tiles with radial dotted pattern and oversized headline badges.
- **Woven Thread Hero Canvas:** Interactive HTML5 Canvas animation stitching headline typography through oscillating horizontal threads, with `prefers-reduced-motion` accessibility.
- **Safe Area Inset:** Complete mobile notch and home-indicator handling (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`).

---

## Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
Run the live auto-reloading development server directly from the workspace root:
```bash
npm run dev
```

### 3. Production Start
```bash
npm start
```
The application will launch at **`http://localhost:3000`**.

> [!NOTE]
> Seeding (`npm run seed`) is only needed when initializing a brand new empty database. The server automatically checks and auto-seeds on first run if the products table is empty.

---

## Project Structure

```
├── .env                  # Environment configuration (Port, Admin password - git-ignored)
├── .env.example          # Template environment file
├── .gitignore            # Git exclusions (node_modules, .env, *.db-wal, *.db-shm, logs)
├── package.json          # Node.js dependencies & scripts
├── README.md             # Project documentation
├── public/               # Static frontend client
│   ├── index.html        # Home page (Woven thread hero, New arrivals, About facts)
│   ├── shop.html         # Shop page (Category filters: Overshirts, Tees, Pants, Knits)
│   ├── product.html      # Product detail page (Size XS-XL, stock check, add to bag)
│   ├── bag.html          # Shopping bag (Quantity stepper, subtotal, live item counter)
│   ├── checkout.html     # Checkout (Validation, Cash on Delivery, Payment placeholder)
│   ├── confirmation.html # Order confirmation (Order number, shipment breakdown)
│   ├── about.html        # Brand story, philosophy & studio contact
│   ├── returns.html      # 30-day free returns policy & pickup scheduler
│   ├── admin.html        # Password-protected admin inventory & orders dashboard
│   ├── css/
│   │   └── style.css     # Unified stylesheet matching Beyond.html aesthetics
│   ├── js/
│   │   ├── hero.js       # Unchanged woven-thread canvas animation
│   │   ├── cart.js       # LocalStorage shopping bag manager & live counter sync
│   │   ├── api.js        # REST API client wrapper
│   │   ├── carousel.js   # Hero carousel stage controller
│   │   └── main.js       # Page initializers & interactive flows
│   ├── img/
│   │   ├── bg-texture.jpg
│   │   ├── bg-texture-mobile.jpg
│   │   └── hero/*.webp   # Optimized hero cutouts (desktop + mobile)
│   └── uploads/          # Directory for admin-uploaded product photos
├── server/
│   ├── server.js         # Express HTTP server & clean URL routes
│   ├── db.js             # SQLite database connection & schema (better-sqlite3)
│   ├── seed.js           # Database seeding script
│   ├── store.db          # SQLite persistent database file
│   └── routes/
│       ├── products.js   # Products API (filtering, sorting, slug lookup)
│       ├── orders.js     # Orders API (atomic transactions, stock decrement)
│       ├── newsletter.js # Newsletter subscription capture
│       └── admin.js      # Admin authentication, inventory CRUD, file uploads
├── originals/            # Master high-resolution product cutouts
├── backups/              # Safe snapshots & rollback history
│   ├── before-undo/      # Historical stylesheet & carousel snapshots
│   └── pre-reorganization-backup/ # Full pre-reorganization safety backup
└── scratch/              # Verification & diagnostic test suites
```

---

## Features & Pages

| Route | Page | Description |
|---|---|---|
| `/` | **Home** | Animated woven hero canvas, live "New Arrivals" loaded from DB, brand ethos, and newsletter capture. |
| `/shop` | **Shop** | Filterable by category (*All*, *Overshirts*, *Tees*, *Pants*, *Knits*) and sortable by price (Low/High) or newest. |
| `/product/:slug` | **Product** | Large 4/5 visual tile, price in Indian Rupees (`₹`), size selector (XS–XL) with out-of-stock sizes disabled, quantity stepper, and fabric/care details. |
| `/bag` | **Bag** | Live shopping bag with real-time header count sync (`Bag (N)`), line item removal, quantity updates, and subtotal calculation. |
| `/checkout` | **Checkout** | Strict client & server validation on Name, Email, 10-digit Phone, Street Address, City, State, and 6-digit PIN code. Supports Cash on Delivery and Razorpay-ready structure. |
| `/confirmation` | **Confirmation** | Displays confirmation badge, unique order number (e.g. `BYD-2026-XXXXXX`), itemized breakdown, and delivery timeframe. |
| `/about` | **About & Contact** | Small-run production story, fabric specifications, and direct studio messaging. |
| `/returns` | **Returns** | 30-day complimentary return policy and doorstep pickup booking form. |
| `/admin` | **Admin Portal** | Password-protected portal to manage products (add/edit/delete, stock per size, image uploads), review orders, update shipment statuses, and view subscribers. |

---

## Admin Access

- **URL:** `http://localhost:3000/admin`
- **Default Password:** `beyond2026` (configurable via `ADMIN_PASSWORD` in `.env`)

---

## Quality & Standards

- **Zero External UI Frameworks:** 100% Vanilla HTML5, CSS3, and JavaScript.
- **Accessibility:** Semantic elements (`header`, `main`, `footer`, `nav`, `section`), focus visible states, ARIA labels, and `prefers-reduced-motion` compliance.
- **Data Integrity:** SQLite atomic transactions for orders to guarantee stock never over-sells. All queries parameterized to prevent SQL injection.
- **XSS Sanitization:** User inputs sanitized on client and server before storage and rendering.
