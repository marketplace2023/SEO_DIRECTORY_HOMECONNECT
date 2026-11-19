# HOME CONNECT: local map discovery and an explained service catalog

* **Author:** developjunior2025
* **Date:** 2026-11-18
* **Status:** Initial audit retained for reference. The owner subsequently requested implementation. The current delivery is documented in `docs/mapa-y-catalogo.md`: 48 explained categories, 240 services, original category artwork, saved locations and connected list/map discovery within home services. No Goldfish review was run.

## Overview

HOME CONNECT needs a discovery experience that connects a useful results list with a map, and a larger service catalog that explains what each trade means. Each category should help a customer recognize the work, understand its boundaries, and choose an appropriate service before contacting a business.

Georgia, United States, remains the confirmed launch market. The current product focuses on home services. Whether the expanded catalog should include other kinds of local businesses is not yet decided. “Yelp-like” currently describes a product reference, not a decision to copy Yelp branding, consume its API, or import its listings.

The phrase “an illustrator for each category” needs clarification. This brief provisionally treats it as a distinct category illustration paired with a written explanation. It does not assume that a small icon alone satisfies the request, or that a human illustrator is being requested.

## Analysis

### What exists in the code

| Area | Current evidence | Consequence |
|---|---|---|
| Catalog | `src/data/catalog.ts`: 32 categories, 64 generated subcategories, 96 services | Quantity exists, but the depth is limited to three services per category. |
| Category model | `src/domain/types.ts`: ID, bilingual name, reference number | No definition, inclusions, exclusions, illustration, examples, or scope metadata. |
| Grouping | Every category receives the same installation/projects and repair/care groups | These groups do not describe the actual divisions of every trade. |
| Service mode | Mode follows array position: installation, repair, maintenance | An inspection can become “maintenance”; meaning must be authored rather than inferred from position. |
| Visuals | `src/components/category-icons.ts`: an ordered array of React Icons, with repeated symbols | Reordering or extending the catalog can assign the wrong symbol. There is no distinct explanatory illustration set. |
| Category pages | `src/components/ecosystem/public-pages.tsx`: lists groups/services and generic guidance | A customer cannot read a trade-specific explanation of what is included or excluded. Counts such as 32 and 3 are hard-coded in the interface. |
| Existing map | `src/components/ecosystem/coverage-map.tsx`: Leaflet, street tiles, local geographic fallback, numbered markers, selected result, region/category filters | This is an existing map to evolve, not a missing dependency to reinstall. |
| Geographic data | `src/data/locations.ts`: 12 hard-coded demonstration coordinates | A newly registered contractor has no entry and is excluded from the map even after publication. |
| Georgia supply | Four sample businesses in the Georgia seed | Expanding category names alone cannot produce useful local supply. The other seeded locations are international demonstrations. |
| Coverage | A fixed 9 km circle illustrates the selected seed point; coverage is also stored as city-name text | Neither the circle nor a city-center point establishes a verified service area or an exact business address. |
| Search | `src/domain/queries.ts` supports directory filters; the map maintains separate filters | The list and map can disagree. There is no shared viewport-based geographic query, explicit search-this-area action, or distance ranking. |
| Business specialties | `Professional` has one primary category; relation validation restricts services to it | Several specialties per business require a deliberate model and migration change. Duplicating a business for each category would create another problem. |
| Persistence | `server/database/database.ts` recreates catalog rows from source on initialization | Adding an admin editor without changing this lifecycle could overwrite editorial changes at the next restart. |
| SEO | Local HTML routes and an editorial local-page module already exist | Category copy should be shared with these pages, not maintained separately in React and the HTML renderer. |

This is a source audit, not a fresh browser usability study. No application code was changed for this brainstorming request. Existing uncommitted work was preserved.

### Proposed map behavior, subject to clarification

Use one search state for the query, category, subcategory/service, location, filters, and selected business. A result and its marker must refer to the same business ID. Moving the map should offer an explicit action to search that area; it should not continually reset the map to all results while the person is dragging it.

On a wide screen, keep the result list and map visible together. On a narrow screen, offer an accessible list/map switch and a selected-business card without losing filters. Keyboard use, empty results, unavailable tiles, missing locations, and location-permission refusal need explicit behavior. Clustering and bounded server queries become relevant when the dataset grows; the present 12 points do not justify an immediate mapping-engine replacement.

Persist geographic records instead of adding IDs to a TypeScript lookup. Distinguish a customer-facing business address from an approximate city location and a declared service area. A business that visits homes may serve a search area even when its office is outside the visible rectangle. A point-in-rectangle query alone would miss it. Do not expose a private residential address as a public pin.

