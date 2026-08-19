import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'connection.dart';

enum ReceiverState { initializing, waitingForStream, streaming, error, disposed }

class LanScreenReceiver {
  LanScreenReceiver(this.connection, {this.preset = 'screen', this.onDiagnostic});

  final LanConnection connection;
  final String preset;
  final Future<void> Function(String event, Map<String, dynamic> details)? onDiagnostic;
  final renderer = RTCVideoRenderer();
  final ValueNotifier<ReceiverState> state = ValueNotifier(ReceiverState.initializing);
  final List<Map<String, dynamic>> _pendingCandidates = [];
  RTCPeerConnection? _peer;
  StreamSubscription<Map<String, dynamic>>? _signals;
  StreamSubscription<String>? _connectionStatus;
  Future<void> _signalQueue = Future<void>.value();
  bool _disposed = false;
  bool _hasRemoteDescription = false;

  void _log(String event, [Map<String, dynamic> details = const {}]) { onDiagnostic?.call(event, details); }

  Future<void> start() async {
    try {
      _log('screen.receiver.start');
      await renderer.initialize();
      if (_disposed) return;
      _peer = await createPeerConnection({
        'iceServers': <Map<String, dynamic>>[],
        'sdpSemantics': 'unified-plan',
        'bundlePolicy': 'max-bundle',
      }, {});
      if (_disposed) return;
      _peer!.onTrack = (event) {
        if (event.streams.isNotEmpty && !_disposed) {
          renderer.srcObject = event.streams.first;
          state.value = ReceiverState.streaming;
          _log('screen.track');
        }
      };
      _peer!.onIceCandidate = (candidate) {
        if (candidate.candidate != null && !_disposed) {
          connection.sendSignal({'type': 'webrtc.ice', 'candidate': candidate.toMap()});
        }
      };
      _peer!.onConnectionState = (value) {
        if (_disposed) return;
        if (value == RTCPeerConnectionState.RTCPeerConnectionStateFailed || value == RTCPeerConnectionState.RTCPeerConnectionStateDisconnected) {
          state.value = ReceiverState.waitingForStream;
          _log('screen.peerState', {'state': value.name});
        }
      };
      _signals = connection.messages.stream.listen((message) {
        _signalQueue = _signalQueue.then((_) => _handleSignal(message)).catchError((_) => _setError());
      }, onError: (_) => _setError());
      _connectionStatus = connection.status.stream.listen((status) {
        if (status == 'Terhubung' && !_disposed) _requestStream();
      });
      state.value = ReceiverState.waitingForStream;
      _requestStream();
    } catch (_) {
      _log('screen.receiver.error');
      _setError();
      rethrow;
    }
  }

  void _requestStream() {
    if (!_disposed && connection.connected) {
      state.value = ReceiverState.waitingForStream;
      _log('screen.request', {'preset': preset});
      connection.sendSignal({'type': 'webrtc.request', 'preset': preset});
    }
  }

  Future<void> _handleSignal(Map<String, dynamic> message) async {
    final peer = _peer;
    if (_disposed || peer == null) return;
    try {
      if (message['type'] == 'webrtc.offer') {
        _log('screen.offer');
        await peer.setRemoteDescription(RTCSessionDescription(message['sdp'] as String, 'offer'));
        _hasRemoteDescription = true;
        for (final candidate in List<Map<String, dynamic>>.from(_pendingCandidates)) {
          await _addValidatedCandidate(peer, candidate);
        }
        _pendingCandidates.clear();
        final answer = await peer.createAnswer({'offerToReceiveVideo': 1, 'offerToReceiveAudio': 0});
        await peer.setLocalDescription(answer);
        connection.sendSignal({'type': 'webrtc.answer', 'sdp': answer.sdp, 'descriptionType': 'answer'});
      } else if (message['type'] == 'webrtc.ice') {
        final candidate = _candidateMap(message['candidate']);
        if (candidate == null) { _log('screen.iceIgnored'); return; }
        if (_hasRemoteDescription) {
          await _addValidatedCandidate(peer, candidate);
        } else {
          _pendingCandidates.add(candidate);
        }
      }
    } catch (_) {
      _setError();
    }
  }

  Map<String, dynamic>? _candidateMap(dynamic raw) {
    if (raw is! Map) return null;
    final value = raw['candidate'];
    final mid = raw['sdpMid'];
    final rawIndex = raw['sdpMLineIndex'];
    final index = rawIndex is int ? rawIndex : int.tryParse('$rawIndex');
    if (value is! String || !value.startsWith('candidate:') || mid is! String || mid.isEmpty || index == null || index < 0) return null;
    return {'candidate': value, 'sdpMid': mid, 'sdpMLineIndex': index};
  }

  Future<void> _addValidatedCandidate(RTCPeerConnection peer, Map<String, dynamic> candidate) async {
    if (_disposed || peer != _peer) return;
    await peer.addCandidate(RTCIceCandidate(
      candidate['candidate'] as String,
      candidate['sdpMid'] as String,
      candidate['sdpMLineIndex'] as int,
    ));
  }

  void _setError() {
    if (!_disposed) { _log('screen.error'); state.value = ReceiverState.error; }
  }

  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    _log('screen.receiver.dispose');
    state.value = ReceiverState.disposed;
    await _signals?.cancel();
    await _connectionStatus?.cancel();
    await _peer?.close();
    await renderer.dispose();
    state.dispose();
  }
}
