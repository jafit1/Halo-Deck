import 'dart:async';
import 'dart:convert';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'connection.dart';

class LanScreenReceiver {
  LanScreenReceiver(this.connection);
  final LanConnection connection;
  final renderer = RTCVideoRenderer();
  RTCPeerConnection? _peer;
  StreamSubscription<Map<String, dynamic>>? _signals;

  Future<void> start() async {
    await renderer.initialize();
    _peer = await createPeerConnection({'iceServers': <Map<String, dynamic>>[], 'sdpSemantics': 'unified-plan', 'bundlePolicy': 'max-bundle'}, {});
    _peer!.onTrack = (event) { if (event.streams.isNotEmpty) renderer.srcObject = event.streams.first; };
    _peer!.onIceCandidate = (candidate) { if (candidate.candidate != null) connection.sendSignal({'type': 'webrtc.ice', 'candidate': candidate.toMap()}); };
    _signals = connection.messages.stream.listen(_handleSignal);
    connection.sendSignal({'type': 'webrtc.request'});
  }

  Future<void> _handleSignal(Map<String, dynamic> message) async {
    if (message['type'] == 'webrtc.offer') {
      await _peer!.setRemoteDescription(RTCSessionDescription(message['sdp'] as String, 'offer'));
      final answer = await _peer!.createAnswer({'offerToReceiveVideo': 1, 'offerToReceiveAudio': 0});
      await _peer!.setLocalDescription(answer);
      connection.sendSignal({'type': 'webrtc.answer', 'sdp': answer.sdp, 'descriptionType': 'answer'});
    } else if (message['type'] == 'webrtc.ice') {
      final candidate = message['candidate'] as Map<String, dynamic>;
      await _peer!.addCandidate(RTCIceCandidate(candidate['candidate'] as String?, candidate['sdpMid'] as String?, candidate['sdpMLineIndex'] as int?));
    }
  }

  Future<void> dispose() async { await _signals?.cancel(); await _peer?.close(); await renderer.dispose(); }
}
