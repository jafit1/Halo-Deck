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
  CircleAlert,
  Clock3,
  Copy,
  Download,
  Globe2,
  Github,
  Hand,
  KeyRound,
  LockKeyhole,
  Monitor,
  MousePointer2,
  Moon,
  Network,
  Play,
  Power,
  Radio,
  QrCode,
  RotateCw,
  ScanLine,
  ShieldCheck,
  Server,
  Smartphone,
  Sun,
  Terminal,
  Timer,
  Wifi,
  X,
  Zap,
} from "lucide-react";

const HERO_IMAGE = "/manus-storage/lan-companion-hero-reference_f1a81a25.png";
const DEVICE_IMAGE = "/manus-storage/lan-companion-device-specimen_c3ec5373.png";
const MARK_IMAGE = "/manus-storage/lan-companion-mark_1d06a3fc.png";

type DemoMode = "screen" | "clock" | "trackpad";

const modeData: Record<DemoMode, { label: string; title: string; detail: string; icon: typeof Monitor }> = {
  screen: { label: "Layar", title: "Permukaan kedua, tanpa cloud kedua.", detail: "Frame JPEG dikirim langsung lewat socket lokal. HP menjadi monitor fokus tanpa meninggalkan ruangan.", icon: Monitor },
  clock: { label: "Jam", title: "Mode idle tetap berguna.", detail: "Saat HP tidak mengendalikan kursor, ia berubah menjadi jam ambient yang tenang dengan tema gelap.", icon: Clock3 },
  trackpad: { label: "Trackpad", title: "Kursor bergerak tanpa banyak langkah.", detail: "Delta biner, klik, scroll, dan teks keyboard dikirim lewat sesi tepercaya yang sama—payload kecil, respons cepat.", icon: MousePointer2 },
};

const featureData: Record<DemoMode, { kicker: string; title: string; detail: string; icon: typeof Monitor; metrics: string[] }> = {
  screen: { kicker: "01 / LAYAR TAMBAHAN", title: "Permukaan kedua, tepat di sisi Anda.", detail: "Pilih jendela atau area layar di Desktop Hub, lalu kirim tampilan fokus ke Pocket Hub. Rute lokal menjaga sinyal tetap dekat dan responsif.", icon: Monitor, metrics: ["Prototipe 12 fps", "JPEG lewat WebSocket", "Siap menuju WebRTC"] },
  trackpad: { kicker: "02 / TRACKPAD + INPUT", title: "Gerakkan pointer tanpa berpindah tempat.", detail: "Gestur sentuh diterjemahkan menjadi delta biner, klik, scroll, dan teks keyboard. Protokolnya kecil, hasilnya terasa langsung.", icon: MousePointer2, metrics: ["Frame input biner", "Tap / scroll / ketik", "Siap reconnect"] },
  clock: { kicker: "03 / JAM AMBIENT", title: "Saat idle, HP tetap punya peran.", detail: "Layar gelap yang tenang mengubah Pocket Hub menjadi jam di meja. Kembali ke kontrol atau layar tanpa pairing ulang.", icon: Clock3, metrics: ["UI ambient gelap", "Ganti mode dalam sesi", "Tanpa cloud"] },
};

const localeCopy = {
  en: { demo: "Demo", features: "Features", connect: "Connect", tutorial: "Tutorial", architecture: "Architecture", docs: "Docs", explore: "Explore the demo", guide: "Read the field guide", hero: "Halo Deck turns a phone into a trusted control surface and second display for a computer—pair once, stay local, keep the signal in the room.", download: "Download Halo Deck", desktop: "Desktop installer", mobile: "Mobile app", releases: "View releases", tryIt: "Try it live", light: "LIGHT", dark: "DARK" },
  id: { demo: "Demo", features: "Fitur", connect: "Koneksi", tutorial: "Tutorial", architecture: "Arsitektur", docs: "Dokumentasi", explore: "Jalankan demo", guide: "Baca panduan", hero: "Halo Deck mengubah HP menjadi kendali dan layar kedua yang tepercaya untuk komputer—pair sekali, tetap lokal, dan jaga sinyal di ruangan.", download: "Unduh Halo Deck", desktop: "Installer desktop", mobile: "Aplikasi mobile", releases: "Lihat release", tryIt: "Coba langsung", light: "TERANG", dark: "GELAP" },
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
      <div className="specimen-note specimen-note-top"><span>01</span> rute lokal</div>
      <div className="specimen-monitor">
        <div className="specimen-chrome"><span /><span /><span /><small>Desktop Hub / 47777</small></div>
        <div className="specimen-window">
          <div className="window-sidebar"><i /><i /><i /><i /></div>
          <div className="window-body"><div className="window-title">SESI LOKAL</div><div className="window-bars"><b /><b /><b /><b /></div><div className="window-status"><span /><em>terpasang</em><strong>12 ms</strong></div></div>
        </div>
      </div>
      <div className="specimen-phone">
        <div className="phone-speaker" />
        <div className="phone-screen"><span className="phone-kicker">POCKET HUB</span><strong>09:41</strong><small>Selasa · 14 Mei</small><div className="phone-signal"><span /><span /><span /></div></div>
      </div>
      <div className="specimen-signal"><span /><span /><span /></div>
      <div className="specimen-note specimen-note-bottom"><span>02</span> sesi tepercaya</div>
    </div>
  );
}

