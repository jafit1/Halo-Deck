# Halo Deck

Halo Deck is a local-first showcase and technical field guide for turning a phone into a trusted control surface and second screen for a computer. The companion architecture uses a desktop WebSocket server, a mobile client, one-time QR pairing, and Bonjour/mDNS discovery on the same WiFi or LAN.

## Showcase

The website is a static React + Tailwind experience with an interactive pairing demo, QR scanning animation, feature cards for Extended Display, Trackpad, and Ambient Clock, plus visual explanations of QR pairing and mDNS discovery.

## Local development

```bash
pnpm install
pnpm dev
```

Typecheck and build the site with:

```bash
pnpm check
pnpm build
```

## Repository

The source is maintained at [github.com/jafit1/Halo-Deck](https://github.com/jafit1/Halo-Deck).