Keep base-map rendering, address lookup, and HOME CONNECT business discovery as separate responsibilities. Connecting Google Business Profile does not automatically supply a public geographic catalog, a map provider, or permission to publish private data. Map and geocoding providers, quotas, and operating costs remain undecided.

The current OpenStreetMap tile service offers no SLA, has usage requirements, and recommends configurable tile URLs. A production choice must account for that service's policy and expected traffic. [OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/).

### What an explained category needs

Proposed content for each category:

* A stable ID, an English and Spanish name, and search synonyms.
* A short definition, typical customer problems, included work, and explicit exclusions.
* Meaningful subcategories and services; do not require every trade to have the same number.
* Examples of deliverables and the information a contractor needs to quote.
* An illustration tied to the category ID, with alternative text, asset source, and usage rights.
* Related categories and rules for overlapping work.
* An editorial state and a distinction between catalog availability and actual local provider availability.
* Requirements that need review for a particular service and jurisdiction, with a source and review date. Category membership alone must not be presented as a license or verification.

This is a content contract to discuss, not a committed database schema. Existing IDs and Odoo-style table names should be preserved where appropriate; adding scope content does not require renaming all tables. The implementation must validate the extra content, persist it, and expose the same approved version to the catalog, registration, request form, directory, and local SEO renderer.

### Initial meaning and scope of the existing 32 areas

The following is an editorial starting point, not a legal determination, a complete task catalog, or an assurance that providers are available. Names retain the current IDs for compatibility. Each illustration subject is a proposed visual cue rather than a generated asset.

