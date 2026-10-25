# Prakash Pariwar Market Mates

# PROJECT: PRAKASH PARIWAR — COMPLETE WEBSITE UI

Build a complete, modern, responsive SaaS web application called **Prakash Pariwar** for manufacturers and retailers.

This is one unified application with a public landing page, a Manufacturer dashboard, a Retailer dashboard, and a role-switching system.

## 1. DESIGN REFERENCES

### Retailer Dashboard Reference
Website: https://brandmirror.socialsolicitor.tech/#contact

Study this website as the primary visual reference for the Retailer Home page. If accessible, examine its layout, spacing, colors, navigation, banners, template cards, horizontal carousels, categories and browsing experience.

The Retailer dashboard should closely follow its overall visual structure and interaction patterns while using Prakash Pariwar branding and our own content. Do not copy BrandMirror's logo or misrepresent its identity.

### Manufacturer Dashboard Reference
Use the attached reference image (Prakash Pariwar Festive Retail Dashboard) to guide the styling, layout, dark navy sidebar, gold flame/lotus branding, cards, carousels, typography, and visual hierarchy.

Follow the reference image as closely as practical while ensuring responsive behavior and consistent Prakash Pariwar branding.

### Shared Design Rules
- Use the attached reference image and BrandMirror reference.
- Keep the two dashboards visually appropriate to their separate purposes.
- Create a consistent component system for buttons, typography, spacing, cards, icons and responsive layouts.
- Use realistic sample data and attractive template preview images.
- Do not use a generic admin template if it conflicts with the references.

## 2. PUBLIC LANDING PAGE

Create a premium public-facing landing page for Prakash Pariwar.

Include:
- Navbar with logo placeholder, Home, Features, Templates, About, Login and Get Started.
- Hero section explaining how manufacturers and retailers can collaborate through ready-to-use marketing templates.
- Strong headline, supporting text and CTA buttons.
- Product preview showing sample social media templates.
- Benefits for manufacturers and retailers.
- How It Works section.
- Final CTA and footer.

Use a polished SaaS design with responsive layouts. The public landing page must be separate from the logged-in dashboards.

## 3. USER ROLES AND ROLE SWITCHER

There are exactly two application roles:
1. Manufacturer
2. Retailer

One user account can have either role or both roles.

When a user has both roles, show a role-switching dropdown in the top-right profile menu:
- Manufacturer
- Retailer

Selecting a role should change the active dashboard without requiring another login.

If a user has only one role, show only that role and do not offer an unavailable role.

The interface must clearly indicate the currently active role. Preserve the signed-in user's session when switching roles.

Do not create a third application role such as Admin.

## 4. RETAILER DASHBOARD

Create a template-discovery and marketing-content home page inspired by the reference:

### Header & Sidebar
- Prakash Pariwar logo with flame/lotus badge.
- Sidebar with Home, Templates, My Creatives, Campaigns, Calendar, Brand Kit, Profile, Help & Support.
- Bottom sidebar promo card: "Create Engage Grow - Branded content made easy for your business."
- Top bar with global template/festival search, notifications, profile with role switch dropdown ("Sharma Electronics - Retailer").

### Retailer Home Sections
1. **Hero Banner Carousel**: Promotional sliding banners (e.g. Diwali festive offers, home happiness, special offers badge, "Create Your Festive Post" CTA, navigation arrows and dots).
2. **Search and Quick Categories**: Filter and search templates.
3. **Trending Templates**: Horizontally scrollable cards (Diwali Offer, Home Appliances, Navratri Collection, Monsoon Offer, Kitchen Appliances, New Arrivals).
4. **Browse by Category**: Category pills/cards with icons (All, Festival, Products, Offers, New Arrivals, Seasonal, Social Media, Business).
5. **New Templates**: Horizontal scrollable carousel (New Year Offer, Winter Essentials, Republic Day, Samsung Offer, Holi Special, Summer Collection).
6. **Recommended for You**: Tailored recommendations based on retailer business type.
7. **Saved Templates & My Downloads**: Bookmarked templates and quick download/export options.
8. **Template Modal / Customizer Preview**: Clicking a template opens a modal with preview, customization options (retailer name, phone number, address watermark), and download mock.

## 5. MANUFACTURER DASHBOARD

The Manufacturer dashboard should provide tools to manage the manufacturer's brand content and retailer network:

