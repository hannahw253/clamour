@AGENTS.md

# Clamour

A shared repair record for renters, tagline "for habitable homes". Groups (shared house, building, union branch) with owner, admin and submitter roles, dated evidence, legal clocks per UK nation, and letters.

## Sources of truth

Read the relevant document before building a feature, and update it before changing behaviour it describes.

- Architecture north star (stack, data model, roles, evidence, security, rules, API, screens, delivery, decision log): https://claude.ai/artifact/7aRSrcsVib6AhcaJ3eLXPp
- Product plan: https://claude.ai/artifact/K7BmPNto7oVSeHPMDYLNPt
- Development plan and roadmap: https://claude.ai/artifact/6Z37uSDyd3q4HY3eY81GNm
- Brand kit (tokens, logo, components, voice): https://claude.ai/artifact/VK4prKiihtJyQU8FbWWrFi

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind CSS 4) on Vercel, functions in London (`lhr1`).
- Supabase project `clamour` in London (`eu-west-2`), ref `lwuwfouenpncfuzcagqp`. Permissions live in row-level security.
- Fonts are self-hosted from `@fontsource` packages; no requests to Google from visitors.

## Ways of working

- The owner (Hannah) does not code. Every change is a pull request from a branch, with a plain-English summary, screenshots at phone and desktop width, and Vercel's preview link. The owner merges.
- Run `npm run lint`, `npm run typecheck` and `npm run build` before pushing.
- Never commit secrets. `.env.local` is ignored; `.env.example` lists the variable names.

## Brand rules that affect code

- Colours come from the tokens in `src/app/globals.css` (from the design system's `tokens.json`); never hard-code a hex in a component.
- `font-display` (Anton) is for uppercase headlines only; everything else is `font-sans` (Archivo); `font-mono` (IBM Plex Mono) only for timestamps, fingerprints and IDs.
- One yellow (`signal`) primary action per screen. No warning tape or hazard stripes.
- Plain British English; talk to "you" and "your group"; status always has a word, never colour alone; touch targets at least 44px.