type InstallTarget = "desktop" | "mobile";

function InstallationModal({ target, language, onClose }: { target: InstallTarget | null; language: "en" | "id"; onClose: () => void }) {
  if (!target) return null;
  const desktop = target === "desktop";
  const steps = language === "id" ? (desktop ? ["Buka halaman GitHub Releases Halo Deck.", "Unduh installer sesuai sistem operasi komputer.", "Jalankan installer dan izinkan akses jaringan Private saat diminta.", "Buka Desktop Hub, lalu biarkan QR pairing tetap terlihat."] : ["Buka halaman GitHub Releases Halo Deck.", "Unduh paket mobile atau buka tautan build Android/iOS.", "Pasang aplikasi dan izinkan kamera untuk scan QR.", "Pastikan HP berada di WiFi/LAN yang sama, lalu scan QR Desktop Hub."]) : (desktop ? ["Open the Halo Deck GitHub Releases page.", "Download the installer for your computer.", "Run the installer and allow Private network access when asked.", "Open Desktop Hub and keep its pairing QR visible."] : ["Open the Halo Deck GitHub Releases page.", "Download the mobile package or open the Android/iOS build link.", "Install the app and allow camera access for QR scanning.", "Join the same WiFi/LAN, then scan the Desktop Hub QR."]);
  return <div className="install-modal-backdrop" role="presentation" onClick={onClose}><div className="install-modal" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={(event) => event.stopPropagation()}><div className="install-modal-top"><ProtocolTag tone="apricot">{desktop ? "DESKTOP HUB" : "POCKET HUB"}</ProtocolTag><button className="modal-close" onClick={onClose} aria-label="Close installation guide"><X size={18} /></button></div><h2 id="install-title">{language === "id" ? `Pasang ${desktop ? "Desktop Hub" : "Pocket Hub"}` : `Install ${desktop ? "Desktop Hub" : "Pocket Hub"}`}</h2><p>{language === "id" ? "Ikuti empat langkah ini sebelum mulai pairing di jaringan lokal." : "Follow these four steps before pairing on the local network."}</p><div className="install-steps">{steps.map((step, index) => <div className="install-step" key={step}><span>0{index + 1}</span><i /><p>{step}</p></div>)}</div><a className="button button-ink button-full" href="https://github.com/jafit1/Halo-Deck/releases" target="_blank" rel="noreferrer">{language === "id" ? "Buka GitHub Releases" : "Open GitHub Releases"} <ArrowUpRight size={15} /></a><small className="install-note">{language === "id" ? "File installer akan tersedia di halaman Releases." : "Installer files will be available on the Releases page."}</small></div></div>;
}