### Main Navigation & Sections
1. **Overview / Dashboard**: Key metrics (total templates, published templates, draft templates, total retailers, pending invitations), recent activity, campaign summaries, upcoming scheduled content.
2. **Brand Profile / Brand Kit**: Brand name, logo upload preview, brand colors, fonts, contact details, brand identity guidelines.
3. **Templates Management**: Listing/grid with search, status filters (draft, published, archived), create/edit/preview controls.
4. **Template Editor**: Clean editing UI with template preview, title, category, media/content, text and CTA fields, logo placement, and save/publish actions.
5. **Campaigns & Content Calendar**: Campaign listings, schedule dates, visual calendar view for planned festive and product launches.
6. **Retailer Management**: Retailer network list, invitation status, invite retailer modal, copy invitation link UI.
7. **Analytics**: Template usage, retailer adoption, top performing festival creatives.
8. **Notifications & Settings**: Account preferences and alerts.

## 6. TECHNICAL & DESIGN QUALITY
- High fidelity matching the attached Prakash Pariwar reference dashboard (deep slate/navy sidebars, crisp white surfaces, vibrant festive banner graphics, clean badges and typography).
- Responsive on desktop, tablet, and mobile.
- Rich mock data with realistic Indian festival and retail product creatives (Diwali, Holi, Navratri, Republic Day, appliances, electronics).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://prakash-pariwar-market-mates.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dc930b5f-cc6f-4cdc-bad2-827c49db77f6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Vite uses port `8080` by default and selects the next available port (such as `8081`) if it is occupied. This is a local development URL, not the deployed website.

For a built preview, run:

```sh
npm run build
npm run preview
```

The build uses the Nitro Cloudflare preset and writes its worker entry to `.output/server/index.mjs`. The preview script runs Wrangler against `.output`; do not use `vite preview`, which expects a different `dist/server/server.js` entry and returns HTTP 500 for this build.

## Templates system (rebuilt)

The Templates / creatives feature is generated programmatically — there are no
stock template images. One deterministic engine is the single source of truth for
the manufacturer's picker, the editor, the retailer's preview and the exported PNG.

### How it works
- **Engine** (`src/lib/templateEngine/`): a template is a pure JSON `TemplateSpec`
  (`types.ts`) rendered to responsive SVG (`render.ts`) and rasterised to PNG
  client-side (`export.ts`). `layouts.ts` × `palettes.ts` × per-category motifs are
  combined by `generator.ts` to produce **30 visually distinct designs** per
  category (10 layouts × 3 palettes). `catalog.ts` holds the festival / season
  metadata with 2026-27 dates and orders the grid by soonest upcoming.
- **Placeholders** (`fit.ts`): every template carries manufacturer blocks
  (business name, logo, phone, business email) and retailer blocks (business name,
  logo, phone, email, address). They auto-fill from the signed-in profiles
  (`brandFromProfile`), long text shrinks/wraps to fit, optional empty blocks
  collapse, and everything stays inside the canvas safe area.
- **Editing**: manufacturers drag/resize any placeholder and tweak copy, colour,
  background variant and canvas size (`edit.ts`, `PlaceholderEditor.tsx`); those
  positions are saved with the template. A retailer can only nudge **their own**
  blocks before download (`TemplateViewer.tsx`).
- **Data layer** (`src/lib/designerTemplates.ts` + `templateQueries.ts`): all
  multi-table actions run as atomic `SECURITY DEFINER` RPCs — save, save-then-send,
  save-then-publish, bulk send, mark-seen, record-download. Reads are gated by RLS
  so a retailer only sees templates that were sent to them or published by a
  manufacturer they are **actively** linked to; unlinking a retailer cuts access
  immediately. TanStack Query invalidation refreshes both feeds after a write.

### Adding a festival or season
1. Add one entry to `CATEGORIES` in `src/lib/templateEngine/catalog.ts` — pick a
   `key`, `label`, `kind` (`"festival"` or `"season"`), the next `date`
   (`yyyy-mm-dd`), an `emblem` + `motifs` (see `MotifId` in `types.ts`), 3+
   existing `paletteIds` (`palettes.ts`) and a `copy` bank.
2. Mirror the same row in the `template_categories` seed block of
   `supabase/migrations/202610250001_rebuilt_template_system.sql` (the save RPC
   validates `category_key` against that table). Ship it as a **new forward
   migration**, never by editing an applied version.
3. The grid, the 30-design picker and the editor pick the new category up
   automatically — no per-template artwork required.

> Note: the migration in `supabase/migrations/` must be applied to the Supabase
> project (`kwmakeexlzjdhjtkefvh`) for the templates UI to read/write live data.

