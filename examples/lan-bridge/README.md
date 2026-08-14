# Halo Deck LAN Bridge — Electron + Flutter

Dokumen ini berisi implementasi referensi untuk menyambungkan Desktop Hub Electron dengan Pocket Hub Flutter pada WiFi/LAN yang sama. Contoh ini memakai WebSocket sebagai control/signaling channel, Bonjour/mDNS untuk menemukan Desktop Hub, QR untuk pairing cepat, dan WebRTC untuk mengirim layar.

> **Penting:** contoh ini adalah fondasi teknis yang dapat dijalankan dan dikembangkan, bukan paket installer produksi. PIN hanya dibagikan melalui QR atau input manual, bukan TXT record mDNS. Untuk produksi, tambahkan rate limit PIN, penyimpanan token yang aman, rotasi token, validasi origin/device, dan logging yang tidak mencetak rahasia.

## Struktur

| Bagian | Peran |
| --- | --- |
| `desktop/main.mjs` | Bootstrap Electron, permission screen capture, dan bridge IPC. |
| `desktop/server.mjs` | WebSocket server LAN, pairing, relay signaling, dan mDNS advertisement. |
| `desktop/protocol.mjs` | Header paket biner untuk input mouse/scroll/keyboard. |
| `desktop/renderer/renderer.mjs` | Offerer WebRTC: capture layar, buat offer, dan kirim ICE. |
| `mobile/lib/discovery.dart` | Discovery `_halodeck._tcp` menggunakan mDNS. |
| `mobile/lib/connection.dart` | Pairing, reconnect, ping, signaling, dan paket biner. |
| `mobile/lib/webrtc_receiver.dart` | Answerer WebRTC dan renderer video. |
| `mobile/lib/main.dart` | QR scanner, daftar Desktop Hub, dan prompt PIN mDNS. |

## 1. Jalankan Desktop Hub

Di folder `examples/lan-bridge/desktop`, pasang dependency dan jalankan pemeriksaan syntax.

```bash
npm install
npm run check
npm start
```

Desktop Hub membuka WebSocket pada port `47777`, mengiklankan `_halodeck._tcp.local`, membuat `pairId` dan PIN enam digit baru, lalu menampilkan QR berisi endpoint LAN, `pairId`, dan PIN. Pastikan Windows Firewall mengizinkan aplikasi pada jaringan **Private**. Di macOS, izinkan Screen Recording untuk aplikasi Electron ketika diminta.

Desktop Hub memprioritaskan alamat WiFi/Ethernet private seperti `192.168.x.x`, `10.x.x.x`, atau `172.16–31.x.x`. Alamat Tailscale `100.x.x.x` dan interface virtual lain tidak dipilih jika ada alamat WiFi LAN. Jika laptop memiliki konfigurasi jaringan khusus, Anda dapat menetapkan alamat secara eksplisit di PowerShell sebelum menjalankan aplikasi:

```powershell
$env:HALO_DECK_LAN_HOST="192.168.1.25"
npm start
```

Setelah perbaikan ini, QR pada laptop pengguna dengan WiFi `192.168.1.25` seharusnya menampilkan `ws://192.168.1.25:47777`, bukan alamat Tailscale `100.111.64.66`.

Electron menggunakan `desktopCapturer.getSources()` sebagai bagian dari permission handler, lalu renderer meminta `navigator.mediaDevices.getDisplayMedia()`. Pola ini mengikuti dokumentasi resmi Electron untuk mengambil source window/screen melalui `getUserMedia()`/`getDisplayMedia()`.[1]

## 2. Jalankan Pocket Hub Flutter

Di folder `examples/lan-bridge/mobile`, buat proyek Flutter kosong atau salin file `lib/` dan `pubspec.yaml` ini ke proyek Anda.

```bash
flutter pub get
flutter analyze
flutter run
```

Pilih **Scan QR** untuk pairing tercepat. Mobile Scanner membaca JSON QR dan membuka WebSocket ke alamat `ws://LAN_IP:47777`. Jika memilih Desktop Hub dari mDNS, aplikasi meminta PIN secara manual. PIN tidak pernah diiklankan oleh mDNS.

Untuk Android, deklarasikan permission berikut di `android/app/src/main/AndroidManifest.xml`.

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CAMERA" />
```

Untuk iOS, tambahkan `NSCameraUsageDescription` pada `ios/Runner/Info.plist`. `flutter_webrtc` juga memiliki konfigurasi platform tambahan untuk screen capture, release Proguard, dan versi SDK tertentu; periksa halaman paket sebelum membuat release final.[2]

## 3. Urutan pairing

Pertama, mobile membuka socket dan menerima `pair.challenge`. Mobile mengirim `pair.confirm` berisi `pairId`, PIN satu kali, dan `role: mobile`. Desktop membandingkan `pairId` serta PIN dengan `crypto.timingSafeEqual`, lalu mengirim `pair.accepted` dengan token sesi yang disegel.

Setelah autentikasi, data mouse dikirim sebagai paket biner dengan header `HD`, versi protokol, tipe event, lalu payload int16. JSON hanya digunakan untuk status, mode, ping, dan signaling WebRTC. Dengan demikian, gerakan pointer tidak membayar overhead parsing JSON pada setiap event.

## 4. Konfigurasi WebRTC LAN

WebRTC membutuhkan signaling, tetapi signaling bukan media transport. WebSocket yang sama dipakai hanya untuk mengirim SDP offer/answer dan ICE candidate. Media layar kemudian mengalir melalui koneksi peer-to-peer WebRTC.

Desktop bertindak sebagai **offerer**:

```js
const peer = new RTCPeerConnection({
  iceServers: [],
  bundlePolicy: 'max-bundle',
});