function DownloadSection({ copy, onOpenInstall }: { copy: typeof localeCopy.en; onOpenInstall: (target: InstallTarget) => void }) {
  return <section id="downloads" className="download-strip"><div className="download-inner"><div className="download-copy"><ProtocolTag tone="apricot">{copy.download}</ProtocolTag><h2>{copy.download}</h2><p>{copy === localeCopy.id ? "Desktop Hub menjaga server lokal tetap terbuka. Pocket Hub membawa kendali ke tangan Anda. Panduan instalasi akan muncul sebelum Anda membuka release." : "Desktop Hub keeps the local server open. Pocket Hub brings the controls with you. An installation guide appears before you open the release."}</p></div><div className="download-actions"><button className="download-card" onClick={() => onOpenInstall("desktop")}><span className="download-icon"><Monitor size={18} /></span><span><strong>{copy.desktop}</strong><small>Windows / macOS / Linux</small></span><Download size={16} /></button><button className="download-card" onClick={() => onOpenInstall("mobile")}><span className="download-icon mobile"><Smartphone size={18} /></span><span><strong>{copy.mobile}</strong><small>Android / iOS via releases</small></span><Download size={16} /></button><a className="release-link" href="https://github.com/jafit1/Halo-Deck/releases" target="_blank" rel="noreferrer">{copy.releases} <ArrowUpRight size={14} /></a></div></div></section>;
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
  const scanLabel = demoStep === 1 ? "MEMINDAI QR" : demoStep === 2 ? "MEMVERIFIKASI PIN" : demoStep === 3 ? "MENGUNCI SESI" : "SIAP PAIRING";

  return (
    <div className="demo-shell">
      <div className="demo-copy">
        <div className="demo-header"><div><ProtocolTag tone="apricot">LIVE / SIMULASI</ProtocolTag><h3>Lihat alur lokal.</h3></div><div className="demo-latency"><CircleDot size={12} /> 12 ms <span>LAN</span></div></div>
        <p className="body-copy">Bukti interaktif dari ide produk: satu pairing, tiga mode berguna, tanpa ketergantungan pada internet.</p>
        <div className="mode-tabs" role="tablist" aria-label="Mode Halo Deck">
          {(Object.keys(modeData) as DemoMode[]).map((item) => { const ItemIcon = modeData[item].icon; return <button key={item} className={mode === item ? "mode-tab active" : "mode-tab"} onClick={() => setMode(item)} role="tab" aria-selected={mode === item}><ItemIcon size={15} />{modeData[item].label}</button>; })}
        </div>
        <div className="demo-detail"><div className="detail-icon"><Icon size={20} /></div><div><h4>{data.title}</h4><p>{data.detail}</p></div></div>
        <button className="button button-blue" onClick={runDemo} disabled={playing}><Play size={15} fill="currentColor" /> {playing ? "Pairing sedang berjalan…" : "Jalankan demo pairing"}</button>
      </div>
      <div className="demo-visual">
        <div className="demo-console-bar"><span className="live-dot" /> <span>POCKET HUB</span><span className="console-right">{demoStep >= 4 ? "TERHUBUNG" : "MENUNGGU"}</span></div>
        <div className="demo-console-body">
          {demoStep < 4 && <div className={`qr-scan-panel ${demoStep > 0 ? "scanning" : ""}`}><div className="qr-scan-code" aria-label="Simulasi QR pairing">{qrCells.map((_, index) => <i key={index} className={(index * 17 + index * index + 3) % 7 < 3 || [0, 1, 2, 8, 9, 10, 70, 71, 72, 78, 79, 80].includes(index) ? "qr-cell filled" : "qr-cell"} />)}<span className="qr-corner qr-corner-tl" /><span className="qr-corner qr-corner-tr" /><span className="qr-corner qr-corner-bl" />{demoStep > 0 && <span className="qr-scan-beam" />}</div><div className="qr-scan-copy"><ProtocolTag tone="apricot">{scanLabel}</ProtocolTag><strong>KODE PAIRING</strong><span>6 4 1 2 0 8</span><small>Arahkan Pocket Hub ke sini.<br />Token tidak keluar dari LAN.</small></div></div>}
          {demoStep >= 4 && <div className="pair-complete"><div className="pair-complete-icon"><Check size={25} /></div><ProtocolTag tone="apricot">SESI SIAP</ProtocolTag><strong>Terhubung di LAN</strong><span>Desktop Hub ↔ Pocket Hub</span><div className="pair-complete-meta"><span><KeyRound size={12} /> token terkunci</span><span><Zap size={12} /> 12 ms</span></div></div>}
          {mode === "screen" && <div className="mini-screen"><div className="mini-screen-top"><span>LAYAR TAMBAHAN</span><span>FRAME 12 / dtk</span></div><div className="mini-screen-grid"><span /><span /><span /><span /><span /><span /></div><div className="mini-cursor" /></div>}
          {mode === "clock" && <div className="mini-clock"><strong>09:41</strong><span>Selasa, 14 Mei</span><i>JAM / GELAP</i></div>}
          {mode === "trackpad" && <div className="mini-trackpad"><MousePointer2 className="mini-pointer" size={26} /><span>GESER / TAP / SCROLL</span><div className="mini-track-lines"><i /><i /><i /></div></div>}
          <div className="console-state"><div><span className={demoStep >= 1 ? "state-check active" : "state-check"}>{demoStep >= 1 ? <Check size={11} /> : "01"}</span><small>QR dipindai</small></div><div><span className={demoStep >= 2 ? "state-check active" : "state-check"}>{demoStep >= 2 ? <Check size={11} /> : "02"}</span><small>Token terkunci</small></div><div><span className={demoStep >= 3 ? "state-check active" : "state-check"}>{demoStep >= 3 ? <Check size={11} /> : "03"}</span><small>Siap di LAN</small></div></div>
        </div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  const [active, setActive] = useState<DemoMode>("screen");
  const feature = featureData[active];
  const Icon = feature.icon;
  return <section id="features" className="section section-features"><div className="section-inner"><SectionMarker number="03" label="KUMPULAN FITUR" /><div className="features-heading"><div><h2>Satu sesi.<br /><em>Tiga peran.</em></h2></div><p>Setiap mode menjawab pertanyaan lokal yang sama: apa yang membuat komputer lebih berguna saat ini?</p></div><div className="features-layout"><div className="feature-selector" role="tablist" aria-label="Fitur Halo Deck">{(Object.keys(featureData) as DemoMode[]).map((item, index) => { const ItemIcon = featureData[item].icon; return <button key={item} className={active === item ? "feature-card active" : "feature-card"} onClick={() => setActive(item)} role="tab" aria-selected={active === item}><span className="feature-number">0{index + 1}</span><span className="feature-icon"><ItemIcon size={19} /></span><span className="feature-card-copy"><strong>{item === "screen" ? "LAYAR TAMBAHAN" : item === "trackpad" ? "TRACKPAD + INPUT" : "JAM AMBIENT"}</strong><small>{item === "screen" ? "Permukaan visual" : item === "trackpad" ? "Permukaan kendali" : "Permukaan ambient"}</small></span><ArrowUpRight className="feature-card-arrow" size={17} /></button>; })}</div><div className="feature-stage"><div className="feature-stage-top"><ProtocolTag tone="apricot">{feature.kicker}</ProtocolTag><span className="feature-stage-live"><span /> FITUR AKTIF</span></div><div className="feature-stage-visual"><div className={`feature-orb feature-orb-${active}`}><Icon size={32} /></div><div className="feature-scan-line" /><span className="feature-coordinate">LOKAL / 0{(Object.keys(featureData) as DemoMode[]).indexOf(active) + 1} / SIAP</span>{active === "screen" && <div className="feature-window"><i /><i /><i /><b /><b /><b /></div>}{active === "trackpad" && <MousePointer2 className="feature-cursor" size={29} />}{active === "clock" && <div className="feature-time">09:41<small>AMBIENT</small></div>}</div><h3>{feature.title}</h3><p>{feature.detail}</p><div className="feature-metrics">{feature.metrics.map((metric) => <span key={metric}><Check size={13} /> {metric}</span>)}</div></div></div></div></section>;
}

function TrackpadSimulator() {
  const [pointer, setPointer] = useState({ x: 50, y: 48 });
  const [clicks, setClicks] = useState(0);
  const [scrolls, setScrolls] = useState(0);
  const [gesture, setGesture] = useState("Move pointer");
  const [pinchDistance, setPinchDistance] = useState<number | null>(null);
  const distance = (touches: React.TouchList) => touches.length < 2 ? 0 : Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  return <div className="mode-sim-card"><div className="mode-sim-head"><div><ProtocolTag tone="apricot">COBA / TRACKPAD</ProtocolTag><h3>Gerakkan sendiri.</h3></div><span className="sim-status"><span /> INPUT LANGSUNG</span></div><div className="trackpad-surface" onPointerMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setPointer({ x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 }); setGesture("Gerak pointer"); }} onPointerDown={() => { setClicks((value) => value + 1); setGesture("Tap / klik terdeteksi"); }} onWheel={(event) => { event.preventDefault(); setScrolls((value) => value + (event.deltaY > 0 ? 1 : -1)); setGesture("Scroll dua jari"); }} onTouchStart={(event) => { if (event.touches.length === 2) { setPinchDistance(distance(event.touches)); setGesture("Pinch siap"); } else { setGesture("Swipe siap"); } }} onTouchMove={(event) => { event.preventDefault(); if (event.touches.length === 2) { const nextDistance = distance(event.touches); setGesture(pinchDistance && nextDistance > pinchDistance + 7 ? "Pinch keluar" : pinchDistance && nextDistance < pinchDistance - 7 ? "Pinch masuk" : "Pinch aktif"); } else if (event.touches.length === 1) { setGesture("Swipe / gerak pointer"); } }} onTouchEnd={() => { setPinchDistance(null); setGesture("Gestur siap"); }}><div className="trackpad-grid" /><MousePointer2 className="trackpad-cursor" style={{ left: `${pointer.x}%`, top: `${pointer.y}%` }} size={24} /><span className="trackpad-hint"><Hand size={14} /> Geser, tap, atau pinch di sini</span><span className="trackpad-coordinates">Δ x {Math.round(pointer.x - 50)} · Δ y {Math.round(pointer.y - 50)}</span></div><div className="sim-metrics"><span><MousePointer2 size={13} /> {gesture}</span><span><Check size={13} /> {clicks} klik</span><span><ArrowDown size={13} /> {scrolls} scroll</span></div></div>;
}

