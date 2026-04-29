# Design System Strategy: Technical Precision & Editorial Utility

## 1. Overview & Creative North Star: "The Brutalist Lab"
This design system is built for high-stakes data environments where clarity is the only currency. Our Creative North Star is **"The Brutalist Lab"**—a philosophy that marries the raw, unyielding structure of early computer science interfaces with the sophisticated typographic hierarchy of modern editorial design.

We are moving away from the "soft" web. We reject rounded corners, diffuse shadows, and unnecessary breathing room. Instead, we embrace high-density information, 1px technical strokes, and a stark, monochromatic foundation punctuated by high-vis instrumentation colors. The goal is an interface that feels like a precision-engineered tool, not a consumer social app.

### Breaking the Template
*   **Monospaced Data:** We never use proportional fonts for numeric values. Every digit must align vertically to allow for rapid visual scanning of data tables.
*   **Intentional Asymmetry:** Use the 24 (5.5rem) and 16 (3.5rem) spacing tokens to create large, functional "gutters" on one side of the layout, forcing the eye to track along a specific technical axis.
*   **High Density, Low Noise:** Remove all decorative elements. If a pixel doesn't convey data or define a boundary, it is deleted.

---

## 2. Color Architecture: The Indigo Grid
The palette is rooted in `Primary Indigo (#1A1B41)` and `Background Gray (#F9FAFB)`. Our approach to color is functional, not decorative.

### Surface Hierarchy & Nesting
Depth is achieved through a rigid "Inset" logic. We don't use shadows to lift elements; we use tonal shifts to sink them.
*   **Base Layer:** `surface` (#f9f9ff) – Used for the main application canvas.
*   **The Inset Layer:** `surface_container_low` (#f1f3ff) – Used for sidebars or utility panels to create a subtle recessed look.
*   **The Active Card:** `surface_container_lowest` (#ffffff) – The highest "elevation," reserved for primary data modules and input areas.

### The "No-Shadow" Rule
Standard drop shadows are strictly prohibited. In this system, hierarchy is defined by `outline_variant` (#c8c5cf) at 1px width. To create a "floating" effect (e.g., for Command Palettes or Popovers), use a double-border technique: a 1px border of `outline` followed by a 2px offset "ghost stroke" of `primary_container` at 10% opacity.

### Signature Textures
To prevent the UI from feeling "dead," use a subtle micro-grid background pattern (1px dots spaced at 20px intervals using `outline_variant` at 15% opacity) on the `background` layer. This reinforces the "engineering" aesthetic.

---

## 3. Typography: The IBM Standard
We utilize the **IBM Plex** family to bridge the gap between human-readable UI and machine-readable data.

*   **UI/Interface (IBM Plex Sans):** Used for all labels, navigation, and instructional text. It is neutral, modern, and highly legible at small scales.
*   **Data/Numbers (IBM Plex Mono):** Non-negotiable for all numeric values, code snippets, and timestamps. The monospaced nature ensures that "1,000.00" and "8,888.88" occupy the same horizontal space, maintaining table alignment.

### Typographic Hierarchy
*   **Display/Headline:** Use `headline-sm` (1.5rem) with a `tight` letter-spacing (-0.02em). We keep headings small to prioritize data density.
*   **Labels:** Use `label-sm` (0.6875rem) in All-Caps with +0.05em tracking for secondary metadata or table headers. This provides an "architectural drawing" feel.

---

## 4. Elevation & Structural Integrity
We convey depth through **Tonal Layering** and **Structural Strokes**, never through Gaussian blurs.

*   **The Layering Principle:** Stack `surface_container_highest` inside `surface_container_low` to create clear information silos.
*   **2px Technical Radius:** All containers, buttons, and inputs must use the `sm` (0.125rem / 2px) radius. This provides just enough "finish" to feel premium while maintaining a sharp, technical edge.
*   **The "Ghost Border" Fallback:** For secondary groupings, use the `outline_variant` at 40% opacity. This creates a "hairline" separation that is visible but does not compete with the primary content.

---

## 5. Components: The Utilitarian Library

### Buttons
*   **Primary:** `primary` (#020229) background with `on_primary` (#ffffff) text. Sharp 2px corners. No gradients. 
*   **Secondary/Ghost:** `surface_container_lowest` background with a 1px `outline` border.
*   **States:** On hover, primary buttons shift to `primary_container` (#1a1b41). No "bounce" or "lift" animations; use 50ms linear color transitions.

### Data Tables (The Core Component)
*   **Header:** `surface_container_low` background, `label-md` bold text, 1px bottom border.
*   **Rows:** 1px `outline_variant` bottom border. No alternate-row striping; use a `surface_container_highest` background on hover to highlight the active row.
*   **Cells:** Use IBM Plex Mono for all numeric columns.

### Input Fields
*   **Default:** 1px `outline` border, `surface_container_lowest` background. 2px radius.
*   **Focus:** 1px `tertiary_container` (#46001e) border with a 2px "inner glow" of the same color at 20% opacity. This magenta accent provides a high-contrast focal point.

### Chips & Badges
*   **Status Badges:** Use square corners (0px radius). `Positive Green` (#059669) for success, `Accent Magenta` (#FF007F) for critical alerts. Text should be `label-sm` bold.

---

## 6. Do’s and Don’ts

### Do:
*   **Align to the Pixel:** Ensure all icons and text baselines sit on a 4px grid.
*   **Use Mono for Metrics:** Always use IBM Plex Mono for any value that can change (counters, prices, percentages).
*   **Embrace Contrast:** Use `Text Black (#111827)` against `Surface White (#FFFFFF)` for maximum readability.

### Don't:
*   **No Soft Shadows:** If you feel the need for a shadow, use a thicker border or a darker background fill instead.
*   **No Large Radii:** Never use the `xl` (0.75rem) or `full` (9999px) radius unless it is for a circular avatar.
*   **No Center Alignment:** This system is built on a left-to-right, top-to-bottom technical flow. Avoid center-aligning text or components in the main layout.
*   **No Dividers in Lists:** Use vertical white space (spacing tokens 4 or 5) to separate list items. A line should only be used if it represents a hard structural break.