peer.onicecandidate = (event) => {
  if (event.candidate) socket.send(JSON.stringify({
    type: 'webrtc.ice',
    candidate: event.candidate,
  }));
};

const stream = await navigator.mediaDevices.getDisplayMedia({
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30, max: 30 },
  },
  audio: false,
});

for (const track of stream.getTracks()) peer.addTrack(track, stream);

const offer = await peer.createOffer();
await peer.setLocalDescription(offer);
socket.send(JSON.stringify({
  type: 'webrtc.offer',
  sdp: offer.sdp,
  descriptionType: 'offer',
}));
```

Flutter bertindak sebagai **answerer**:

```dart
final peer = await createPeerConnection({
  'iceServers': <Map<String, dynamic>>[],
  'sdpSemantics': 'unified-plan',
  'bundlePolicy': 'max-bundle',
}, {});

peer.onTrack = (event) {
  if (event.streams.isNotEmpty) renderer.srcObject = event.streams.first;
};

await peer.setRemoteDescription(
  RTCSessionDescription(offerSdp, 'offer'),
);
final answer = await peer.createAnswer({
  'offerToReceiveVideo': 1,
  'offerToReceiveAudio': 0,
});
await peer.setLocalDescription(answer);
sendSignal({
  'type': 'webrtc.answer',
  'sdp': answer.sdp,
  'descriptionType': 'answer',
});
```

Kedua sisi kemudian saling mengirim `webrtc.ice` dan memanggil `addIceCandidate()`. `RTCPeerConnection` memang menyediakan offer/answer, remote descriptions, dan `addIceCandidate()` untuk membangun serta memantau koneksi peer.[3]

### ICE tanpa internet

Mulai dengan `iceServers: []`. Pada jaringan rumah yang sederhana, kandidat host biasanya cukup dan tidak ada traffic media yang perlu keluar ke internet. Jika sebagian jaringan memakai client isolation, VLAN terpisah, atau NAT yang tidak langsung, tambahkan STUN internal atau TURN lokal. Jangan mengandalkan STUN/TURN publik jika requirement Anda benar-benar offline.

### Tuning latensi

Gunakan `frameRate` 30 terlebih dahulu, resolusi 1280×720 untuk HP kelas menengah, dan naikkan ke 1920×1080 setelah stabil. Untuk desktop, pilih H.264 hardware-accelerated bila codec tersedia, batasi bitrate awal sekitar 4–8 Mbps untuk 720p dan 8–15 Mbps untuk 1080p, lalu ukur `getStats()` sebelum menaikkan kualitas. Gunakan `contentHint = 'detail'` untuk desktop text/UI dan `maxFramerate` pada `RTCRtpSender.setParameters()`.

Untuk layar statis, 15–24 fps sering cukup. Untuk pointer yang terasa hidup, prioritaskan frame pacing dan input channel yang terpisah. Jangan mengirim mouse movement melalui video; tetap gunakan paket biner WebSocket atau DataChannel yang reliable/ordered untuk event kecil.

## 5. Urutan signaling lengkap

| Langkah | Pengirim | Pesan |
| --- | --- | --- |
| 1 | Mobile | `webrtc.request` |
| 2 | Desktop | `webrtc.offer` + `sdp` |
| 3 | Kedua sisi | `webrtc.ice` secara trickle |
| 4 | Mobile | `webrtc.answer` + `sdp` |
| 5 | Kedua sisi | `webrtc.ice` lanjutan |
| 6 | Desktop | Media track layar melalui WebRTC |

Kirim candidate segera setelah event `onicecandidate` terpanggil. Di sisi penerima, jika candidate datang sebelum remote description terpasang, simpan sebentar dalam queue lalu flush setelah `setRemoteDescription()` selesai. Contoh ringkas di atas mengasumsikan urutan signaling yang tertib; aplikasi produksi sebaiknya tetap memiliki queue candidate.

## 6. Pengujian lokal

Jalankan desktop dan mobile pada WiFi yang sama, bukan hotspot dengan client isolation. Pastikan alamat yang masuk QR adalah alamat IPv4 LAN seperti `192.168.x.x`, bukan `127.0.0.1`. Uji discovery mDNS terlebih dahulu, lalu uji QR sebagai fallback. Setelah connected, cek status ICE, latency ping, dan `RTCStatsReport` untuk packet loss, frame rate, dan round-trip time.

Jika tidak tersambung, periksa firewall, AP isolation, VPN yang mengubah routing, izin kamera, Screen Recording macOS, dan apakah port `47777` sudah digunakan proses lain.

## Referensi

[1]: https://www.electronjs.org/docs/latest/api/desktop-capturer "Electron desktopCapturer"
[2]: https://pub.dev/packages/flutter_webrtc "flutter_webrtc package"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection "MDN RTCPeerConnection"
[4]: https://www.npmjs.com/package/bonjour-service "bonjour-service mDNS package"