function AmbientSimulator() {
  const [now, setNow] = useState(() => new Date());
  const [clockTheme, setClockTheme] = useState<"midnight" | "ember">("midnight");
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  return <div className="mode-sim-card"><div className="mode-sim-head"><div><ProtocolTag tone="apricot">TRY / AMBIENT CLOCK</ProtocolTag><h3>Let it breathe.</h3></div><button className="clock-theme-toggle" onClick={() => setClockTheme((value) => value === "midnight" ? "ember" : "midnight")} aria-label="Change clock theme"><Sun size={14} /> theme</button></div><div className={`ambient-surface ${clockTheme}`}><span className="ambient-label">POCKET HUB / AMBIENT</span><strong>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong><span>{now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}</span><i>{clockTheme === "midnight" ? "MIDNIGHT BLUE" : "EMBER ROOM"}</i></div><div className="sim-metrics"><span><Timer size={13} /> ticking live</span><span><Sun size={13} /> tap theme</span><span><Wifi size={13} /> session idle</span></div></div>;
}

function ModeSimulations() {
  return <section id="try-modes" className="section section-simulators"><div className="section-inner"><SectionMarker number="04" label="COBA PERMUKAANNYA" /><div className="sim-heading"><h2>Sentuh idenya.<br /><em>Rasakan modenya.</em></h2><p>Simulasi di browser ini membuat dua keadaan sentuh terasa nyata: gerakkan kursor di permukaan trackpad, atau biarkan jam berjalan saat sesi idle.</p></div><div className="sim-grid"><TrackpadSimulator /><AmbientSimulator /></div></div></section>;
}

