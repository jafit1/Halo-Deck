import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import 'connection.dart';
import 'diagnostics.dart';
import 'discovery.dart';
import 'webrtc_receiver.dart';

const ink = Color(0xFF172327);
const paper = Color(0xFFF4F1E8);
const blue = Color(0xFF9BC1C9);
const apricot = Color(0xFFF3A063);

enum PocketMode { home, display, trackpad, clock }
enum PresentationRotation { automatic, portrait, landscape }
enum ClockTheme { midnight, ember, ocean, paper, forest, violet, solar, mono }
enum ClockLayout { classic, split, minimal, stacked, ring, dateFirst }

class ClockPalette {
  const ClockPalette(this.background, this.foreground, this.accent, this.muted);
  final Color background;
  final Color foreground;
  final Color accent;
  final Color muted;
}

void main() => runApp(const HaloDeckApp());

class HaloDeckApp extends StatefulWidget {
  const HaloDeckApp({super.key});
  @override
  State<HaloDeckApp> createState() => _HaloDeckAppState();
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
  bool openingDisplay = false;
  bool displayKeepAwake = true;
  bool clockKeepAwake = true;
  bool displayFullscreen = true;
  bool clockFullscreen = true;
  DateTime now = DateTime.now();
  Timer? clockTimer;
  LanScreenReceiver? receiver;
  PresentationRotation displayRotation = PresentationRotation.automatic;
  PresentationRotation clockRotation = PresentationRotation.automatic;
  ClockTheme clockTheme = ClockTheme.midnight;
  ClockLayout clockLayout = ClockLayout.classic;
  String? displayError;

