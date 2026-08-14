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

## Tutorial penggunaan

Buka website Halo Deck lalu gulir ke bagian **Demo** untuk melihat alur pairing simulasi. Tekan **Run pairing demo** dan amati urutan `QR scanned`, `Token sealed`, hingga `Ready on LAN`. Gunakan tab Extended Display, Trackpad, dan Ambient Clock untuk melihat bagaimana satu sesi dapat berpindah mode tanpa pairing ulang.

Untuk mencoba aplikasi companion yang sebenarnya, jalankan Desktop Hub terlebih dahulu. Pastikan QR pairing dan kode satu kali terlihat pada komputer. Sambungkan komputer dan HP ke WiFi atau LAN yang sama; koneksi internet tidak diperlukan.

Pada HP, buka Pocket Hub dan berikan izin kamera. Pilih **Scan QR**, arahkan kamera ke QR Desktop Hub, lalu tunggu proses verifikasi. Pairing yang berhasil akan melewati empat keadaan: QR terbaca, PIN diverifikasi, token sesi disegel, dan status berubah menjadi **Connected**. Setelah itu pilih mode **Extended Display**, **Trackpad**, atau **Ambient Clock** dari navigasi mobile.

Jika aplikasi mobile mendukung auto-discovery, gunakan daftar Desktop Hub yang muncul melalui Bonjour/mDNS. Discovery hanya menemukan komputer di jaringan lokal; konfirmasi QR atau PIN tetap diperlukan agar perangkat yang kebetulan berada di WiFi yang sama tidak otomatis mendapat akses.

Jika status tidak berubah menjadi connected, periksa tiga hal: kedua perangkat berada pada jaringan yang sama, firewall desktop mengizinkan koneksi pada jaringan **Private**, dan QR yang dipindai masih berasal dari proses Desktop Hub yang sedang berjalan. Tutup dan buka ulang Desktop Hub untuk membuat pairing ID, PIN, dan token baru, kemudian scan ulang.

## Repository

The source is maintained at [github.com/jafit1/Halo-Deck](https://github.com/jafit1/Halo-Deck).

## LAN bridge reference implementation

The complete Electron + Flutter reference, including WebSocket pairing, Bonjour/mDNS discovery, binary input packets, WebRTC signaling, screen capture, and LAN tuning notes is in [`examples/lan-bridge/README.md`](examples/lan-bridge/README.md). The desktop example can be syntax-checked with `npm install && npm run check`; the Flutter example should be validated with `flutter pub get` and `flutter analyze` on a machine with the Flutter SDK installed.