| Existing ID / area | Meaning and included work | Boundary or adjacent area | Proposed illustration subject |
|---|---|---|---|
| `roofing` — Roofing | Install, repair, or replace roof coverings, flashing, and related weather protection. | Structural redesign and solar electrical work belong to their appropriate specialists; coordinate waterproofing where relevant. | A roof section showing shingles and flashing. |
| `plumbing` — Plumbing | Water supply, drains, fixtures, leaks, and related piping work. | Separate septic field work, HVAC refrigeration, and electrical connections; assess gas work as its own service. | A sink with visible supply and drain pipes. |
| `hvac` — Heating, ventilation, and air conditioning | Diagnose, install, repair, and maintain heating, cooling, and ventilation equipment. | Separate structural work, general electrical upgrades, and specialist environmental remediation. | An outdoor unit connected to an indoor vent. |
| `electrical` — Electrical work | Circuits, panels, outlets, wiring, lighting connections, and fault diagnosis. | Distinguish low-voltage networks and utility-owned infrastructure. | A panel, outlet, and safely represented circuit. |
| `painting` — Painting | Surface preparation and interior or exterior coating work. | Structural repairs, major drywall replacement, and hazardous-material removal need separate scope. | A roller, prepared wall, and trim. |
| `landscaping` — Landscaping | Garden layout, planting, landscape improvements, and routine grounds care. | Define boundaries with tree removal, irrigation, retaining walls, and specialized landscape design. | A planted garden with a lawn and walkway. |
| `drywall` — Drywall | Install or repair gypsum panels, joints, patches, and finishing. | Structural framing, painting, and mold remediation are separate unless explicitly included. | A cutaway gypsum wall and joint-finishing tools. |
| `concrete` — Concrete | Slabs, driveways, walkways, forming, finishing, and concrete repair. | Structural engineering and foundation stabilization are separate scopes. | A formed slab with a finishing trowel. |
| `masonry` — Masonry | Brick, block, and stone construction, repointing, and repairs. | Distinguish cast concrete and engineered structural changes. | A brick wall with mortar joints. |
| `carpentry` — Carpentry | Wood framing, trim, built-ins, and wood repairs. | Cabinetry can be a specific subcategory or separate trade; structural changes need explicit review. | A wood assembly with joinery and trim. |
| `flooring` — Flooring | Install, replace, repair, or refinish suitable floor coverings. | Separate tile specialization and major structural subfloor correction. | Wood, vinyl, and carpet floor sections. |
| `tile` — Tile | Tile layout, setting, grout, replacement, and joint repair. | Wet-area waterproofing and plumbing must be specified separately. | A tiled surface with adhesive and grout layers. |
| `windows` — Windows | Window fitting, replacement, sealing, hardware, and glass-related repair. | Structural opening changes and specialist glazing need explicit scope. | A window frame, sash, and perimeter seal. |
| `doors` — Doors | Fit, replace, align, and repair ordinary doors and hardware. | Garage mechanisms, access-control systems, and locksmith tasks are adjacent specialties. | A hinged door with its frame and hardware. |
| `fencing` — Fences | Fence and gate construction, repair, and material replacement. | Automated gates and structural retaining walls require separate service definitions. | Fence panels and a gate. |
| `decks` — Decks and terraces | Build, repair, and maintain decks, rails, and related exterior platforms. | Separate foundations, roofed additions, and design/permit responsibilities. | A deck with stairs and railings. |
| `siding` — Exterior siding | Exterior cladding installation, replacement, trim, and repairs. | Structural wall repairs and moisture remediation must not be hidden inside a cladding quote. | A wall cutaway showing exterior cladding. |
| `gutters` — Gutters | Install, clean, repair, and adjust gutters and downspouts. | Underground drainage and roof replacement are separate. | A roof edge, gutter, and downspout. |
| `trees` — Tree services | Pruning, tree removal, stump work, and tree care when offered. | Utility-line work and specialist tree assessments need separate responsibility. | A tree, pruning branch, and stump. |
| `pressure-washing` — Pressure washing | Clean suitable exterior surfaces using an appropriate pressure or soft-wash method. | Does not imply structural repair, painting, or remediation of hazardous contamination. | A driveway and controlled cleaning spray. |
| `garage-doors` — Garage doors | Door panels, tracks, openers, safety devices, and mechanical repairs. | Springs and powered mechanisms require a defined specialist task; ordinary entry doors are separate. | A sectional garage door and opener. |
| `handyman` — General small repairs | Minor repairs, assembly, mounting, and limited routine household tasks. | Not a blanket category for specialized regulated trade work or structural alterations. | A small repair bench and household fixtures. |
| `pest-control` — Pest control | Pest inspection, prevention, treatment, and follow-up for specified pests. | Separate wildlife removal, structural repairs, and work outside the provider's authorized services. | A house perimeter and pest-identification detail. |
| `locksmith` — Locksmiths | Locks, keys, rekeying, authorized entry, and related security hardware. | Requires an ownership/authorization workflow; separate alarm installation and garage repair. | A lock cylinder, key, and door latch. |
| `appliances` — Appliance services | Diagnose, repair, maintain, or fit the listed household appliances. | New plumbing, gas, or electrical infrastructure is a separate task. | A washer and refrigerator with service components. |
| `insulation` — Insulation | Thermal or acoustic insulation installation, replacement, and related air sealing. | Separate hazardous-material removal and repairs to the source of moisture. | A wall or attic section showing insulation. |
| `solar` — Solar energy | Solar-system assessment, installation, maintenance, and system-specific repairs. | Define roofing, electrical work, utility interconnection, and battery scope separately. | Roof-mounted panels connected to an inverter. |
| `pools` — Pools | Pool construction, equipment, repairs, cleaning, and routine maintenance as separate services. | Engineering, electrical work, and major excavation need explicit responsibility. | A pool with pump and filter equipment. |
| `septic` — Septic systems | Septic inspection, installation, pumping, tank repair, and drainage-field services where offered. | Separate municipal sewer work and environmental/site approvals. | A tank and drainage-field cutaway. |
| `remodeling` — Remodeling | Coordinate changes to kitchens, bathrooms, rooms, or larger residential spaces. | Identify the general contractor's coordination role and each specialist's scope; do not treat it as every trade at once. | A room before/after plan with fixtures. |
| `foundations` — Foundations | Foundation assessment, stabilization, crack repair, and settlement-related work. | Distinguish an engineering assessment, the repair execution, drainage, and cosmetic patching. | A footing and foundation-wall cutaway. |
| `waterproofing` — Waterproofing | Membranes, seals, moisture barriers, and water-ingress protection for specified surfaces. | Identify the source of water; roof replacement, structural correction, and mold treatment are separate. | A wall or roof section showing a water barrier. |

These boundaries need refinement with the actual services and providers. They should appear as useful explanations, not just long fine print under a card.

### Candidate gaps to investigate, not an approved category count

The Lawrenceville reference already distinguishes general contractors from the base remodeling category. The current catalog also lacks explicit areas such as home cleaning, junk removal, moving, home inspection, interior design, home automation, home networks, irrigation, excavation, demolition, restoration after damage, chimney services, cabinetry, countertops, and glass/mirrors.

Some of these may become subcategories instead of top-level categories. Creating both “kitchen remodeling” and “remodeling” as unrelated top-level entries would need routing rules to prevent duplicate listings and confusing request distribution. Search synonyms and cross-links can improve discovery without multiplying canonical categories.

