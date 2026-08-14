// Style note: This page is a Warm Engineering Editorial field guide, not a generic SaaS landing page.
// Preserve the asymmetric rail, device specimens, monospaced protocol labels, and live signal states.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  Copy,
  Github,
  KeyRound,
  LockKeyhole,
  Monitor,
  MousePointer2,
  Network,
  Play,
  Radio,
  QrCode,
  RotateCw,
  ScanLine,
  ShieldCheck,
  Server,
  Smartphone,
  Terminal,
  Wifi,
  X,
  Zap,
} from "lucide-react";

const HERO_IMAGE = "/manus-storage/lan-companion-hero-reference_f1a81a25.png";
const DEVICE_IMAGE = "/manus-storage/lan-companion-device-specimen_c3ec5373.png";
const MARK_IMAGE = "/manus-storage/lan-companion-mark_1d06a3fc.png";

type DemoMode = "screen" | "clock" | "trackpad";

const modeData: Record<DemoMode, { label: string; title: string; detail: string; icon: typeof Monitor }> = {
  screen: { label: "Layar", title: "A second surface, not a second cloud.", detail: "JPEG frames travel directly across the local socket. The phone becomes a focused monitor without leaving the room.", icon: Monitor },
  clock: { label: "Jam", title: "Idle can still be useful.", detail: "When the phone is not controlling the cursor, it becomes a quiet ambient clock with a deliberate dark mode.", icon: Clock3 },
  trackpad: { label: "Trackpad", title: "A pointer with less friction.", detail: "Binary deltas, clicks, scroll, and keyboard text move over the same trusted session—small payloads, immediate feedback.", icon: MousePointer2 },
};

const featureData: Record<DemoMode, { kicker: string; title: string; detail: string; icon: typeof Monitor; metrics: string[] }> = {
  screen: { kicker: "01 / EXTENDED DISPLAY", title: "A second surface, right where you are.", detail: "Select a window or screen area on the Desktop Hub and send a focused visual feed to the Pocket Hub. The local route keeps the signal close and the feedback immediate.", icon: Monitor, metrics: ["12 fps prototype", "JPEG over WebSocket", "WebRTC-ready path"] },
  trackpad: { kicker: "02 / TRACKPAD + INPUT", title: "Move the pointer without moving your chair.", detail: "Touch gestures become compact binary deltas, clicks, scroll, and optional keyboard text. It is a small control protocol with a very human result.", icon: MousePointer2, metrics: ["Binary input frames", "Tap / scroll / type", "Reconnect-aware"] },
  clock: { kicker: "03 / AMBIENT CLOCK", title: "When idle, the phone still earns its keep.", detail: "A quiet dark display turns the Pocket Hub into a desk-side clock. Switch back to control or screen mode without pairing again.", icon: Clock3, metrics: ["Dark ambient UI", "Mode switch in-session", "No cloud dependency"] },
};

function ProtocolTag({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "apricot" | "ink" }) {
  return <span className={`protocol-tag protocol-${tone}`}>{children}</span>;
}

function SectionMarker({ number, label }: { number: string; label: string }) {
  return <div className="section-marker"><span>{number}</span><span>{label}</span></div>;
}

function ProductMark() {
  return <span className="brand-mark-shell"><img className="brand-mark" src={MARK_IMAGE} alt="Halo Deck split-field mark" /><i /></span>;
}

function DeviceSpecimen() {
  return (
    <div className="hero-specimen" aria-label="Desktop and mobile companion preview">
      <div className="specimen-note specimen-note-top"><span>01</span> local route</div>
      <div className="specimen-monitor">
        <div className="specimen-chrome"><span /><span /><span /><small>Desktop Hub / 47777</small></div>
        <div className="specimen-window">
          <div className="window-sidebar"><i /><i /><i /><i /></div>
          <div className="window-body"><div className="window-title">LOCAL SESSION</div><div className="window-bars"><b /><b /><b /><b /></div><div className="window-status"><span /><em>paired</em><strong>12 ms</strong></div></div>
        </div>
      </div>
      <div className="specimen-phone">
        <div className="phone-speaker" />
        <div className="phone-screen"><span className="phone-kicker">POCKET HUB</span><strong>09:41</strong><small>Tuesday · 14 May</small><div className="phone-signal"><span /><span /><span /></div></div>
      </div>
      <div className="specimen-signal"><span /><span /><span /></div>
      <div className="specimen-note specimen-note-bottom"><span>02</span> trusted session</div>
    </div>
  );
}

