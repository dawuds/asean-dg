# asean-dg — ASEAN Data Governance Framework

## What This Is
Structured knowledge base for the ASEAN Framework on Digital Data Governance. SPA explorer with JSON data layers.

## Architecture
- **SPA**: `index.html` + `app.js` + `style.css` (vanilla JS, no build step)
- **Schema**: GRC Portfolio v2.0 Standardized Schema

## Key Data Files
- `controls/library.json` — 20 controls across 5 domains
- `requirements/by-domain/` — cross-border-transfers, data-classification, data-protection-standards, model-contractual-clauses, regulatory-harmonization
- `cross-references/pdpa-mapping.json` — PDPA alignment for cross-border transfers

## Conventions
- Kebab-case slugs for all IDs

## Important
- Cross-border data transfer rules vary by ASEAN member state
- Model Contractual Clauses are voluntary, not binding

## Related Repos
- `pdpa-my/` — Malaysia PDPA cross-border transfer provisions