function ConnectionPaths() {
  return <section id="connect" className="section section-connect"><div className="section-inner"><SectionMarker number="05" label="CARA TERHUBUNG" /><div className="connect-heading"><h2>Dua jalur masuk.<br /><em>Satu sesi tepercaya.</em></h2><p>Pilih alur yang paling sesuai. QR adalah handshake cepat dan terlihat. mDNS adalah jalur tenang untuk perangkat yang sudah berada di jaringan yang sama.</p></div><div className="connection-grid"><div className="connection-card connection-qr"><div className="connection-card-top"><span className="connection-badge"><QrCode size={15} /> TERCEPAT</span><span>01 / 04</span></div><h3>Scan QR.</h3><p>Desktop Hub menampilkan QR satu kali berisi endpoint LAN, ID pairing, dan PIN. Pocket Hub memindainya, memverifikasi desktop, lalu menerima token sesi baru.</p><div className="connection-steps"><span><b>01</b> Tampilkan QR</span><ArrowRight size={14} /><span><b>02</b> Scan</span><ArrowRight size={14} /><span><b>03</b> Konfirmasi</span></div><div className="mini-qr-grid">{Array.from({ length: 49 }).map((_, index) => <i key={index} className={(index * 13 + index * index) % 5 < 2 ? "filled" : ""} />)}</div></div><div className="connection-card connection-mdns"><div className="connection-card-top"><span className="connection-badge blue"><Network size={15} /> AUTO-DISCOVERY</span><span>02 / 04</span></div><h3>Temukan di sekitar.</h3><p>Bonjour/mDNS mengiklankan Desktop Hub di jaringan yang sama. Pocket Hub dapat menampilkan desktop terdekat, tetapi tetap meminta konfirmasi pairing secara eksplisit.</p><div className="mdns-radar"><div className="radar-ring ring-one" /><div className="radar-ring ring-two" /><div className="radar-center"><Server size={16} /></div><span className="radar-node node-a"><Monitor size={12} /></span><span className="radar-node node-b"><Smartphone size={12} /></span></div><div className="mdns-foot"><Wifi size={13} /> WiFi / LAN yang sama <span>·</span> tanpa relay cloud</div></div></div><div className="connect-note"><ShieldCheck size={17} /><span><strong>Persetujuan tetap terlihat.</strong> Discovery hanya menemukan desktop; QR atau PIN memberi izin bagi HP untuk bertahan di sesi.</span></div></div></section>;
}