  @override
  void initState() {
    super.initState();
    statusSubscription = connection.status.stream.listen((value) {
      HaloDiagnostics.write('connection.status', {'value': value});
      if (mounted) setState(() => connectionStatus = value);
    });
    clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => now = DateTime.now());
    });
    _loadSavedDevice();
  }

  Future<void> _loadSavedDevice() async {
    preferences = await SharedPreferences.getInstance();
    await HaloDiagnostics.initialize();
    final deviceId = preferences?.getString('halo.deviceId') ?? 'pocket-${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}';
    await preferences?.setString('halo.deviceId', deviceId);
    connection.setDeviceId(deviceId);
    savedAddress = preferences?.getString('halo.address');
    savedPairId = preferences?.getString('halo.pairId');
    savedPin = preferences?.getString('halo.pin');
    displayKeepAwake = preferences?.getBool('display.keepAwake') ?? true;
    clockKeepAwake = preferences?.getBool('clock.keepAwake') ?? true;
    displayFullscreen = preferences?.getBool('display.fullscreen') ?? true;
    clockFullscreen = preferences?.getBool('clock.fullscreen') ?? true;
    displayRotation = _rotationFrom(preferences?.getString('display.rotation'));
    clockRotation = _rotationFrom(preferences?.getString('clock.rotation'));
    clockTheme = _themeFrom(preferences?.getString('clock.theme'));
    clockLayout = _layoutFrom(preferences?.getString('clock.layout'));
    if (savedAddress != null && savedPairId != null && savedPin != null) {
      await _connect(Uri.parse(savedAddress!), savedPairId!, savedPin!, persist: false);
    }
    if (mounted) setState(() {});
  }

  Future<void> _connect(Uri uri, String pairId, String pin, {bool persist = true}) async {
    if (mounted) setState(() { pairing = true; scanning = false; connectionStatus = 'Menghubungkan…'; });
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
    final pin = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Masukkan PIN pairing'),
        content: TextField(controller: controller, keyboardType: TextInputType.number, maxLength: 6, decoration: const InputDecoration(labelText: 'PIN satu kali')),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')), FilledButton(onPressed: () => Navigator.pop(context, controller.text), child: const Text('Hubungkan'))],
      ),
    );
    controller.dispose();
    if (pin != null && pin.length == 6) await _connect(service.wsUri, service.pairId, pin);
  }

  void _openScanner() { setState(() => scanning = true); scanner.start(); }

  Future<void> _disconnect() async {
    await _stopDisplay();
    await connection.disconnect();
    if (mounted) setState(() { mode = PocketMode.home; pairing = false; });
  }

  Future<void> _selectMode(PocketMode next) async {
    if (next == PocketMode.display) return _openDisplay();
    if (!mounted) return;
    setState(() => mode = next);
    await _syncPresentation();
  }

  Future<void> _openDisplay() async {
    if (openingDisplay) return;
    if (receiver != null) {
      setState(() { mode = PocketMode.display; displayError = null; });
      await _syncPresentation();
      return;
    }
    setState(() { openingDisplay = true; displayError = null; });
    final candidate = LanScreenReceiver(connection, onDiagnostic: HaloDiagnostics.write);
    try {
      await candidate.start();
      if (!mounted) {
        await candidate.dispose();
        return;
      }
      candidate.state.addListener(_onReceiverState);
      setState(() { receiver = candidate; openingDisplay = false; mode = PocketMode.display; });
      await _syncPresentation();
    } catch (_) {
      HaloDiagnostics.write('screen.open.error');
      await candidate.dispose();
      if (mounted) setState(() { openingDisplay = false; displayError = 'Penerima layar tidak dapat disiapkan. Coba mulai ulang mode Layar.'; });
    }
  }

  void _onReceiverState() {
    if (mounted) setState(() {});
  }

  Future<void> _restartDisplay() async {
    await _stopDisplay();
    await _openDisplay();
  }

  Future<void> _stopDisplay() async {
    final active = receiver;
    receiver = null;
    if (active != null) {
      active.state.removeListener(_onReceiverState);
      await active.dispose();
    }
    await _syncPresentation();
    if (mounted) setState(() {});
  }

  Future<void> _syncPresentation() async {
    final keepAwake = (receiver != null && displayKeepAwake) || (mode == PocketMode.clock && clockKeepAwake);
    await WakelockPlus.toggle(enable: keepAwake);
    final fullscreen = (mode == PocketMode.display && displayFullscreen) || (mode == PocketMode.clock && clockFullscreen);
    await SystemChrome.setEnabledSystemUIMode(fullscreen ? SystemUiMode.immersiveSticky : SystemUiMode.edgeToEdge);
    final target = mode == PocketMode.display ? displayRotation : mode == PocketMode.clock ? clockRotation : PresentationRotation.automatic;
    switch (target) {
      case PresentationRotation.automatic:
        await SystemChrome.setPreferredOrientations([]);
      case PresentationRotation.portrait:
        await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp, DeviceOrientation.portraitDown]);
      case PresentationRotation.landscape:
        await SystemChrome.setPreferredOrientations([DeviceOrientation.landscapeLeft, DeviceOrientation.landscapeRight]);
    }
  }

  Future<void> _setDisplayRotation(PresentationRotation value) async {
    setState(() => displayRotation = value);
    await preferences?.setString('display.rotation', value.name);
    await _syncPresentation();
  }

  Future<void> _setClockRotation(PresentationRotation value) async {
    setState(() => clockRotation = value);
    await preferences?.setString('clock.rotation', value.name);
    await _syncPresentation();
  }

  Future<void> _setDisplayKeepAwake(bool value) async {
    setState(() => displayKeepAwake = value);
    await preferences?.setBool('display.keepAwake', value);
    await _syncPresentation();
  }

  Future<void> _setClockKeepAwake(bool value) async {
    setState(() => clockKeepAwake = value);
    await preferences?.setBool('clock.keepAwake', value);
    await _syncPresentation();
  }

  Future<void> _setDisplayFullscreen(bool value) async {
    setState(() => displayFullscreen = value);
    await preferences?.setBool('display.fullscreen', value);
    await _syncPresentation();
  }

  Future<void> _setClockFullscreen(bool value) async {
    setState(() => clockFullscreen = value);
    await preferences?.setBool('clock.fullscreen', value);
    await _syncPresentation();
  }

  Future<void> _setClockTheme(ClockTheme value) async {
    setState(() => clockTheme = value);
    await preferences?.setString('clock.theme', value.name);
  }

  Future<void> _setClockLayout(ClockLayout value) async {
    setState(() => clockLayout = value);
    await preferences?.setString('clock.layout', value.name);
  }

  PresentationRotation _rotationFrom(String? value) => PresentationRotation.values.where((item) => item.name == value).firstOrNull ?? PresentationRotation.automatic;
  ClockTheme _themeFrom(String? value) => ClockTheme.values.where((item) => item.name == value).firstOrNull ?? ClockTheme.midnight;
  ClockLayout _layoutFrom(String? value) => ClockLayout.values.where((item) => item.name == value).firstOrNull ?? ClockLayout.classic;

  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: ThemeData(useMaterial3: true, brightness: Brightness.dark, scaffoldBackgroundColor: ink, colorScheme: ColorScheme.fromSeed(seedColor: apricot, brightness: Brightness.dark)),
    home: Scaffold(body: SafeArea(child: scanning ? _scannerView() : _appView())),
  );

  Widget _appView() {
    final fullscreen = (mode == PocketMode.display && displayFullscreen) || (mode == PocketMode.clock && clockFullscreen);
    return Column(children: [
    if (!fullscreen) _topBar(),
    Expanded(child: AnimatedSwitcher(duration: const Duration(milliseconds: 220), child: switch (mode) { PocketMode.home => _homeView(), PocketMode.display => _displayView(), PocketMode.trackpad => _trackpadView(), PocketMode.clock => _clockView() })),
    if (connection.connected && !fullscreen) _modeBar(),
  ]);
  }

  Widget _topBar() => Padding(padding: const EdgeInsets.fromLTRB(20, 18, 20, 12), child: Row(children: [
    Container(width: 36, height: 36, decoration: BoxDecoration(color: const Color(0xFF0D1518), border: Border.all(color: blue)), child: const Icon(Icons.bolt, color: apricot, size: 20)),
    const SizedBox(width: 11),
    const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('HALO Deck', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)), Text('POCKET HUB', style: TextStyle(color: blue, fontSize: 9, letterSpacing: 1.4))]),
    const Spacer(),
    IconButton(onPressed: _showDiagnostics, tooltip: 'Log', icon: const Icon(Icons.bug_report_outlined, size: 19)),
    Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7), decoration: BoxDecoration(color: connection.connected ? const Color(0xFF20392E) : const Color(0xFF2B3030), borderRadius: BorderRadius.circular(20)), child: Row(children: [Icon(Icons.circle, size: 8, color: connection.connected ? const Color(0xFF8ED4A9) : apricot), const SizedBox(width: 7), Text(connectionStatus, style: const TextStyle(fontSize: 11))])),
  ]));

  void _showDiagnostics() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: const Color(0xFF132125),
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: SizedBox(
          height: MediaQuery.of(context).size.height * .72,
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [const Text('LOG DIAGNOSTIK', style: TextStyle(color: blue, letterSpacing: 1.3, fontWeight: FontWeight.w700)), const Spacer(), TextButton(onPressed: HaloDiagnostics.clear, child: const Text('Bersihkan'))]),
                const SizedBox(height: 8),
                const Text('Kirim screenshot log ini saat melaporkan bug.', style: TextStyle(color: Colors.white54, fontSize: 12)),
                const SizedBox(height: 12),
                Expanded(child: ValueListenableBuilder<List<String>>(
                  valueListenable: HaloDiagnostics.entries,
                  builder: (_, logs, __) => ListView.builder(
                    reverse: true,
                    itemCount: logs.length,
                    itemBuilder: (_, index) => Padding(
                      padding: const EdgeInsets.only(bottom: 7),
                      child: Text(logs[logs.length - 1 - index], style: const TextStyle(fontFamily: 'monospace', fontSize: 10, color: Color(0xFFB9D2D7))),
                    ),
                  ),
                )),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _homeView() => SingleChildScrollView(padding: const EdgeInsets.fromLTRB(20, 12, 20, 24), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(connection.connected ? 'Siap dipakai.' : 'Pair dengan\nDesktop Hub.', style: const TextStyle(fontSize: 36, height: .98, fontWeight: FontWeight.w800, letterSpacing: -1.8)),
    const SizedBox(height: 13),
    Text(connection.connected ? 'Pilih mode.' : 'Scan QR di WiFi yang sama.', style: TextStyle(color: Colors.white.withOpacity(.64), height: 1.5, fontSize: 14)),
    const SizedBox(height: 23),
    if (!connection.connected) _pairCard() else _connectedCard(),
    const SizedBox(height: 18),
    if (services.isNotEmpty) _discoveryList() else if (!connection.connected) _discoveryButton(),
  ]));

  Widget _pairCard() => Container(width: double.infinity, padding: const EdgeInsets.all(19), decoration: BoxDecoration(color: const Color(0xFF1D3036), borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFF3E5D64))), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Row(children: [Icon(Icons.qr_code_scanner, color: apricot), SizedBox(width: 10), Text('PAIRING CEPAT', style: TextStyle(color: apricot, fontSize: 11, letterSpacing: 1.3))]),
    const SizedBox(height: 12), const Text('Scan QR dari Desktop Hub', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20)), const SizedBox(height: 7),
    Text('Alamat LAN, Pair ID, dan PIN akan diproses otomatis.', style: TextStyle(color: Colors.white.withOpacity(.6), fontSize: 12)), const SizedBox(height: 18),
    SizedBox(width: double.infinity, child: FilledButton.icon(onPressed: _openScanner, icon: const Icon(Icons.camera_alt_outlined), label: const Text('Scan QR sekarang'), style: FilledButton.styleFrom(backgroundColor: apricot, foregroundColor: ink, padding: const EdgeInsets.symmetric(vertical: 15)))),
  ]));

  Widget _connectedCard() => Container(width: double.infinity, padding: const EdgeInsets.all(19), decoration: BoxDecoration(color: const Color(0xFF20382F), borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFF4D7C68))), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Row(children: [Icon(Icons.check_circle_outline, color: Color(0xFF9BD5B1)), SizedBox(width: 10), Text('SESI TERPERCAYA AKTIF', style: TextStyle(color: Color(0xFF9BD5B1), fontSize: 11, letterSpacing: 1.2))]),
    const SizedBox(height: 12), const Text('Desktop Hub terhubung', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20)), const SizedBox(height: 6),
    Text(savedAddress ?? 'LAN lokal', style: TextStyle(color: Colors.white.withOpacity(.62), fontSize: 12)), const SizedBox(height: 17),
    SizedBox(width: double.infinity, child: OutlinedButton.icon(onPressed: _disconnect, icon: const Icon(Icons.link_off, size: 17), label: const Text('Putuskan sesi'), style: OutlinedButton.styleFrom(foregroundColor: paper, side: BorderSide(color: Colors.white.withOpacity(.25)), padding: const EdgeInsets.symmetric(vertical: 13)))),
  ]));

  Widget _discoveryButton() => SizedBox(width: double.infinity, child: OutlinedButton.icon(onPressed: _discover, icon: const Icon(Icons.wifi_find), label: const Text('Cari Desktop Hub di jaringan'), style: OutlinedButton.styleFrom(foregroundColor: blue, side: const BorderSide(color: Color(0xFF3C5960)), padding: const EdgeInsets.symmetric(vertical: 14))));
  Widget _discoveryList() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text('Desktop Hub di sekitar', style: TextStyle(color: Colors.white.withOpacity(.72), fontWeight: FontWeight.w600)),
      const SizedBox(height: 9),
      ...services.map((service) => Card(
        color: const Color(0xFF1A292D),
        child: ListTile(
          leading: const Icon(Icons.computer, color: blue),
          title: Text(service.name),
          subtitle: Text('${service.host}:${service.port}', style: const TextStyle(fontSize: 11)),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => _pairDiscovered(service),
        ),
      )),
    ],
  );

  Widget _scannerView() => Stack(children: [
    MobileScanner(controller: scanner, onDetect: _scanResult),
    Positioned.fill(child: IgnorePointer(child: DecoratedBox(decoration: BoxDecoration(color: Colors.black.withOpacity(.2))))),
    Center(child: Container(width: 270, height: 270, decoration: BoxDecoration(border: Border.all(color: apricot, width: 3), borderRadius: BorderRadius.circular(22)))),
    Positioned(top: 28, left: 20, right: 20, child: Row(children: [IconButton(onPressed: () async { await scanner.stop(); if (mounted) setState(() => scanning = false); }, icon: const Icon(Icons.close)), const Text('Scan QR Desktop Hub', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17))])),
    const Positioned(bottom: 45, left: 28, right: 28, child: Text('Arahkan kamera ke QR pada layar Desktop Hub. Pairing berlangsung otomatis.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 13, height: 1.4))),
  ]);

  Widget _modeBar() => NavigationBar(backgroundColor: const Color(0xFF132125), selectedIndex: mode.index, onDestinationSelected: (index) => _selectMode(PocketMode.values[index]), destinations: const [
    NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Home'),
    NavigationDestination(icon: Icon(Icons.monitor_outlined), selectedIcon: Icon(Icons.monitor), label: 'Layar'),
    NavigationDestination(icon: Icon(Icons.touch_app_outlined), selectedIcon: Icon(Icons.touch_app), label: 'Trackpad'),
    NavigationDestination(icon: Icon(Icons.access_time), selectedIcon: Icon(Icons.schedule), label: 'Jam'),
  ]);

  Widget _displayView() {
    final active = receiver;
    if (openingDisplay) return const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [CircularProgressIndicator(color: apricot), SizedBox(height: 16), Text('Menyiapkan penerima layar…')]));
    if (active == null) return Center(child: Padding(padding: const EdgeInsets.all(30), child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.monitor_heart_outlined, color: apricot, size: 42), const SizedBox(height: 14), Text(displayError ?? 'Layar belum aktif', textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withOpacity(.72))), const SizedBox(height: 16), PressScale(child: FilledButton.icon(onPressed: _openDisplay, icon: const Icon(Icons.play_arrow), label: const Text('Mulai')))])));
    return Column(children: [
      Expanded(child: Stack(children: [
        Container(color: Colors.black, width: double.infinity, child: Center(child: RTCVideoView(active.renderer, objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitContain))),
        Positioned(top: 16, left: 16, right: 16, child: Row(children: [
          DecoratedBox(decoration: BoxDecoration(color: Colors.black.withOpacity(.68), borderRadius: BorderRadius.circular(20)), child: Padding(padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8), child: Text(_receiverLabel(active.state.value), style: const TextStyle(color: blue, fontSize: 10, letterSpacing: 1.1)))),
          const Spacer(),
          IconButton.filledTonal(onPressed: _restartDisplay, icon: const Icon(Icons.refresh, size: 19), tooltip: 'Muat ulang streaming'),
          const SizedBox(width: 6),
          IconButton.filledTonal(onPressed: () => _setDisplayFullscreen(!displayFullscreen), icon: Icon(displayFullscreen ? Icons.fullscreen_exit : Icons.fullscreen, size: 19), tooltip: 'Fullscreen'),
        ])),
        if (active.state.value != ReceiverState.streaming) Center(child: DecoratedBox(decoration: BoxDecoration(color: Colors.black.withOpacity(.68), borderRadius: BorderRadius.circular(14)), child: Padding(padding: const EdgeInsets.all(14), child: Text(_receiverHint(active.state.value), textAlign: TextAlign.center)))),
      ])),
      if (!displayFullscreen) _displayControls(),
    ]);
  }

  String _receiverLabel(ReceiverState value) => switch (value) { ReceiverState.streaming => 'LIVE · LAN', ReceiverState.error => 'COBA ULANG', _ => 'MENUNGGU SUMBER' };
  String _receiverHint(ReceiverState value) => switch (value) { ReceiverState.error => 'Tekan muat ulang.', ReceiverState.waitingForStream => 'Pilih sumber di Desktop Hub.', _ => 'Menghubungkan…' };

  Widget _displayControls() => Container(color: const Color(0xFF101B1F), padding: const EdgeInsets.fromLTRB(16, 12, 16, 10), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Text('LAYAR', style: TextStyle(color: blue, fontSize: 10, letterSpacing: 1.4)),
    SwitchListTile.adaptive(contentPadding: EdgeInsets.zero, dense: true, title: const Text('Tetap aktif', style: TextStyle(fontSize: 13)), value: displayKeepAwake, activeColor: apricot, onChanged: _setDisplayKeepAwake),
    SwitchListTile.adaptive(contentPadding: EdgeInsets.zero, dense: true, title: const Text('Fullscreen', style: TextStyle(fontSize: 13)), value: displayFullscreen, activeColor: apricot, onChanged: _setDisplayFullscreen),
    const Text('Rotasi tampilan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
    const SizedBox(height: 6),
    _rotationChoices(displayRotation, _setDisplayRotation),
  ]));

  Widget _trackpadView() => Padding(
    padding: const EdgeInsets.all(20),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Trackpad', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 32, letterSpacing: -1)),
      const SizedBox(height: 7),
      Text(gestureStatus, style: TextStyle(color: Colors.white.withOpacity(.62))),
      const SizedBox(height: 20),
      Expanded(
        child: GestureDetector(
          onPanUpdate: (details) {
            connection.move(details.delta.dx.round(), details.delta.dy.round());
            setState(() => gestureStatus = 'Geser pointer · ${details.delta.dx.round()}, ${details.delta.dy.round()}');
          },
          onTap: () {
            connection.click();
            setState(() => gestureStatus = 'Klik kiri');
          },
          onLongPress: () {
            connection.click(right: true);
            setState(() => gestureStatus = 'Klik kanan');
          },
          onScaleUpdate: (details) {
            if (details.pointerCount > 1) {
              connection.scroll(0, ((1 - details.scale) * 30).round());
              setState(() => gestureStatus = details.scale > 1 ? 'Pinch keluar · scroll naik' : 'Pinch masuk · scroll turun');
            }
          },
          child: Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFF1B2B30),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFF3B5960)),
              gradient: const RadialGradient(center: Alignment(-.3, -.5), radius: 1.1, colors: [Color(0xFF29464D), Color(0xFF17262A)]),
            ),
            child: const Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(Icons.touch_app, size: 44, color: apricot),
              SizedBox(height: 13),
              Text('GESER · TAP · PINCH', style: TextStyle(letterSpacing: 1.8, fontSize: 11, color: blue)),
              SizedBox(height: 7),
              Text('Permukaan kendali lokal', style: TextStyle(color: Colors.white54, fontSize: 12)),
            ]),
          ),
        ),
      ),
      const SizedBox(height: 15),
      Row(children: [
        Expanded(child: OutlinedButton.icon(onPressed: () => connection.click(), icon: const Icon(Icons.mouse_outlined, size: 17), label: const Text('Klik kiri'))),
        const SizedBox(width: 9),
        Expanded(child: OutlinedButton.icon(onPressed: () => connection.click(right: true), icon: const Icon(Icons.more_horiz, size: 17), label: const Text('Klik kanan'))),
      ]),
    ]),
  );

  Widget _clockView() {
    final palette = _paletteFor(clockTheme);
    return Container(color: palette.background, width: double.infinity, height: double.infinity, child: SingleChildScrollView(padding: const EdgeInsets.fromLTRB(22, 18, 22, 24), child: Column(children: [
      if (clockFullscreen) Align(alignment: Alignment.topRight, child: Row(mainAxisSize: MainAxisSize.min, children: [IconButton(onPressed: _showClockSettings, icon: Icon(Icons.tune, color: palette.foreground), tooltip: 'Atur Jam'), IconButton(onPressed: () => _setClockFullscreen(false), icon: Icon(Icons.fullscreen_exit, color: palette.foreground), tooltip: 'Keluar fullscreen')])),
      const SizedBox(height: 16), Text('AMBIENT CLOCK', style: TextStyle(color: palette.accent, fontSize: 11, letterSpacing: 2.4)), const SizedBox(height: 20), _clockFace(palette), const SizedBox(height: 27),
      if (!clockFullscreen) Container(width: double.infinity, padding: const EdgeInsets.all(15), decoration: BoxDecoration(color: palette.foreground.withOpacity(.05), borderRadius: BorderRadius.circular(16), border: Border.all(color: palette.foreground.withOpacity(.13))), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('TEMA', style: TextStyle(color: palette.accent, fontSize: 10, letterSpacing: 1.3)), const SizedBox(height: 7), _clockThemeChoices(palette), const SizedBox(height: 13),
        Text('LAYOUT', style: TextStyle(color: palette.accent, fontSize: 10, letterSpacing: 1.3)), const SizedBox(height: 7), _clockLayoutChoices(palette), const SizedBox(height: 13),
        SwitchListTile.adaptive(contentPadding: EdgeInsets.zero, dense: true, title: Text('Tetap aktif', style: TextStyle(color: palette.foreground, fontSize: 13)), value: clockKeepAwake, activeColor: palette.accent, onChanged: _setClockKeepAwake),
        SwitchListTile.adaptive(contentPadding: EdgeInsets.zero, dense: true, title: Text('Fullscreen', style: TextStyle(color: palette.foreground, fontSize: 13)), value: clockFullscreen, activeColor: palette.accent, onChanged: _setClockFullscreen),
        Text('Rotasi Jam', style: TextStyle(color: palette.foreground, fontSize: 12, fontWeight: FontWeight.w700)), const SizedBox(height: 7), _rotationChoices(clockRotation, _setClockRotation, foreground: palette.foreground, accent: palette.accent),
      ])),
    ])));
  }

  void _showClockSettings() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: _paletteFor(clockTheme).background,
      builder: (context) => StatefulBuilder(builder: (context, setSheetState) {
        final palette = _paletteFor(clockTheme);
        return SafeArea(child: Padding(padding: const EdgeInsets.fromLTRB(18, 14, 18, 22), child: SingleChildScrollView(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('ATUR JAM', style: TextStyle(color: palette.accent, letterSpacing: 1.4, fontWeight: FontWeight.w700)),
          const SizedBox(height: 14), Text('TEMA', style: TextStyle(color: palette.foreground, fontSize: 11, fontWeight: FontWeight.w700)), const SizedBox(height: 7),
          Wrap(spacing: 7, runSpacing: 7, children: ClockTheme.values.map((item) => ChoiceChip(label: Text(_themeName(item)), selected: clockTheme == item, onSelected: (_) async { await _setClockTheme(item); setSheetState(() {}); }, selectedColor: palette.accent.withOpacity(.28), labelStyle: TextStyle(color: palette.foreground))).toList()),
          const SizedBox(height: 16), Text('LAYOUT', style: TextStyle(color: palette.foreground, fontSize: 11, fontWeight: FontWeight.w700)), const SizedBox(height: 7),
          Wrap(spacing: 7, runSpacing: 7, children: ClockLayout.values.map((item) => ChoiceChip(label: Text(_layoutName(item)), selected: clockLayout == item, onSelected: (_) async { await _setClockLayout(item); setSheetState(() {}); }, selectedColor: palette.accent.withOpacity(.28), labelStyle: TextStyle(color: palette.foreground))).toList()),
          const SizedBox(height: 16), Text('ROTASI', style: TextStyle(color: palette.foreground, fontSize: 11, fontWeight: FontWeight.w700)), const SizedBox(height: 7),
          _rotationChoices(clockRotation, (value) async { await _setClockRotation(value); setSheetState(() {}); }, foreground: palette.foreground, accent: palette.accent),
        ]))));
      }),
    );
  }

  Widget _clockFace(ClockPalette palette) {
    final hour = now.hour.toString().padLeft(2, '0');
    final minute = now.minute.toString().padLeft(2, '0');
    final date = '${now.day.toString().padLeft(2, '0')} · ${_month(now.month)} · ${now.year}';
    switch (clockLayout) {
      case ClockLayout.split:
        return Column(children: [Row(mainAxisAlignment: MainAxisAlignment.center, children: [Text(hour, style: TextStyle(fontSize: 94, height: .9, fontWeight: FontWeight.w200, color: palette.foreground)), Padding(padding: const EdgeInsets.symmetric(horizontal: 9), child: Text(':', style: TextStyle(fontSize: 58, color: palette.accent))), Text(minute, style: TextStyle(fontSize: 94, height: .9, fontWeight: FontWeight.w700, color: palette.foreground))]), const SizedBox(height: 16), Text(date, style: TextStyle(color: palette.accent, letterSpacing: 1.3))]);
      case ClockLayout.minimal:
        return Column(children: [Text(hour, style: TextStyle(fontSize: 104, height: .78, fontWeight: FontWeight.w200, color: palette.foreground)), Container(width: 35, height: 2, color: palette.accent, margin: const EdgeInsets.symmetric(vertical: 14)), Text(minute, style: TextStyle(fontSize: 104, height: .78, fontWeight: FontWeight.w700, color: palette.foreground)), const SizedBox(height: 21), Text(date, style: TextStyle(color: palette.muted, letterSpacing: 1.2))]);
      case ClockLayout.stacked:
        return Column(children: [Text(hour, style: TextStyle(fontSize: 118, height: .72, fontWeight: FontWeight.w800, color: palette.foreground)), const SizedBox(height: 10), Text(minute, style: TextStyle(fontSize: 118, height: .72, fontWeight: FontWeight.w200, color: palette.accent)), const SizedBox(height: 24), Text(date, style: TextStyle(color: palette.muted, letterSpacing: 2.1))]);
      case ClockLayout.ring:
        return Container(width: 258, height: 258, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: palette.accent, width: 2), color: palette.foreground.withOpacity(.04)), child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Text('$hour:$minute', style: TextStyle(fontSize: 61, height: 1, fontWeight: FontWeight.w300, color: palette.foreground)), const SizedBox(height: 13), Container(width: 28, height: 2, color: palette.accent), const SizedBox(height: 13), Text(date, style: TextStyle(color: palette.muted, fontSize: 11, letterSpacing: 1.1))]));
      case ClockLayout.dateFirst:
        return Column(children: [Text(date.toUpperCase(), style: TextStyle(color: palette.accent, letterSpacing: 2.4, fontWeight: FontWeight.w700)), const SizedBox(height: 24), Text('$hour:$minute', style: TextStyle(fontSize: 86, height: .9, fontWeight: FontWeight.w200, letterSpacing: -4, color: palette.foreground)), const SizedBox(height: 14), Text('HALO DECK', style: TextStyle(color: palette.muted, fontSize: 10, letterSpacing: 3.2))]);
      case ClockLayout.classic:
        return Column(children: [Text('$hour:$minute', style: TextStyle(fontSize: 78, height: 1, fontWeight: FontWeight.w200, letterSpacing: -4, color: palette.foreground)), const SizedBox(height: 10), Text(date, style: TextStyle(color: palette.accent, letterSpacing: 1.3)), const SizedBox(height: 14), Text('Sesi LAN tetap aktif', style: TextStyle(color: palette.muted, fontSize: 12))]);
    }
  }

  Widget _rotationChoices(PresentationRotation selected, ValueChanged<PresentationRotation> onChanged, {Color foreground = paper, Color accent = apricot}) => Wrap(spacing: 7, runSpacing: 7, children: PresentationRotation.values.map((item) => ChoiceChip(label: Text(_rotationName(item), style: const TextStyle(fontSize: 11)), selected: selected == item, onSelected: (_) => onChanged(item), selectedColor: accent.withOpacity(.28), labelStyle: TextStyle(color: selected == item ? foreground : foreground.withOpacity(.7)), side: BorderSide(color: foreground.withOpacity(.18)))).toList());
  Widget _clockThemeChoices(ClockPalette palette) => Wrap(spacing: 7, runSpacing: 7, children: ClockTheme.values.map((item) => ChoiceChip(label: Text(_themeName(item), style: const TextStyle(fontSize: 11)), selected: clockTheme == item, onSelected: (_) => _setClockTheme(item), selectedColor: palette.accent.withOpacity(.28), labelStyle: TextStyle(color: palette.foreground), side: BorderSide(color: palette.foreground.withOpacity(.18)))).toList());
  Widget _clockLayoutChoices(ClockPalette palette) => Wrap(spacing: 7, runSpacing: 7, children: ClockLayout.values.map((item) => ChoiceChip(label: Text(_layoutName(item), style: const TextStyle(fontSize: 11)), selected: clockLayout == item, onSelected: (_) => _setClockLayout(item), selectedColor: palette.accent.withOpacity(.28), labelStyle: TextStyle(color: palette.foreground), side: BorderSide(color: palette.foreground.withOpacity(.18)))).toList());

  String _rotationName(PresentationRotation value) => switch (value) { PresentationRotation.automatic => 'Otomatis', PresentationRotation.portrait => 'Potret', PresentationRotation.landscape => 'Lanskap' };
  String _themeName(ClockTheme value) => switch (value) { ClockTheme.midnight => 'Midnight', ClockTheme.ember => 'Ember', ClockTheme.ocean => 'Ocean', ClockTheme.paper => 'Paper', ClockTheme.forest => 'Forest', ClockTheme.violet => 'Violet', ClockTheme.solar => 'Solar', ClockTheme.mono => 'Mono' };
  String _layoutName(ClockLayout value) => switch (value) { ClockLayout.classic => 'Klasik', ClockLayout.split => 'Split', ClockLayout.minimal => 'Minimal', ClockLayout.stacked => 'Stack', ClockLayout.ring => 'Ring', ClockLayout.dateFirst => 'Tanggal' };
  ClockPalette _paletteFor(ClockTheme value) => switch (value) { ClockTheme.midnight => const ClockPalette(Color(0xFF090F12), paper, apricot, Color(0xFF71909A)), ClockTheme.ember => const ClockPalette(Color(0xFF24130D), Color(0xFFFFE9D8), Color(0xFFFF9F68), Color(0xFFC39175)), ClockTheme.ocean => const ClockPalette(Color(0xFF071925), Color(0xFFE0F4FF), Color(0xFF6DD6FF), Color(0xFF79A8BB)), ClockTheme.paper => const ClockPalette(Color(0xFFF1ECE1), Color(0xFF202C30), Color(0xFFD76835), Color(0xFF748083)), ClockTheme.forest => const ClockPalette(Color(0xFF0D1D17), Color(0xFFE3F5E8), Color(0xFF9DD890), Color(0xFF82A992)), ClockTheme.violet => const ClockPalette(Color(0xFF171126), Color(0xFFF1E9FF), Color(0xFFC59BFF), Color(0xFF9E91B8)), ClockTheme.solar => const ClockPalette(Color(0xFF241B08), Color(0xFFFFF5CE), Color(0xFFFFC148), Color(0xFFC6A96B)), ClockTheme.mono => const ClockPalette(Color(0xFF101010), Color(0xFFF5F5F5), Color(0xFFB9B9B9), Color(0xFF7A7A7A)) };
  String _month(int month) => const ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][month - 1];

  @override
  void dispose() {
    clockTimer?.cancel();
    statusSubscription?.cancel();
    scanner.dispose();
    unawaited(WakelockPlus.disable());
    unawaited(SystemChrome.setPreferredOrientations([]));
    unawaited(receiver?.dispose() ?? Future<void>.value());
    unawaited(connection.dispose());
    super.dispose();
  }
}

class PressScale extends StatefulWidget {
  const PressScale({super.key, required this.child});
  final Widget child;
  @override
  State<PressScale> createState() => _PressScaleState();
}

class _PressScaleState extends State<PressScale> {
  bool pressed = false;
  @override
  Widget build(BuildContext context) => Listener(
    onPointerDown: (_) => setState(() => pressed = true),
    onPointerCancel: (_) => setState(() => pressed = false),
    onPointerUp: (_) => setState(() => pressed = false),
    child: AnimatedScale(scale: pressed ? .97 : 1, duration: const Duration(milliseconds: 120), child: widget.child),
  );
}
