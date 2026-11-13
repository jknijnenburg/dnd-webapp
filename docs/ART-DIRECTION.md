# Fantasy game art direction

The interface uses illustrated encounters, a dealt-card inventory, crimson title ribbons,
hanging coin prices, and layered manuscript panels. The same compositions support light
parchment and charcoal parchment via the existing appearance toggle.

## Assets

Optimized original raster artwork lives in `public/images/game/`:

- `merchant-alchemist.webp`: transparent 1000 x 940 character, used as breakout art.
- `market-square.webp`: 1536 x 1024 market backdrop, with an HTML readability veil.
- `item-atlas.webp`: 1254 x 1254 transparent nine-cell atlas. Rows: weapon/armor/potion,
  scroll/ring/wand, wondrous/gear/other. CSS background positions select exact cells.
- `shop-scenes.webp`: 2172 x 724 triptych. Panels: alchemist, forge, curio merchant.

Artwork was created with the built-in image generation tool. Full exact prompts and
source-image paths are recorded in the review deliverable `art-direction-prompts.md`.
WebP files are the production assets; generation originals remain at their source paths.

## Integration

`GameScene` and `game-shell.css` provide shared scene composition and navigation.
`ShopArtwork` maps only stock shop SVG choices to the appropriate painted encounter;
custom local image paths still render their selected artwork. `ItemBrowser` similarly
uses the atlas for stock item illustrations while preserving custom local artwork.
`marketplace.css` scopes shop and inventory composition so admin forms remain usable.

Decorative illustrations have empty alternative text or `aria-hidden`. Search, category
filters, stock, prices, descriptions, and links remain semantic HTML. Sold-out items
retain their explicit status. Motion respects `prefers-reduced-motion`; small screens
reflow character art above copy and keep cards within the viewport.

No database migration, authentication change, or external image service is required.
