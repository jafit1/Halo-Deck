# Halo Deck Showcase — Design Direction

## Three stylistic approaches

### Theme Name: Signal / Quiet Industrial
**Very Brief Intro:** A dark, disciplined control-room aesthetic with electric blue signal lines, precise status chips, and restrained glow. It makes the networking layer feel tangible without turning the product into cyberpunk.
**Probability:** 0.07

### Theme Name: Warm Engineering Editorial
**Very Brief Intro:** A paper-white technical journal with ink-black type, blueprint blue, and a single apricot signal accent. The site feels like a beautifully typeset field guide for people who care about how tools actually work.
**Probability:** 0.04

### Theme Name: Soft Device Atlas
**Very Brief Intro:** A bright, tactile product showcase using pale mineral surfaces, modular device cards, and soft shadows. It focuses on the emotional simplicity of turning a phone into a useful second surface.
**Probability:** 0.08

## Chosen direction: Warm Engineering Editorial

### Design Movement
Swiss International Typographic Style interpreted through contemporary technical publishing: strict alignment, visible systems, confident typography, and a human paper-like warmth rather than a sterile SaaS dashboard.

### Core Principles
1. **Explain the invisible.** Every visual flourish should make a hidden system legible: local-only transport, pairing, latency, or mode switching.
2. **One signal color, many meanings.** Ink and paper carry the structure; apricot marks action, while blueprint blue marks network relationships.
3. **Editorial rhythm over card soup.** Long-form sections alternate with compact specimens, diagrams, and device-like demos so the page reads like a field guide.
4. **Precision with a human edge.** Use monospaced labels and measured spacing, but soften the experience with warm surfaces, friendly copy, and subtle paper grain.

### Color Philosophy
The base is warm mineral paper (`#F3F0E8`) and almost-black ink (`#17191A`) to make technical content feel approachable and durable. Blueprint blue (`#2F5FEA`) belongs to connections, routes, and architecture. Apricot signal (`#F39A63`) is ownable and reserved for actions, live status, and the one visual pulse that says “this is happening now.” Pale sage is used sparingly for successful pairing.

### Layout Paradigm
Use an asymmetric editorial rail: a narrow fixed section index on larger screens, a wide reading column, and offset “instrument panels” that hang into the gutter. Hero content is left-anchored with a large device diagram on the right, not a centered marketing stack. Technical sections use annotated rows, not repetitive three-column cards.

### Signature Elements
1. **The signal rail:** a thin blue vertical line with numbered anchors that links the page’s system narrative.
2. **Protocol labels:** small monospaced uppercase labels such as `LOCAL / 47777 / AUTH` that act like technical marginalia.
3. **Device specimens:** visual mock devices showing the Desktop Hub, Pocket Hub, and pairing state with screen-like internal details.

### Interaction Philosophy
Interactions should feel like operating an instrument panel: clear state changes, no mystery motion, and immediate feedback. The architecture diagram responds to the selected mode; the demo panel changes from “waiting” to “paired” to “streaming”; copy buttons confirm with a short label swap rather than a noisy toast.

### Animation
Use 180–260ms ease-out transitions for hover, tab, and state changes. On first load, reveal the hero’s signal rail, title, and device specimen in a 50ms stagger. Animate only opacity and transform. The hero signal should gently travel once, while repeated looping is reserved for the live latency pulse. Respect `prefers-reduced-motion` and keep all core information static and accessible.

### Typography System
Use **Space Grotesk** for headings and navigation: geometric, slightly technical, but warmer than a default UI sans. Use **IBM Plex Sans** for long-form explanations. Use **IBM Plex Mono** for protocol labels, code fragments, status readouts, and numeric telemetry. Headline scale: 64px desktop / 44px mobile. Body: 17px with generous line-height. Never use Inter.

### Brand Essence
**Halo Deck is the local-first bridge that turns a phone into a trusted control surface and second screen for a computer, without asking the internet to participate.**

Personality adjectives: **grounded, curious, dependable**.

### Brand Voice
Headlines are direct and observant, never hype-heavy. CTAs sound like invitations to inspect or try a system. Microcopy names what is happening and why.

Example lines:

> Your phone is already a screen. Give it a job.

> Pair once. Stay local. Move the pointer like it was always there.

### Wordmark & Logo
The mark is a compact “split field” symbol: two offset rectangular planes connected by one blue signal notch. It works as a small app icon and expands into a wordmark with a deliberate gap between `HALO` and `Deck`, suggesting a local bridge.

### Signature Brand Color
**Signal Apricot — `#F39A63`**. It is warm enough to feel human, bright enough to behave like a live indicator, and distinctive against ink, paper, and blueprint blue.

## Style Decisions

- Use a warm editorial surface instead of a dark neon product aesthetic.
- Treat the demo as an instrument panel, not a fake app screenshot.
- Keep the primary CTA visible while scrolling, but never let navigation cover the reading surface.