function LiveDemo() {
  const [mode, setMode] = useState<DemoMode>("screen");
  const [demoStep, setDemoStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const data = modeData[mode];
  const Icon = data.icon;

  const runDemo = () => {
    if (playing) return;
    setPlaying(true);
    setDemoStep(1);
    window.setTimeout(() => setDemoStep(2), 520);
    window.setTimeout(() => setDemoStep(3), 1120);
    window.setTimeout(() => { setDemoStep(4); setPlaying(false); }, 1720);
  };

  const qrCells = Array.from({ length: 81 });
  const scanLabel = demoStep === 1 ? "SCANNING QR" : demoStep === 2 ? "VERIFYING PIN" : demoStep === 3 ? "SEALING SESSION" : "READY TO PAIR";

  return (
    <div className="demo-shell">
      <div className="demo-copy">
        <div className="demo-header"><div><ProtocolTag tone="apricot">LIVE / SIMULATED</ProtocolTag><h3>See the local loop.</h3></div><div className="demo-latency"><CircleDot size={12} /> 12 ms <span>LAN</span></div></div>
        <p className="body-copy">A small interactive proof of the product idea: one pairing, three useful modes, zero dependency on the internet.</p>
        <div className="mode-tabs" role="tablist" aria-label="LAN Companion modes">
          {(Object.keys(modeData) as DemoMode[]).map((item) => { const ItemIcon = modeData[item].icon; return <button key={item} className={mode === item ? "mode-tab active" : "mode-tab"} onClick={() => setMode(item)} role="tab" aria-selected={mode === item}><ItemIcon size={15} />{modeData[item].label}</button>; })}
        </div>
        <div className="demo-detail"><div className="detail-icon"><Icon size={20} /></div><div><h4>{data.title}</h4><p>{data.detail}</p></div></div>
        <button className="button button-blue" onClick={runDemo} disabled={playing}><Play size={15} fill="currentColor" /> {playing ? "Pairing in progress…" : "Run pairing demo"}</button>
      </div>
      <div className="demo-visual">
        <div className="demo-console-bar"><span className="live-dot" /> <span>POCKET HUB</span><span className="console-right">{demoStep >= 4 ? "CONNECTED" : "WAITING"}</span></div>
        <div className="demo-console-body">
          {demoStep < 4 && <div className={`qr-scan-panel ${demoStep > 0 ? "scanning" : ""}`}><div className="qr-scan-code" aria-label="Simulated QR pairing code">{qrCells.map((_, index) => <i key={index} className={(index * 17 + index * index + 3) % 7 < 3 || [0, 1, 2, 8, 9, 10, 70, 71, 72, 78, 79, 80].includes(index) ? "qr-cell filled" : "qr-cell"} />)}<span className="qr-corner qr-corner-tl" /><span className="qr-corner qr-corner-tr" /><span className="qr-corner qr-corner-bl" />{demoStep > 0 && <span className="qr-scan-beam" />}</div><div className="qr-scan-copy"><ProtocolTag tone="apricot">{scanLabel}</ProtocolTag><strong>PAIRING CODE</strong><span>6 4 1 2 0 8</span><small>Point the Pocket Hub here.<br />The token never leaves the LAN.</small></div></div>}
          {demoStep >= 4 && <div className="pair-complete"><div className="pair-complete-icon"><Check size={25} /></div><ProtocolTag tone="apricot">SESSION READY</ProtocolTag><strong>Connected on the LAN</strong><span>Desktop Hub ↔ Pocket Hub</span><div className="pair-complete-meta"><span><KeyRound size={12} /> token sealed</span><span><Zap size={12} /> 12 ms</span></div></div>}
          {mode === "screen" && <div className="mini-screen"><div className="mini-screen-top"><span>EXTENDED DISPLAY</span><span>FRAME 12 / s</span></div><div className="mini-screen-grid"><span /><span /><span /><span /><span /><span /></div><div className="mini-cursor" /></div>}
          {mode === "clock" && <div className="mini-clock"><strong>09:41</strong><span>Tuesday, 14 May</span><i>AMBIENT / DARK</i></div>}
          {mode === "trackpad" && <div className="mini-trackpad"><MousePointer2 className="mini-pointer" size={26} /><span>SWIPE / TAP / SCROLL</span><div className="mini-track-lines"><i /><i /><i /></div></div>}
          <div className="console-state"><div><span className={demoStep >= 1 ? "state-check active" : "state-check"}>{demoStep >= 1 ? <Check size={11} /> : "01"}</span><small>QR scanned</small></div><div><span className={demoStep >= 2 ? "state-check active" : "state-check"}>{demoStep >= 2 ? <Check size={11} /> : "02"}</span><small>Token sealed</small></div><div><span className={demoStep >= 3 ? "state-check active" : "state-check"}>{demoStep >= 3 ? <Check size={11} /> : "03"}</span><small>Ready on LAN</small></div></div>
        </div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  const [active, setActive] = useState<DemoMode>("screen");
  const feature = featureData[active];
  const Icon = feature.icon;
  return <section id="features" className="section section-features"><div className="section-inner"><SectionMarker number="03" label="THE FEATURE SET" /><div className="features-heading"><div><h2>One session.<br /><em>Three jobs.</em></h2></div><p>Each mode is a different answer to the same local question: what would make the computer more useful right now?</p></div><div className="features-layout"><div className="feature-selector" role="tablist" aria-label="LAN Companion features">{(Object.keys(featureData) as DemoMode[]).map((item, index) => { const ItemIcon = featureData[item].icon; return <button key={item} className={active === item ? "feature-card active" : "feature-card"} onClick={() => setActive(item)} role="tab" aria-selected={active === item}><span className="feature-number">0{index + 1}</span><span className="feature-icon"><ItemIcon size={19} /></span><span className="feature-card-copy"><strong>{featureData[item].kicker.split(" / ")[1]}</strong><small>{item === "screen" ? "Visual surface" : item === "trackpad" ? "Control surface" : "Ambient surface"}</small></span><ArrowUpRight className="feature-card-arrow" size={17} /></button>; })}</div><div className="feature-stage"><div className="feature-stage-top"><ProtocolTag tone="apricot">{feature.kicker}</ProtocolTag><span className="feature-stage-live"><span /> ACTIVE FEATURE</span></div><div className="feature-stage-visual"><div className={`feature-orb feature-orb-${active}`}><Icon size={32} /></div><div className="feature-scan-line" /><span className="feature-coordinate">LOCAL / 0{(Object.keys(featureData) as DemoMode[]).indexOf(active) + 1} / READY</span>{active === "screen" && <div className="feature-window"><i /><i /><i /><b /><b /><b /></div>}{active === "trackpad" && <MousePointer2 className="feature-cursor" size={29} />}{active === "clock" && <div className="feature-time">09:41<small>AMBIENT</small></div>}</div><h3>{feature.title}</h3><p>{feature.detail}</p><div className="feature-metrics">{feature.metrics.map((metric) => <span key={metric}><Check size={13} /> {metric}</span>)}</div></div></div></div></section>;
}

function ConnectionPaths() {
  return <section id="connect" className="section section-connect"><div className="section-inner"><SectionMarker number="04" label="HOW TO CONNECT" /><div className="connect-heading"><h2>Two ways in.<br /><em>One trusted session.</em></h2><p>Choose the flow that fits the room. QR is the fast, visible handshake. mDNS is the quiet path for devices that already know how to find each other.</p></div><div className="connection-grid"><div className="connection-card connection-qr"><div className="connection-card-top"><span className="connection-badge"><QrCode size={15} /> FASTEST</span><span>01 / 04</span></div><h3>Scan the QR.</h3><p>Desktop Hub shows a one-time QR with the LAN endpoint, pairing ID, and PIN. The Pocket Hub scans it, verifies the desktop, and receives a fresh sealed token.</p><div className="connection-steps"><span><b>01</b> Show QR</span><ArrowRight size={14} /><span><b>02</b> Scan</span><ArrowRight size={14} /><span><b>03</b> Confirm</span></div><div className="mini-qr-grid">{Array.from({ length: 49 }).map((_, index) => <i key={index} className={(index * 13 + index * index) % 5 < 2 ? "filled" : ""} />)}</div></div><div className="connection-card connection-mdns"><div className="connection-card-top"><span className="connection-badge blue"><Network size={15} /> AUTO-DISCOVERY</span><span>02 / 04</span></div><h3>Find it nearby.</h3><p>Bonjour/mDNS advertises the Desktop Hub on the same network. The Pocket Hub can show nearby desktops first, then still asks for the explicit pairing confirmation.</p><div className="mdns-radar"><div className="radar-ring ring-one" /><div className="radar-ring ring-two" /><div className="radar-center"><Server size={16} /></div><span className="radar-node node-a"><Monitor size={12} /></span><span className="radar-node node-b"><Smartphone size={12} /></span></div><div className="mdns-foot"><Wifi size={13} /> Same WiFi / LAN <span>·</span> no cloud relay</div></div></div><div className="connect-note"><ShieldCheck size={17} /><span><strong>Either way, consent stays visible.</strong> Discovery finds the desktop; the QR or PIN gives the phone permission to stay.</span></div></div></section>;
}

function ArchitectureDiagram() {
  return <div className="architecture-diagram"><div className="arch-node arch-desktop"><div className="arch-icon"><Monitor size={19} /></div><div><ProtocolTag>DESKTOP HUB</ProtocolTag><h4>Local server</h4><p>Electron · WebSocket · Bonjour</p></div><span className="node-port">:47777</span></div><div className="arch-connector"><div className="connector-line" /><span>same WiFi / LAN</span><div className="connector-arrow"><ArrowDown size={14} /></div></div><div className="arch-node arch-mobile"><div className="arch-icon"><Smartphone size={19} /></div><div><ProtocolTag tone="apricot">POCKET HUB</ProtocolTag><h4>Trusted client</h4><p>Expo · QR pairing · touch input</p></div><span className="node-port">3 modes</span></div><div className="arch-footnote"><Wifi size={14} /> No cloud relay. No account. No round trip.</div></div>;
}

function SecurityFlow() {
  const steps = [
    { icon: ScanLine, label: "Scan once", text: "The QR carries the LAN endpoint, pairing ID, and one-time PIN." },
    { icon: LockKeyhole, label: "Seal token", text: "The desktop seals a fresh session token with a key derived from the PIN." },
    { icon: ShieldCheck, label: "Trust session", text: "Only the authenticated socket can send input or receive screen frames." },
  ];
  return <div className="security-flow">{steps.map(({ icon: StepIcon, label, text }, index) => <div className="security-step" key={label}><div className="security-step-top"><span>0{index + 1}</span><StepIcon size={17} /></div><h4>{label}</h4><p>{text}</p>{index < steps.length - 1 && <div className="step-rule" />}</div>)}</div>;
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  const copy = () => { navigator.clipboard?.writeText(code); toast.success("Copied to clipboard", { description: title }); };
  return <div className="code-block"><div className="code-head"><span><Terminal size={13} /> {title}</span><button onClick={copy} aria-label={`Copy ${title}`}><Copy size={13} /> Copy</button></div><pre><code>{code}</code></pre></div>;
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 16); window.addEventListener("scroll", onScroll); return () => window.removeEventListener("scroll", onScroll); }, []);

  return <div className="site-shell">
    <div className="signal-spine" aria-hidden="true"><span>01</span><i /><b /><i /><b /><i /><b /><i /><b /><span>06</span></div>
    <header className={scrolled ? "site-nav scrolled" : "site-nav"}>
      <a className="brand" href="#top"><ProductMark /><span><strong>HALO</strong> Deck</span></a>
      <nav className="nav-links" aria-label="Primary"><a href="#demo">Demo</a><a href="#features">Features</a><a href="#connect">Connect</a><a href="#architecture">Architecture</a><a href="#docs">Docs</a></nav>
      <div className="nav-end"><span className="local-badge"><span /> LOCAL / NO CLOUD</span><a className="nav-github" href="https://github.com" target="_blank" rel="noreferrer" aria-label="Open GitHub"><Github size={16} /></a></div>
    </header>

    <main id="top">
      <section className="hero-section">
        <div className="hero-inner"><div className="hero-rail"><span>01</span><div /><span>LOCAL-FIRST</span></div><div className="hero-content"><div className="eyebrow-row"><ProtocolTag>DESKTOP + MOBILE</ProtocolTag><span className="eyebrow-line" /><span className="eyebrow-text">A companion system for nearby machines</span></div><h1>Your phone is already a screen.<em>Give it a job.</em></h1><p className="hero-lede">Halo Deck turns a phone into a trusted control surface and second display for a computer—pair once, stay local, keep the signal in the room.</p><div className="hero-actions"><a href="#demo" className="button button-ink">Explore the demo <ArrowDown size={16} /></a><a href="#docs" className="text-link">Read the field guide <ArrowUpRight size={15} /></a></div><div className="hero-meta"><div><span className="meta-number">01</span><span>WebSocket<br />on the LAN</span></div><div><span className="meta-number">02</span><span>QR pairing<br />per session</span></div><div><span className="meta-number">03</span><span>Three modes<br />one client</span></div></div></div><div className="hero-visual"><div className="hero-image-wrap"><img src={HERO_IMAGE} alt="Computer and phone connected by a local signal" /><div className="hero-image-caption"><span>FIG. 01 / THE LOCAL LOOP</span><span>NO INTERNET REQUIRED</span></div></div><DeviceSpecimen /></div></div>
      </section>

      <section id="demo" className="section section-demo"><div className="section-inner"><SectionMarker number="02" label="THE PRODUCT IN MOTION" /><div className="section-heading"><h2>Small system.<br /><em>Useful surface.</em></h2><p>Watch the essential idea unfold: the desktop opens a private local door, the phone proves it has the key, and the surface changes jobs without another pairing round.</p></div><LiveDemo /></div></section>

      <FeaturesSection />

      <ConnectionPaths />

      <section id="architecture" className="section section-architecture"><div className="section-inner"><SectionMarker number="05" label="SYSTEM MAP" /><div className="architecture-layout"><div><div className="section-heading compact"><h2>The internet<br /><em>stays out.</em></h2><p>Two apps, one nearby network, one deliberately small protocol. The architecture is designed around the physical fact that your devices are already in the same room.</p></div><div className="fact-list"><div><Radio size={16} /><span><strong>Discovery</strong> Bonjour/mDNS advertises the desktop; QR remains the fast fallback.</span></div><div><Zap size={16} /><span><strong>Input</strong> Mouse deltas use binary packets instead of verbose JSON.</span></div><div><RotateCw size={16} /><span><strong>Recovery</strong> The mobile client retries the last trusted endpoint after a brief WiFi drop.</span></div></div></div><ArchitectureDiagram /></div></div></section>

      <section className="section section-security"><div className="section-inner"><SectionMarker number="06" label="TRUST, BY DESIGN" /><div className="security-layout"><div className="security-intro"><ProtocolTag tone="apricot">PAIRING / AUTH / SESSION</ProtocolTag><h2>A nearby network is not a permission slip.</h2><p>Halo Deck treats pairing as a deliberate handshake, not an open port. The QR is useful because it makes consent visible: the person holding the desktop decides which phone enters the session.</p><a href="#docs" className="text-link">Read the security notes <ArrowUpRight size={15} /></a></div><SecurityFlow /></div></div></section>

      <section className="section section-modes"><div className="section-inner"><SectionMarker number="07" label="THREE SURFACES" /><div className="mode-grid"><div className="mode-intro"><h2>One phone.<br /><em>Three useful moods.</em></h2><p>The client stays simple on purpose. Switch modes instantly, keep the session, and let the phone adapt to the moment.</p></div>{(Object.keys(modeData) as DemoMode[]).map((item, index) => { const ItemIcon = modeData[item].icon; return <div className="mode-specimen" key={item}><span className="mode-index">0{index + 1}</span><ItemIcon size={22} /><h3>{modeData[item].label}</h3><p>{modeData[item].detail}</p><span className="mode-arrow"><ArrowUpRight size={16} /></span></div>; })}</div></div></section>

      <section id="docs" className="section section-docs"><div className="section-inner"><SectionMarker number="08" label="FIELD GUIDE" /><div className="docs-heading"><div><h2>Documentation for people<br /><em>who like the why.</em></h2></div><p>Start with the transport model, then trace the session from QR to input. The code is intentionally small enough to read in one sitting.</p></div><div className="docs-grid"><div className="docs-copy"><details open><summary><span>01</span> Runtime surface <ChevronDown size={16} /></summary><div><p>Electron acts as the desktop server on port <code>47777</code>. Expo acts as the mobile client. Both can operate without a cloud service once the phone and computer share a WiFi or LAN segment.</p><CodeBlock title="desktop / package.json" code={`"main": "main.js"\n"port": 47777\n"transport": "WebSocket"`} /></div></details><details><summary><span>02</span> Pairing model <ChevronDown size={16} /></summary><div><p>Each desktop launch creates a fresh pairing ID, six-digit PIN, and session token. The token is sealed with <code>secretbox</code> using a SHA-256 key derived from the PIN.</p></div></details><details><summary><span>03</span> Screen path <ChevronDown size={16} /></summary><div><p>The MVP captures a selected display area and sends JPEG frames over the authenticated socket. The production path is ready to evolve toward WebRTC and hardware-accelerated H.264.</p></div></details></div><div className="docs-callout"><div className="callout-top"><Terminal size={17} /><ProtocolTag>QUICK START</ProtocolTag></div><h3>Try the project locally.</h3><p>Run the Desktop Hub, start the Expo client, and scan the QR. The README has the exact commands and the honest list of what is still a prototype.</p><CodeBlock title="desktop" code={`cd desktop\nnpm install\nnpm start`} /><CodeBlock title="mobile" code={`cd mobile\nnpm install\nnpx expo start`} /><a className="button button-ink button-full" href="#top">Back to the signal <ArrowUpRight size={15} /></a></div></div></div></section>

      <section className="closing-section"><div className="closing-inner"><div className="closing-mark"><ProductMark /></div><div><ProtocolTag tone="apricot">LOCAL BY DEFAULT</ProtocolTag><h2>Keep the useful things<br /><em>close to home.</em></h2><p>Halo Deck is a small experiment in making proximity feel like a feature again.</p></div><a className="button button-ink" href="#demo">Run the demo <ArrowUpRight size={16} /></a></div></section>
    </main>

    <footer className="site-footer"><div className="footer-brand"><ProductMark /><span><strong>HALO</strong> Deck</span></div><span>Built for nearby machines, not distant clouds.</span><span className="footer-mono">LOCAL / 47777 / READY</span></footer>
  </div>;
}