function UsageTutorial() {
  const steps = [
    { icon: Power, number: "01", title: "Jalankan Desktop Hub", text: "Buka Halo Deck di komputer. Biarkan jendela Desktop Hub terbuka agar QR dan kode pairing satu kali tetap terlihat." },
    { icon: Wifi, number: "02", title: "Gunakan jaringan yang sama", text: "Hubungkan komputer dan HP ke WiFi atau LAN yang sama. Internet tidak diperlukan untuk sesi lokal." },
    { icon: QrCode, number: "03", title: "Scan atau temukan", text: "Scan QR desktop untuk jalur tercepat, atau gunakan Desktop Hub terdekat yang ditemukan melalui Bonjour/mDNS." },
    { icon: ShieldCheck, number: "04", title: "Tunggu status terhubung", text: "Demo menampilkan QR dipindai, PIN diverifikasi, token sesi dikunci, lalu terhubung. Di aplikasi nyata, terima hanya desktop yang Anda kenali." },
    { icon: Monitor, number: "05", title: "Pilih mode", text: "Buka Layar Tambahan, Trackpad, atau Jam Ambient. Berganti mode tidak memerlukan pairing ulang." },
  ];
  return <section id="guide" className="section section-guide"><div className="section-inner"><SectionMarker number="06" label="GUNAKAN DALAM LIMA LANGKAH" /><div className="guide-heading"><h2>Dari QR ke<br /><em>siap.</em></h2><p>Ikuti alur ini saat mencoba prototipe. Jika status connected muncul, loop pairing lokal sudah bekerja.</p></div><div className="guide-grid"><div className="guide-steps">{steps.map(({ icon: StepIcon, number, title, text }, index) => <div className="guide-step" key={number}><div className="guide-step-index"><span>{number}</span>{index < steps.length - 1 && <i />}</div><div className="guide-step-icon"><StepIcon size={17} /></div><div><h3>{title}</h3><p>{text}</p></div></div>)}</div><div className="guide-result"><div className="guide-result-top"><span className="live-dot" /> CEK BERHASIL</div><div className="guide-result-screen"><div className="guide-result-check"><Check size={23} /></div><strong>Terhubung di LAN</strong><span>Halo Deck / sesi tepercaya</span><div className="guide-result-pills"><b>12 ms</b><b>TANPA CLOUD</b><b>SIAP</b></div></div><div className="guide-warning"><CircleAlert size={15} /><span>Jika tidak terhubung, pastikan WiFi sama, izinkan aplikasi desktop di firewall jaringan Private, lalu scan ulang QR baru.</span></div></div></div></div></section>;
}

function ArchitectureDiagram() {
  return <div className="architecture-diagram"><div className="arch-node arch-desktop"><div className="arch-icon"><Monitor size={19} /></div><div><ProtocolTag>DESKTOP HUB</ProtocolTag><h4>Server lokal</h4><p>Electron · WebSocket · Bonjour</p></div><span className="node-port">:47777</span></div><div className="arch-connector"><div className="connector-line" /><span>WiFi / LAN yang sama</span><div className="connector-arrow"><ArrowDown size={14} /></div></div><div className="arch-node arch-mobile"><div className="arch-icon"><Smartphone size={19} /></div><div><ProtocolTag tone="apricot">POCKET HUB</ProtocolTag><h4>Klien tepercaya</h4><p>Expo · QR pairing · input sentuh</p></div><span className="node-port">3 mode</span></div><div className="arch-footnote"><Wifi size={14} /> Tanpa relay cloud. Tanpa akun. Tanpa putaran jauh.</div></div>;
}

