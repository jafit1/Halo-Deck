import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'connection.dart';
import 'discovery.dart';
import 'webrtc_receiver.dart';

const ink = Color(0xFF172327);
const paper = Color(0xFFF4F1E8);
const blue = Color(0xFF9BC1C9);
const apricot = Color(0xFFF3A063);

enum PocketMode { home, display, trackpad, clock }

void main() => runApp(const HaloDeckApp());

class HaloDeckApp extends StatefulWidget {
  const HaloDeckApp({super.key});
  @override State<HaloDeckApp> createState() => _HaloDeckAppState();
}

class _HaloDeckAppState extends State<HaloDeckApp> {
  final connection = LanConnection();
  final scanner = MobileScannerController();
  StreamSubscription<String>? statusSubscription;
  SharedPreferences? preferences;
  List<HaloDeckService> services = [];
  PocketMode mode = PocketMode.home;
  String connectionStatus = 'Belum terhubung';
  String gestureStatus = 'Geser untuk menggerakkan pointer';
  String? savedAddress;
  String? savedPairId;
  String? savedPin;
  bool scanning = false;
  bool pairing = false;
  DateTime now = DateTime.now();
  Timer? clockTimer;
  LanScreenReceiver? receiver;

  @override
  void initState() {
    super.initState();
    statusSubscription = connection.status.stream.listen((value) {
      if (mounted) setState(() => connectionStatus = value);
    });
    clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => now = DateTime.now());
    });
    _loadSavedDevice();
  }

  Future<void> _loadSavedDevice() async {
    preferences = await SharedPreferences.getInstance();
    savedAddress = preferences?.getString('halo.address');
    savedPairId = preferences?.getString('halo.pairId');
    savedPin = preferences?.getString('halo.pin');
    if (savedAddress != null && savedPairId != null && savedPin != null) {
      await _connect(Uri.parse(savedAddress!), savedPairId!, savedPin!, persist: false);
    }
    if (mounted) setState(() {});
  }

  Future<void> _connect(Uri uri, String pairId, String pin, {bool persist = true}) async {
    setState(() { pairing = true; scanning = false; connectionStatus = 'Menghubungkan…'; });
    await connection.connect(uri: uri, pairId: pairId, pin: pin);
    if (persist) {
      await preferences?.setString('halo.address', uri.toString());
      await preferences?.setString('halo.pairId', pairId);
      await preferences?.setString('halo.pin', pin);
    }
    if (mounted) setState(() { pairing = false; mode = PocketMode.home; });
  }

  Future<void> _scanResult(BarcodeCapture capture) async {
    if (pairing) return;
    for (final barcode in capture.barcodes) {
      final value = barcode.rawValue;
      if (value == null) continue;
      try {
        final data = jsonDecode(value) as Map<String, dynamic>;
        if (data['address'] is String && data['pairId'] is String && data['pin'] is String) {
          await scanner.stop();
          await _connect(Uri.parse(data['address'] as String), data['pairId'] as String, data['pin'] as String);
          return;
        }
      } catch (_) {}
    }
  }

  Future<void> _discover() async {
    setState(() => connectionStatus = 'Mencari Desktop Hub…');
    final found = await discoverHaloDecks();
    if (mounted) setState(() { services = found; connectionStatus = found.isEmpty ? 'Desktop Hub tidak ditemukan' : '${found.length} Desktop Hub ditemukan'; });
  }

  Future<void> _pairDiscovered(HaloDeckService service) async {
    final controller = TextEditingController();
    final pin = await showDialog<String>(context: context, builder: (context) => AlertDialog(title: const Text('Masukkan PIN pairing'), content: TextField(controller: controller, keyboardType: TextInputType.number, maxLength: 6, decoration: const InputDecoration(labelText: 'PIN satu kali')), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')), FilledButton(onPressed: () => Navigator.pop(context, controller.text), child: const Text('Hubungkan'))]));
    controller.dispose();
    if (pin != null && pin.length == 6) await _connect(service.wsUri, service.pairId, pin);
  }

  void _openScanner() { setState(() => scanning = true); scanner.start(); }
  Future<void> _disconnect() async { await connection.disconnect(); if (mounted) setState(() { mode = PocketMode.home; pairing = false; }); }
  Future<void> _selectMode(PocketMode next) async { setState(() => mode = next); if (next == PocketMode.display && receiver == null) { receiver = LanScreenReceiver(connection); await receiver!.start(); if (mounted) setState(() {}); } }

  @override
  Widget build(BuildContext context) => MaterialApp(debugShowCheckedModeBanner: false, theme: ThemeData(useMaterial3: true, brightness: Brightness.dark, scaffoldBackgroundColor: ink, colorScheme: ColorScheme.fromSeed(seedColor: apricot, brightness: Brightness.dark)), home: Scaffold(body: SafeArea(child: scanning ? _scannerView() : _appView())));

  Widget _appView() => Column(children: [
    _topBar(),
    Expanded(child: AnimatedSwitcher(duration: const Duration(milliseconds: 220), child: switch (mode) { PocketMode.home => _homeView(), PocketMode.display => _displayView(), PocketMode.trackpad => _trackpadView(), PocketMode.clock => _clockView() })),
    if (connection.connected) _modeBar(),
  ]);

  Widget _topBar() => Padding(padding: const EdgeInsets.fromLTRB(20, 18, 20, 12), child: Row(children: [Container(width: 36, height: 36, decoration: BoxDecoration(color: const Color(0xFF0D1518), border: Border.all(color: blue)), child: const Icon(Icons.bolt, color: apricot, size: 20)), const SizedBox(width: 11), const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('HALO Deck', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)), Text('POCKET HUB', style: TextStyle(color: blue, fontSize: 9, letterSpacing: 1.4))]), const Spacer(), Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7), decoration: BoxDecoration(color: connection.connected ? const Color(0xFF20392E) : const Color(0xFF2B3030), borderRadius: BorderRadius.circular(20)), child: Row(children: [Icon(Icons.circle, size: 8, color: connection.connected ? const Color(0xFF8ED4A9) : apricot), const SizedBox(width: 7), Text(connectionStatus, style: const TextStyle(fontSize: 11))]))]));

  Widget _homeView() => SingleChildScrollView(padding: const EdgeInsets.fromLTRB(20, 12, 20, 24), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(connection.connected ? 'Sesi Anda siap.' : 'Jadikan HP\nlebih berguna.', style: const TextStyle(fontSize: 36, height: .98, fontWeight: FontWeight.w800, letterSpacing: -1.8)), const SizedBox(height: 13), Text(connection.connected ? 'Pilih mode yang ingin digunakan. Semua mode memakai sesi LAN yang sama.' : 'Hubungkan ke Halo Deck Desktop Hub di jaringan WiFi yang sama—cukup satu scan QR.', style: TextStyle(color: Colors.white.withOpacity(.64), height: 1.5, fontSize: 14)), const SizedBox(height: 23), if (!connection.connected) _pairCard() else _connectedCard(), const SizedBox(height: 18), if (services.isNotEmpty) _discoveryList() else if (!connection.connected) _discoveryButton()]));

  Widget _pairCard() => Container(width: double.infinity, padding: const EdgeInsets.all(19), decoration: BoxDecoration(color: const Color(0xFF1D3036), borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFF3E5D64))), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Row(children: [Icon(Icons.qr_code_scanner, color: apricot), SizedBox(width: 10), Text('PAIRING CEPAT', style: TextStyle(color: apricot, fontSize: 11, letterSpacing: 1.3))]), const SizedBox(height: 12), const Text('Scan QR dari Desktop Hub', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20)), const SizedBox(height: 7), Text('Alamat LAN, Pair ID, dan PIN akan diproses otomatis.', style: TextStyle(color: Colors.white.withOpacity(.6), fontSize: 12)), const SizedBox(height: 18), SizedBox(width: double.infinity, child: FilledButton.icon(onPressed: _openScanner, icon: const Icon(Icons.camera_alt_outlined), label: const Text('Scan QR sekarang'), style: FilledButton.styleFrom(backgroundColor: apricot, foregroundColor: ink, padding: const EdgeInsets.symmetric(vertical: 15))))]));

  Widget _connectedCard() => Container(width: double.infinity, padding: const EdgeInsets.all(19), decoration: BoxDecoration(color: const Color(0xFF20382F), borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFF4D7C68))), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Row(children: [Icon(Icons.check_circle_outline, color: Color(0xFF9BD5B1)), SizedBox(width: 10), Text('SESI TERPERCAYA AKTIF', style: TextStyle(color: Color(0xFF9BD5B1), fontSize: 11, letterSpacing: 1.2))]), const SizedBox(height: 12), const Text('Desktop Hub terhubung', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20)), const SizedBox(height: 6), Text(savedAddress ?? 'LAN lokal', style: TextStyle(color: Colors.white.withOpacity(.62), fontSize: 12)), const SizedBox(height: 17), SizedBox(width: double.infinity, child: OutlinedButton.icon(onPressed: _disconnect, icon: const Icon(Icons.link_off, size: 17), label: const Text('Putuskan sesi'), style: OutlinedButton.styleFrom(foregroundColor: paper, side: BorderSide(color: Colors.white.withOpacity(.25)), padding: const EdgeInsets.symmetric(vertical: 13))))]));

  Widget _discoveryButton() => SizedBox(width: double.infinity, child: OutlinedButton.icon(onPressed: _discover, icon: const Icon(Icons.wifi_find), label: const Text('Cari Desktop Hub di jaringan'), style: OutlinedButton.styleFrom(foregroundColor: blue, side: const BorderSide(color: Color(0xFF3C5960)), padding: const EdgeInsets.symmetric(vertical: 14))));
  Widget _discoveryList() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Desktop Hub di sekitar', style: TextStyle(color: Colors.white.withOpacity(.72), fontWeight: FontWeight.w600)), const SizedBox(height: 9), ...services.map((service) => Card(color: const Color(0xFF1A292D), child: ListTile(leading: const Icon(Icons.computer, color: blue), title: Text(service.name), subtitle: Text('${service.host}:${service.port}', style: const TextStyle(fontSize: 11)), trailing: const Icon(Icons.chevron_right), onTap: () => _pairDiscovered(service))))]);

  Widget _scannerView() {
    return Stack(children: [
      MobileScanner(controller: scanner, onDetect: _scanResult),
      Positioned.fill(child: IgnorePointer(child: DecoratedBox(decoration: BoxDecoration(color: Colors.black.withOpacity(.2))))),
      Center(child: Container(width: 270, height: 270, decoration: BoxDecoration(border: Border.all(color: apricot, width: 3), borderRadius: BorderRadius.circular(22)))),
      Positioned(top: 28, left: 20, right: 20, child: Row(children: [IconButton(onPressed: () async { await scanner.stop(); if (mounted) setState(() => scanning = false); }, icon: const Icon(Icons.close)), const Text('Scan QR Desktop Hub', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17))])),
      const Positioned(bottom: 45, left: 28, right: 28, child: Text('Arahkan kamera ke QR pada layar Desktop Hub. Pairing berlangsung otomatis.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 13, height: 1.4))),
    ]);
  }

  Widget _modeBar() {
    return NavigationBar(
      backgroundColor: const Color(0xFF132125),
      selectedIndex: mode.index,
      onDestinationSelected: (index) => _selectMode(PocketMode.values[index]),
      destinations: const [
        NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Home'),
        NavigationDestination(icon: Icon(Icons.monitor_outlined), selectedIcon: Icon(Icons.monitor), label: 'Layar'),
        NavigationDestination(icon: Icon(Icons.touch_app_outlined), selectedIcon: Icon(Icons.touch_app), label: 'Trackpad'),
        NavigationDestination(icon: Icon(Icons.access_time), selectedIcon: Icon(Icons.schedule), label: 'Jam'),
      ],
    );
  }

  Widget _displayView() => Container(color: Colors.black, child: receiver == null ? const Center(child: CircularProgressIndicator(color: apricot)) : Stack(children: [Center(child: RTCVideoView(receiver!.renderer, objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitContain)), Positioned(top: 18, left: 18, child: DecoratedBox(decoration: BoxDecoration(color: Colors.black.withOpacity(.65), borderRadius: BorderRadius.circular(20)), child: const Padding(padding: EdgeInsets.symmetric(horizontal: 13, vertical: 8), child: Text('LAYAR TAMBAHAN · LAN', style: TextStyle(color: blue, fontSize: 10, letterSpacing: 1.1))))]));

  Widget _trackpadView() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Trackpad', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 32, letterSpacing: -1)),
        const SizedBox(height: 7),
        Text(gestureStatus, style: TextStyle(color: Colors.white.withOpacity(.62))),
        const SizedBox(height: 20),
        Expanded(child: GestureDetector(
          onPanUpdate: (details) { connection.move(details.delta.dx.round(), details.delta.dy.round()); setState(() => gestureStatus = 'Geser pointer · ${details.delta.dx.round()}, ${details.delta.dy.round()}'); },
          onTap: () { connection.click(); setState(() => gestureStatus = 'Klik kiri'); },
          onLongPress: () { connection.click(right: true); setState(() => gestureStatus = 'Klik kanan'); },
          onScaleUpdate: (details) { if (details.pointerCount > 1) { connection.scroll(0, ((1 - details.scale) * 30).round()); setState(() => gestureStatus = details.scale > 1 ? 'Pinch keluar · scroll naik' : 'Pinch masuk · scroll turun'); } },
          child: Container(
            width: double.infinity,
            decoration: BoxDecoration(color: const Color(0xFF1B2B30), borderRadius: BorderRadius.circular(24), border: Border.all(color: const Color(0xFF3B5960)), gradient: const RadialGradient(center: Alignment(-.3, -.5), radius: 1.1, colors: [Color(0xFF29464D), Color(0xFF17262A)])),
            child: const Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.touch_app, size: 44, color: apricot), SizedBox(height: 13), Text('GESER · TAP · PINCH', style: TextStyle(letterSpacing: 1.8, fontSize: 11, color: blue)), SizedBox(height: 7), Text('Permukaan kendali lokal', style: TextStyle(color: Colors.white54, fontSize: 12))]),
          ),
        )),
        const SizedBox(height: 15),
        Row(children: [Expanded(child: OutlinedButton.icon(onPressed: () => connection.click(), icon: const Icon(Icons.mouse_outlined, size: 17), label: const Text('Klik kiri'))), const SizedBox(width: 9), Expanded(child: OutlinedButton.icon(onPressed: () => connection.click(right: true), icon: const Icon(Icons.more_horiz, size: 17), label: const Text('Klik kanan')))]),
      ]),
    );
  }

  Widget _clockView() => Container(width: double.infinity, height: double.infinity, padding: const EdgeInsets.all(28), color: const Color(0xFF090F12), child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [const Text('AMBIENT CLOCK', style: TextStyle(color: apricot, fontSize: 11, letterSpacing: 2.4)), const SizedBox(height: 21), Text('${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}', style: const TextStyle(fontSize: 72, fontWeight: FontWeight.w200, letterSpacing: -4, color: paper)), Text('${now.day.toString().padLeft(2, '0')} · ${_month(now.month)} · ${now.year}', style: const TextStyle(color: blue, letterSpacing: 1.3)), const SizedBox(height: 45), Text('Sesi LAN tetap aktif', style: TextStyle(color: Colors.white.withOpacity(.42), fontSize: 12)), const SizedBox(height: 15), OutlinedButton.icon(onPressed: () => setState(() => mode = PocketMode.home), icon: const Icon(Icons.arrow_back, size: 17), label: const Text('Kembali ke mode'))]));
  String _month(int month) => const ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][month - 1];

  @override
  void dispose() { clockTimer?.cancel(); statusSubscription?.cancel(); scanner.dispose(); unawaited(receiver?.dispose()); unawaited(connection.dispose()); super.dispose(); }
}