Yelp publishes categories beyond construction and has a distinct Home Services branch. It is a reference for gap analysis, not a requirement to adopt every category or copy its hierarchy. [Yelp category reference](https://docs.developer.yelp.com/docs/resources-categories).

The illustrated Lawrenceville sheet in `public/SEO_GALLERY/unnamed (48).png` is reference material. Its business names, lead counts, claimed completeness, and coverage percentages are not verified HOME CONNECT supply and must not become public statistics or seeded real listings.

### Main objections to the working direction

1. **More categories can make a small marketplace look empty.** Separate the full educational catalog from categories with active local providers; measure useful matches rather than the number of labels.
2. **Map pins can misrepresent coverage.** Office location, approximate service location, and served territory need separate meanings before distance sorting is credible.
3. **Illustrations can become decoration.** Each needs a recognizable subject plus useful copy and examples; one reused generic tool icon does not explain a trade.
4. **Catalog edits can break old records.** Preserve IDs, add aliases and explicit migrations, and retain old service references used in requests and proposals.
5. **Catalog governance is currently missing.** Source-generated data and database editing cannot both be authoritative without a conflict policy and a release process.

## Goals vs. Non-Goals

### Proposed in-scope goals

* Explain the existing categories before expanding them.
* Agree on the boundaries of the expanded catalog and a method for deciding category versus subcategory.
* Define synchronized local list/map discovery for Georgia, including service-area businesses.
* Define a distinct and accessible illustration system tied to stable category IDs.
* Reuse approved category meaning across public pages, SEO, professional onboarding, and customer requests.
* Plan compatible migration and editorial ownership before changing stored records.

### Not currently assumed

* All of Yelp's industries, nationwide supply, or a final number of categories.
* Imported Yelp or Google listings, reviews, or images.
* Exact public contractor home addresses or verified coverage inferred from a marker.
* Real-time contractor tracking, navigation, routing, or travel-time estimates.
* Automated licensing decisions, guaranteed availability, or guaranteed search ranking.
* A mapping-provider purchase, a final illustration style, or production activation.

## Alternatives Weighed

No alternative has been rejected by the owner yet.

* **Extend Leaflet:** preserves the existing implementation; viewport search, shared filtering, saved geography, and clusters can be added. Its adequacy should be assessed against the agreed interaction and scale.
* **Change the mapping engine/provider:** may meet future vector-map or styling needs, but brings migration and operating costs. A new library alone does not fix missing business coordinates or service areas.
* **Add many top-level categories immediately:** increases apparent breadth, but can worsen overlap and empty-result rates.
* **Use domains, subcategories, and synonyms:** can increase detail while retaining a manageable discovery screen; the hierarchy needs user validation.
* **Use photographs, explanatory illustrations, or diagrams:** each can support recognition. Asset style, provenance, and meaning are undecided; a React Icon remains suitable for compact navigation but does not replace the full category explanation.

## Key Decisions & Staging for Next Steps

Confirmed from existing context: HOME CONNECT branding, Georgia launch market, consumer area within the public web, separate contractor and administrator applications, React/Tailwind stack, and preservation of existing naming conventions where applicable.

Pending clarification, in order:

1. Business areas the expanded catalog should include and deliberately leave out.
2. What the category “illustrator” should communicate and where it appears.
3. The discovery journey the map must support, including locations versus served territories.
4. Acceptable provider costs, pilot geography, editorial responsibility, and useful success measures.

After these are clear, anchor the working hypothesis and obtain the readiness confirmation required by egm-brainstorm. Only then run the independent Goldfish reviews, revise this brief from their actual findings, and choose whether to proceed to formal design. No readiness confirmation or independent review has occurred yet.

## Audit reading list

* `src/data/catalog.ts`, `src/data/locations.ts`, `src/data/seed.ts`
* `src/domain/types.ts`, `src/domain/schema.ts`, `src/domain/queries.ts`
* `src/components/category-icons.ts`, `src/components/home-page.tsx`
* `src/components/ecosystem/coverage-map.tsx`, `src/components/ecosystem/public-pages.tsx`
* `server/database/database.ts`, `server/database/tables.ts`
* `docs/alcance-realista-georgia.md`, `docs/alcance-seo-gallery.md`
* `public/SEO_GALLERY/unnamed (8).png`, `public/SEO_GALLERY/unnamed (48).png`

## External sources checked

* [Yelp category taxonomy](https://docs.developer.yelp.com/docs/resources-categories), checked 2026-11-18: category branches and examples used only for comparison.
* [OpenStreetMap standard tile usage policy](https://operations.osmfoundation.org/policies/tiles/), checked 2026-11-18: attribution, configurable source, usage limits, and lack of an SLA.
