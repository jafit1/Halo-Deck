// Style note: This page is a Warm Engineering Editorial field guide, not a generic SaaS landing page.
// Preserve the asymmetric rail, device specimens, monospaced protocol labels, and live signal states.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  Copy,
  Github,
  LockKeyhole,
  Monitor,
  MousePointer2,
  Play,
  Radio,
  RotateCw,
  ScanLine,
  ShieldCheck,
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

function ProtocolTag({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "apricot" | "ink" }) {
  return <span className={`protocol-tag protocol-${tone}`}>{children}</span>;
}

function SectionMarker({ number, label }: { number: string; label: string }) {
  return <div className="section-marker"><span>{number}</span><span>{label}</span></div>;
}

function ProductMark() {
  return <span className="brand-mark-shell"><img className="brand-mark" src={MARK_IMAGE} alt="LAN Companion split-field mark" /><i /></span>;
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
          {mode === "screen" && <div className="mini-screen"><div className="mini-screen-top"><span>EXTENDED DISPLAY</span><span>FRAME 12 / s</span></div><div className="mini-screen-grid"><span /><span /><span /><span /><span /><span /></div><div className="mini-cursor" /></div>}
          {mode === "clock" && <div className="mini-clock"><strong>09:41</strong><span>Tuesday, 14 May</span><i>AMBIENT / DARK</i></div>}
          {mode === "trackpad" && <div className="mini-trackpad"><MousePointer2 className="mini-pointer" size={26} /><span>SWIPE / TAP / SCROLL</span><div className="mini-track-lines"><i /><i /><i /></div></div>}
          <div className="console-state"><div><span className={demoStep >= 1 ? "state-check active" : "state-check"}>{demoStep >= 1 ? <Check size={11} /> : "01"}</span><small>QR scanned</small></div><div><span className={demoStep >= 2 ? "state-check active" : "state-check"}>{demoStep >= 2 ? <Check size={11} /> : "02"}</span><small>Token sealed</small></div><div><span className={demoStep >= 3 ? "state-check active" : "state-check"}>{demoStep >= 3 ? <Check size={11} /> : "03"}</span><small>Ready on LAN</small></div></div>
        </div>
      </div>
    </div>
  );
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
      <a className="brand" href="#top"><ProductMark /><span><strong>LAN</strong> Companion</span></a>
      <nav className="nav-links" aria-label="Primary"><a href="#demo">Demo</a><a href="#architecture">Architecture</a><a href="#docs">Docs</a></nav>
      <div className="nav-end"><span className="local-badge"><span /> LOCAL / NO CLOUD</span><a className="nav-github" href="https://github.com" target="_blank" rel="noreferrer" aria-label="Open GitHub"><Github size={16} /></a></div>
    </header>

    <main id="top">
      <section className="hero-section">
        <div className="hero-inner"><div className="hero-rail"><span>01</span><div /><span>LOCAL-FIRST</span></div><div className="hero-content"><div className="eyebrow-row"><ProtocolTag>DESKTOP + MOBILE</ProtocolTag><span className="eyebrow-line" /><span className="eyebrow-text">A companion system for nearby machines</span></div><h1>Your phone is already a screen.<em>Give it a job.</em></h1><p className="hero-lede">LAN Companion turns a phone into a trusted control surface and second display for a computer—pair once, stay local, keep the signal in the room.</p><div className="hero-actions"><a href="#demo" className="button button-ink">Explore the demo <ArrowDown size={16} /></a><a href="#docs" className="text-link">Read the field guide <ArrowUpRight size={15} /></a></div><div className="hero-meta"><div><span className="meta-number">01</span><span>WebSocket<br />on the LAN</span></div><div><span className="meta-number">02</span><span>QR pairing<br />per session</span></div><div><span className="meta-number">03</span><span>Three modes<br />one client</span></div></div></div><div className="hero-visual"><div className="hero-image-wrap"><img src={HERO_IMAGE} alt="Computer and phone connected by a local signal" /><div className="hero-image-caption"><span>FIG. 01 / THE LOCAL LOOP</span><span>NO INTERNET REQUIRED</span></div></div><DeviceSpecimen /></div></div>
      </section>

      <section id="demo" className="section section-demo"><div className="section-inner"><SectionMarker number="02" label="THE PRODUCT IN MOTION" /><div className="section-heading"><h2>Small system.<br /><em>Useful surface.</em></h2><p>Watch the essential idea unfold: the desktop opens a private local door, the phone proves it has the key, and the surface changes jobs without another pairing round.</p></div><LiveDemo /></div></section>

      <section id="architecture" className="section section-architecture"><div className="section-inner"><SectionMarker number="03" label="SYSTEM MAP" /><div className="architecture-layout"><div><div className="section-heading compact"><h2>The internet<br /><em>stays out.</em></h2><p>Two apps, one nearby network, one deliberately small protocol. The architecture is designed around the physical fact that your devices are already in the same room.</p></div><div className="fact-list"><div><Radio size={16} /><span><strong>Discovery</strong> Bonjour/mDNS advertises the desktop; QR remains the fast fallback.</span></div><div><Zap size={16} /><span><strong>Input</strong> Mouse deltas use binary packets instead of verbose JSON.</span></div><div><RotateCw size={16} /><span><strong>Recovery</strong> The mobile client retries the last trusted endpoint after a brief WiFi drop.</span></div></div></div><ArchitectureDiagram /></div></div></section>

      <section className="section section-security"><div className="section-inner"><SectionMarker number="04" label="TRUST, BY DESIGN" /><div className="security-layout"><div className="security-intro"><ProtocolTag tone="apricot">PAIRING / AUTH / SESSION</ProtocolTag><h2>A nearby network is not a permission slip.</h2><p>LAN Companion treats pairing as a deliberate handshake, not an open port. The QR is useful because it makes consent visible: the person holding the desktop decides which phone enters the session.</p><a href="#docs" className="text-link">Read the security notes <ArrowUpRight size={15} /></a></div><SecurityFlow /></div></div></section>

      <section className="section section-modes"><div className="section-inner"><SectionMarker number="05" label="THREE SURFACES" /><div className="mode-grid"><div className="mode-intro"><h2>One phone.<br /><em>Three useful moods.</em></h2><p>The client stays simple on purpose. Switch modes instantly, keep the session, and let the phone adapt to the moment.</p></div>{(Object.keys(modeData) as DemoMode[]).map((item, index) => { const ItemIcon = modeData[item].icon; return <div className="mode-specimen" key={item}><span className="mode-index">0{index + 1}</span><ItemIcon size={22} /><h3>{modeData[item].label}</h3><p>{modeData[item].detail}</p><span className="mode-arrow"><ArrowUpRight size={16} /></span></div>; })}</div></div></section>

      <section id="docs" className="section section-docs"><div className="section-inner"><SectionMarker number="06" label="FIELD GUIDE" /><div className="docs-heading"><div><h2>Documentation for people<br /><em>who like the why.</em></h2></div><p>Start with the transport model, then trace the session from QR to input. The code is intentionally small enough to read in one sitting.</p></div><div className="docs-grid"><div className="docs-copy"><details open><summary><span>01</span> Runtime surface <ChevronDown size={16} /></summary><div><p>Electron acts as the desktop server on port <code>47777</code>. Expo acts as the mobile client. Both can operate without a cloud service once the phone and computer share a WiFi or LAN segment.</p><CodeBlock title="desktop / package.json" code={`"main": "main.js"\n"port": 47777\n"transport": "WebSocket"`} /></div></details><details><summary><span>02</span> Pairing model <ChevronDown size={16} /></summary><div><p>Each desktop launch creates a fresh pairing ID, six-digit PIN, and session token. The token is sealed with <code>secretbox</code> using a SHA-256 key derived from the PIN.</p></div></details><details><summary><span>03</span> Screen path <ChevronDown size={16} /></summary><div><p>The MVP captures a selected display area and sends JPEG frames over the authenticated socket. The production path is ready to evolve toward WebRTC and hardware-accelerated H.264.</p></div></details></div><div className="docs-callout"><div className="callout-top"><Terminal size={17} /><ProtocolTag>QUICK START</ProtocolTag></div><h3>Try the project locally.</h3><p>Run the Desktop Hub, start the Expo client, and scan the QR. The README has the exact commands and the honest list of what is still a prototype.</p><CodeBlock title="desktop" code={`cd desktop\nnpm install\nnpm start`} /><CodeBlock title="mobile" code={`cd mobile\nnpm install\nnpx expo start`} /><a className="button button-ink button-full" href="#top">Back to the signal <ArrowUpRight size={15} /></a></div></div></div></section>

      <section className="closing-section"><div className="closing-inner"><div className="closing-mark"><ProductMark /></div><div><ProtocolTag tone="apricot">LOCAL BY DEFAULT</ProtocolTag><h2>Keep the useful things<br /><em>close to home.</em></h2><p>LAN Companion is a small experiment in making proximity feel like a feature again.</p></div><a className="button button-ink" href="#demo">Run the demo <ArrowUpRight size={16} /></a></div></section>
    </main>

    <footer className="site-footer"><div className="footer-brand"><ProductMark /><span><strong>LAN</strong> Companion</span></div><span>Built for nearby machines, not distant clouds.</span><span className="footer-mono">LOCAL / 47777 / READY</span></footer>
  </div>;
}
