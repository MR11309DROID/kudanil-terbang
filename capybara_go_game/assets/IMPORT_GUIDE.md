# Production-ready import guide (v2.2)

## Use this folder first
Import files from `production_ready/`. Treat the root `assets/` and old `animations/` folders as legacy/source material: they are included for traceability but mix individual cuts, composite crops and procedural prototypes.

## Fixed canvases
- Player actions: `characters/player/<action>/frame_XX.png`, 64x64 RGBA, bottom-aligned. `idle`, `walk`, `run`, `attack`, `skill`, `hurt`, and `die` are non-uniform in frame count; use the manifest rather than assuming equal numbers.
- Enemy archetype roster: `characters/enemies/roster/`, 10 representative 96x96 RGBA sprites. They are still images, not unique attack animation sets.
- Boss roster: `characters/bosses/`, 5 isolated 128x128 RGBA sprites. Forest-treant art remains composite key art.
- Skills/effects: skills and projectiles use 96x96 transparent canvases. Pickup and loot icons use 64x64. Props use 96x96.
- `environment/terrain_pieces_64/` is the normalized legacy starter group; `environment/terrain_autotiles_64/<theme>/mask_XX.png` is the new 7-theme, 16-cardinal-mask set. Bit values are N=1, E=2, S=4, W=8. Test corner junctions in the target engine.
- `backgrounds/panoramas/` contains five border-trimmed opaque horizontal scenes. `qa/background_review_only/` holds low-resolution thumbnail crops; do not use those as full-screen backgrounds.

## UI kit
`ui/capybara_cartoon_kit/` is the new set of individual components: button state variants (`gold_normal.png`, `gold_pressed.png`, `gold_disabled.png`, and analogous colors), panels, bars, rarity frames, toggles, checkboxes, control glyphs, equipment icons, status icons and small combat-feedback effects. Bars are separate from their track; clip a fill horizontally based on the runtime value. Panel nine-slice margins are defined in `nine_slice.json`.

## FPS and animations
The root `config/fps_profiles.json`, `config/unity/FpsSettings.cs`, and `config/godot/fps_settings.gd` define 60 FPS default and optional 120 FPS maximum cap. A cap is not a performance guarantee. The existing enemy/boss combat sequences outside `production_ready/` are transform/tint prototypes; bespoke hand-drawn combat frame sets still need production art.

## Visual style note
The UI kit is manually authored to fit the same broad colorful mobile-RPG direction (rounded surfaces, dark outlines, gold trim and soft highlights). The underlying legacy character/background illustrations originated from earlier generated atlases and are not exact official Capybara Go! artwork.
