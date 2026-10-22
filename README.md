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
