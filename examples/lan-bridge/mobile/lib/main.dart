import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'connection.dart';
import 'discovery.dart';
import 'webrtc_receiver.dart';

void main() => runApp(const HaloDeckApp());

class HaloDeckApp extends StatefulWidget { const HaloDeckApp({super.key}); @override State<HaloDeckApp> createState() => _HaloDeckAppState(); }
class _HaloDeckAppState extends State<HaloDeckApp> {
  final connection = LanConnection(); final scanController = MobileScannerController();
  List<HaloDeckService> services = []; String? pairingStatus; LanScreenReceiver? receiver;
  @override void initState() { super.initState(); _discover(); }
  Future<void> _discover() async { final found = await discoverHaloDecks(); if (mounted) setState(() => services = found); }
  Future<void> _pair(Map<String, dynamic> data) async { setState(() => pairingStatus = 'Menghubungkan…'); await connection.connect(uri: Uri.parse(data['address'] as String), pairId: data['pairId'] as String, pin: data['pin'] as String); setState(() => pairingStatus = 'Terhubung'); }
  Future<void> _pairDiscovered(HaloDeckService service) async { final controller = TextEditingController(); final pin = await showDialog<String>(context: context, builder: (context) => AlertDialog(title: const Text('Masukkan PIN pairing'), content: TextField(controller: controller, keyboardType: TextInputType.number, maxLength: 6, decoration: const InputDecoration(labelText: 'PIN satu kali')), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')), FilledButton(onPressed: () => Navigator.pop(context, controller.text), child: const Text('Hubungkan'))])); controller.dispose(); if (pin != null && pin.length == 6) await _pair({'address': service.wsUri.toString(), 'pairId': service.pairId, 'pin': pin}); }
  @override Widget build(BuildContext context) => MaterialApp(debugShowCheckedModeBanner: false, theme: ThemeData.dark(useMaterial3: true), home: Scaffold(appBar: AppBar(title: const Text('Halo Deck Pocket Hub')), body: Column(children: [if (pairingStatus != null) Padding(padding: const EdgeInsets.all(12), child: Text(pairingStatus!)), Expanded(child: MobileScanner(controller: scanController, onDetect: (capture) { for (final barcode in capture.barcodes) { final value = barcode.rawValue; if (value == null) continue; try { _pair(jsonDecode(value) as Map<String, dynamic>); } catch (_) {} } })), FilledButton.icon(onPressed: _discover, icon: const Icon(Icons.wifi_find), label: Text('Temukan Desktop Hub (${services.length})')), ...services.map((service) => ListTile(title: Text(service.name), subtitle: Text(service.wsUri.toString()), onTap: () => _pairDiscovered(service))) ])));
  @override void dispose() { scanController.dispose(); unawaited(connection.dispose()); receiver?.dispose(); super.dispose(); }
}
