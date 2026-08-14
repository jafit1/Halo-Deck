import 'package:multicast_dns/multicast_dns.dart';

class HaloDeckService {
  const HaloDeckService({required this.host, required this.port, required this.pairId, required this.name});
  final String host; final int port; final String pairId; final String name;
  Uri get wsUri => Uri(scheme: 'ws', host: host, port: port, path: '/');
}

Future<List<HaloDeckService>> discoverHaloDecks({Duration timeout = const Duration(seconds: 3)}) async {
  final client = MDnsClient();
  await client.start();
  final found = <String, HaloDeckService>{};
  await for (final ptr in client.lookup<PtrResourceRecord>(ResourceRecordQuery.serverPointer('_halodeck._tcp.local'))) {
    await for (final srv in client.lookup<SrvResourceRecord>(ResourceRecordQuery.service(ptr.domainName))) {
      var pairId = '';
      await for (final txt in client.lookup<TxtResourceRecord>(ResourceRecordQuery.text(ptr.domainName))) { final raw = txt.text; pairId = raw.startsWith('pair=') ? raw.substring(5) : raw; }
      await for (final address in client.lookup<IPAddressResourceRecord>(ResourceRecordQuery.addressIPv4(srv.target))) {
        found['${address.address.address}:${srv.port}'] = HaloDeckService(host: address.address.address, port: srv.port, pairId: pairId, name: ptr.domainName);
      }
    }
  }
  await Future<void>.delayed(timeout);
  client.stop();
  return found.values.toList(growable: false);
}
