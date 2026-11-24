---
name: design-md
description: >-
  Loads a ready-made DESIGN.md (a plain-markdown design system) from VoltAgent/awesome-design-md,
  a collection of 84 style analyses of well-known product sites: Linear, Stripe, Vercel, Notion,
  Apple, Claude, Supabase, Figma, Spotify, Tesla and more. Then it builds UI that follows that
  file's colors, type, spacing, components and do's and don'ts. Use when the user wants a page,
  app or component to "look like", "feel like" or be "in the style of" a known product, asks for a
  DESIGN.md, wants a design system to start from, or names one of the brands in catalog.md.
---

# design-md

A DESIGN.md tells a coding agent how a product should look, the same way AGENTS.md tells it how
to build. Each file in the collection covers visual theme, color roles, typography, component
styles, layout and spacing, elevation, do's and don'ts, responsive behavior and an agent prompt
guide. Newer files also start with YAML front matter that holds the tokens (`colors`,
`typography`, `rounded`, `spacing`, `components`).

`<skill>` is this folder. The source is MIT licensed and pinned to one commit in
`scripts/fetch.sh`.

## Steps

1. **Pick the file.** Match the user's request to a slug in `<skill>/catalog.md`, which is grouped
   by category with a one-line look for each entry. If the user named no brand, suggest two or
   three that fit the product (for example, dev tool: `linear.app`, `vercel`, `raycast`; fintech:
   `stripe`, `mercury`, `wise`; warm editorial: `claude`, `notion`, `cursor`) and ask which one.
   If a DESIGN.md is already in the project root, use that one and skip to step 3.
2. **Fetch it.** Run `bash <skill>/scripts/fetch.sh <slug> DESIGN.md` from the project root.
   The script will not overwrite an existing file; ask before rerunning it with `FORCE=1`. To
   compare candidates without saving them, write to the scratchpad instead of the root. The
   script prints every slug with `--list`.
3. **Read all of it** before writing any UI. Take the front matter tokens as the source of truth
   for values, and the prose sections for how and where to use them.
4. **Turn the tokens into code first:** CSS custom properties, or a Tailwind theme extension if
   the project uses Tailwind. Name them after the file's semantic roles (`--ink`, `--canvas`,
   `--primary`, `--hairline`), not after raw hex values. Write the dark-mode values too if the file
   has them.
5. **Build to the file.** Use its type scale, radii, spacing scale and component states as
   written. Follow its Do's and Don'ts and Responsive Behavior sections. When the file is silent,
   extend it in the same spirit rather than falling back to generic defaults.
6. **Check against the file.** Before finishing, go through the Do's and Don'ts list one item at
   a time and fix anything the build breaks.

## Style, not identity

These files describe how a brand's public site looks. Use them as a reference for style. Build
the user's own product; do not pass it off as the brand:

- Never use the brand's name, logo, wordmark, product names, slogans, copy or imagery in the
  output, unless the user is that brand.
- Proprietary fonts (Söhne, SF Pro, Cal Sans, Kraken-Brand and similar) need a license. Use the
  fallback stack the file lists, or a close free font from Google Fonts, and tell the user which
  substitution you made.
- If the user wants a mix ("Linear's layout with Stripe's colors"), fetch both files into the
  scratchpad, write one merged DESIGN.md that says which parts came from where, and build from
  that.

## Working with design-taste-frontend

When both skills apply, the DESIGN.md decides the visual system (palette, type, radii, spacing,
components), and design-taste-frontend still governs page structure, copy, imagery and its
finish gate. If the two conflict on a visual token, the DESIGN.md wins, because the user chose
that look on purpose.

## Updating the pin

To move to a newer version of the collection, get its HEAD with
`git ls-remote https://github.com/VoltAgent/awesome-design-md HEAD`, put the hash in `REF` in
`scripts/fetch.sh`, and regenerate `catalog.md` from the new README. Any single fetch can also
use another commit with `REF=<commit-or-branch>`.