function SecurityFlow() {
  const steps = [
    { icon: ScanLine, label: "Scan sekali", text: "QR membawa endpoint LAN, ID pairing, dan PIN satu kali." },
    { icon: LockKeyhole, label: "Kunci token", text: "Desktop menyegel token sesi baru dengan kunci yang diturunkan dari PIN." },
    { icon: ShieldCheck, label: "Percayai sesi", text: "Hanya socket terautentikasi yang dapat mengirim input atau menerima frame layar." },
  ];
  return <div className="security-flow">{steps.map(({ icon: StepIcon, label, text }, index) => <div className="security-step" key={label}><div className="security-step-top"><span>0{index + 1}</span><StepIcon size={17} /></div><h4>{label}</h4><p>{text}</p>{index < steps.length - 1 && <div className="step-rule" />}</div>)}</div>;
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  const copy = () => { navigator.clipboard?.writeText(code); toast.success("Copied to clipboard", { description: title }); };
  return <div className="code-block"><div className="code-head"><span><Terminal size={13} /> {title}</span><button onClick={copy} aria-label={`Copy ${title}`}><Copy size={13} /> Copy</button></div><pre><code>{code}</code></pre></div>;
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [isDark, setIsDark] = useState(() => { const themeParam = new URLSearchParams(window.location.search).get("theme"); return themeParam ? themeParam === "dark" : window.localStorage.getItem("halo-deck-theme") === "dark"; });
  const [language, setLanguage] = useState<"en" | "id">(() => new URLSearchParams(window.location.search).get("lang") === "en" ? "en" : (window.localStorage.getItem("halo-deck-language") as "en" | "id") || "id");
  const [installTarget, setInstallTarget] = useState<InstallTarget | null>(null);
  const copy = localeCopy[language];
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 16); window.addEventListener("scroll", onScroll); return () => window.removeEventListener("scroll", onScroll); }, []);
  useEffect(() => { document.documentElement.dataset.haloTheme = isDark ? "dark" : "light"; window.localStorage.setItem("halo-deck-theme", isDark ? "dark" : "light"); }, [isDark]);
  useEffect(() => { window.localStorage.setItem("halo-deck-language", language); document.documentElement.lang = language === "id" ? "id" : "en"; }, [language]);

  return <div className={isDark ? "site-shell dark-site" : "site-shell"}>
    <div className="signal-spine" aria-hidden="true"><span>01</span><i /><b /><i /><b /><i /><b /><i /><b /><span>06</span></div>
    <header className={scrolled ? "site-nav scrolled" : "site-nav"}>
      <a className="brand" href="#top"><ProductMark /><span><strong>HALO</strong> Deck</span></a>
      <nav className="nav-links" aria-label="Primary"><a href="#demo">{copy.demo}</a><a href="#features">{copy.features}</a><a href="#try-modes">Try modes</a><a href="#connect">{copy.connect}</a><a href="#guide">{copy.tutorial}</a><a href="#architecture">{copy.architecture}</a><a href="#docs">{copy.docs}</a></nav>
      <div className="nav-end"><span className="local-badge"><span /> LOCAL / NO CLOUD</span><button className="language-toggle" onClick={() => setLanguage((value) => value === "en" ? "id" : "en")} aria-label="Change language"><Globe2 size={14} /><span>{language === "en" ? "EN" : "ID"}</span></button><button className="theme-toggle" onClick={() => setIsDark((value) => !value)} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"} title={isDark ? "Switch to light mode" : "Switch to dark mode"}>{isDark ? <Sun size={15} /> : <Moon size={15} />}<span>{isDark ? copy.light : copy.dark}</span></button><a className="nav-github" href="https://github.com/jafit1/Halo-Deck" target="_blank" rel="noreferrer" aria-label="Open Halo Deck on GitHub"><Github size={16} /></a></div>
    </header>

    <main id="top">
      <section className="hero-section">
        <div className="hero-inner"><div className="hero-rail"><span>01</span><div /><span>LOCAL-FIRST</span></div><div className="hero-content"><div className="eyebrow-row"><ProtocolTag>DESKTOP + MOBILE</ProtocolTag><span className="eyebrow-line" /><span className="eyebrow-text">Sistem pendamping untuk perangkat di sekitar</span></div><h1>HP Anda sudah menjadi layar.<em>Beri ia peran.</em></h1><p className="hero-lede">{copy.hero}</p><div className="hero-actions"><a href="#demo" className="button button-ink">{copy.explore} <ArrowDown size={16} /></a><a href="#docs" className="text-link">{copy.guide} <ArrowUpRight size={15} /></a></div><div className="hero-meta"><div><span className="meta-number">01</span><span>WebSocket<br />di LAN</span></div><div><span className="meta-number">02</span><span>QR pairing<br />per sesi</span></div><div><span className="meta-number">03</span><span>Tiga mode<br />satu klien</span></div></div></div><div className="hero-visual"><div className="hero-image-wrap"><img src={HERO_IMAGE} alt="Komputer dan HP terhubung melalui sinyal lokal" /><div className="hero-image-caption"><span>FIG. 01 / ALUR LOKAL</span><span>TANPA INTERNET</span></div></div><DeviceSpecimen /></div></div>
      </section>

      <DownloadSection copy={copy} onOpenInstall={setInstallTarget} />

      <section id="demo" className="section section-demo"><div className="section-inner"><SectionMarker number="02" label="PRODUK DALAM GERAK" /><div className="section-heading"><h2>Sistem kecil.<br /><em>Permukaan berguna.</em></h2><p>Lihat ide utamanya bekerja: desktop membuka pintu lokal privat, HP membuktikan bahwa ia memiliki kunci, lalu permukaan berganti peran tanpa pairing ulang.</p></div><LiveDemo /></div></section>

      <FeaturesSection />

      <ModeSimulations />

      <ConnectionPaths />

      <UsageTutorial />

      <section id="architecture" className="section section-architecture"><div className="section-inner"><SectionMarker number="07" label="PETA SISTEM" /><div className="architecture-layout"><div><div className="section-heading compact"><h2>Internet<br /><em>tidak ikut campur.</em></h2><p>Dua aplikasi, satu jaringan terdekat, dan satu protokol yang sengaja kecil. Arsitekturnya berangkat dari fakta bahwa perangkat Anda sudah berada di ruangan yang sama.</p></div><div className="fact-list"><div><Radio size={16} /><span><strong>Discovery</strong> Bonjour/mDNS mengiklankan desktop; QR tetap menjadi fallback tercepat.</span></div><div><Zap size={16} /><span><strong>Input</strong> Delta mouse memakai paket biner, bukan JSON yang verbose.</span></div><div><RotateCw size={16} /><span><strong>Pemulihan</strong> Klien mobile mencoba kembali ke endpoint tepercaya setelah WiFi terputus sebentar.</span></div></div></div><ArchitectureDiagram /></div></div></section>

      <section className="section section-security"><div className="section-inner"><SectionMarker number="08" label="KEPERCAYAAN DENGAN SENGAJA" /><div className="security-layout"><div className="security-intro"><ProtocolTag tone="apricot">PAIRING / AUTH / SESI</ProtocolTag><h2>Jaringan terdekat bukan berarti bebas akses.</h2><p>Halo Deck memperlakukan pairing sebagai handshake yang disengaja, bukan port terbuka. QR membuat persetujuan terlihat: orang di depan desktop menentukan HP mana yang masuk ke sesi.</p><a href="#docs" className="text-link">Baca catatan keamanan <ArrowUpRight size={15} /></a></div><SecurityFlow /></div></div></section>

      <section className="section section-modes"><div className="section-inner"><SectionMarker number="09" label="TIGA PERMUKAAN" /><div className="mode-grid"><div className="mode-intro"><h2>Satu HP.<br /><em>Tiga suasana berguna.</em></h2><p>Klien tetap sederhana dengan sengaja. Ganti mode seketika, pertahankan sesi, dan biarkan HP menyesuaikan momen.</p></div>{(Object.keys(modeData) as DemoMode[]).map((item, index) => { const ItemIcon = modeData[item].icon; return <div className="mode-specimen" key={item}><span className="mode-index">0{index + 1}</span><ItemIcon size={22} /><h3>{modeData[item].label}</h3><p>{modeData[item].detail}</p><span className="mode-arrow"><ArrowUpRight size={16} /></span></div>; })}</div></div></section>

      <section id="docs" className="section section-docs"><div className="section-inner"><SectionMarker number="10" label="PANDUAN TEKNIS" /><div className="docs-heading"><div><h2>Dokumentasi untuk<br /><em>yang ingin tahu alasannya.</em></h2></div><p>Mulai dari model transport, lalu ikuti sesi dari QR hingga input. Kodenya sengaja cukup kecil untuk dibaca dalam satu duduk.</p></div><div className="docs-grid"><div className="docs-copy"><details open><summary><span>01</span> Permukaan runtime <ChevronDown size={16} /></summary><div><p>Electron bertindak sebagai server desktop pada port <code>47777</code>. Expo bertindak sebagai klien mobile. Keduanya dapat berjalan tanpa layanan cloud setelah HP dan komputer berada di segmen WiFi atau LAN yang sama.</p><CodeBlock title="desktop / package.json" code={`"main": "main.js"\n"port": 47777\n"transport": "WebSocket"`} /></div></details><details><summary><span>02</span> Model pairing <ChevronDown size={16} /></summary><div><p>Setiap peluncuran desktop membuat ID pairing, PIN enam digit, dan token sesi baru. Token disegel dengan <code>secretbox</code> menggunakan kunci SHA-256 yang diturunkan dari PIN.</p></div></details><details><summary><span>03</span> Jalur layar <ChevronDown size={16} /></summary><div><p>MVP menangkap area layar yang dipilih dan mengirim frame JPEG melalui socket terautentikasi. Jalur produksinya dapat berkembang menuju WebRTC dan H.264 dengan akselerasi hardware.</p></div></details></div><div className="docs-callout"><div className="callout-top"><Terminal size={17} /><ProtocolTag>MULAI CEPAT</ProtocolTag></div><h3>Coba proyek secara lokal.</h3><p>Jalankan Desktop Hub, mulai klien Expo, lalu scan QR. README memuat perintah lengkap dan daftar jujur tentang bagian yang masih prototipe.</p><CodeBlock title="desktop" code={`cd desktop\nnpm install\nnpm start`} /><CodeBlock title="mobile" code={`cd mobile\nnpm install\nnpx expo start`} /><a className="button button-ink button-full" href="#top">Kembali ke sinyal <ArrowUpRight size={15} /></a></div></div></div></section>

      <section className="closing-section"><div className="closing-inner"><div className="closing-mark"><ProductMark /></div><div><ProtocolTag tone="apricot">LOKAL SEJAK AWAL</ProtocolTag><h2>Jaga hal yang berguna<br /><em>tetap dekat.</em></h2><p>Halo Deck adalah eksperimen kecil untuk menjadikan kedekatan sebagai sebuah fitur.</p></div><a className="button button-ink" href="#demo">Jalankan demo <ArrowUpRight size={16} /></a></div></section>
    </main>

    <footer className="site-footer"><div className="footer-brand"><ProductMark /><span><strong>HALO</strong> Deck</span></div><span>Dibuat untuk perangkat terdekat, bukan cloud yang jauh.</span><span className="footer-mono">LOKAL / 47777 / SIAP</span></footer>
    <InstallationModal target={installTarget} language={language} onClose={() => setInstallTarget(null)} />
  </div>;
}
