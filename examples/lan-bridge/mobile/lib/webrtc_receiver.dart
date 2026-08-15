import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'connection.dart';

enum ReceiverState { initializing, waitingForStream, streaming, error, disposed }

class LanScreenReceiver {
  LanScreenReceiver(this.connection);

  final LanConnection connection;
  final renderer = RTCVideoRenderer();
  final ValueNotifier<ReceiverState> state = ValueNotifier(ReceiverState.initializing);
  final List<RTCIceCandidate> _pendingCandidates = [];
  RTCPeerConnection? _peer;
  StreamSubscription<Map<String, dynamic>>? _signals;
  StreamSubscription<String>? _connectionStatus;
  bool _disposed = false;
  bool _hasRemoteDescription = false;

  Future<void> start() async {
    try {
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
        }
      };
      _signals = connection.messages.stream.listen(_handleSignal, onError: (_) => _setError());
      _connectionStatus = connection.status.stream.listen((status) {
        if (status == 'Terhubung' && !_disposed) _requestStream();
      });
      state.value = ReceiverState.waitingForStream;
      _requestStream();
    } catch (_) {
      _setError();
      rethrow;
    }
  }

  void _requestStream() {
    if (!_disposed && connection.connected) {
      state.value = ReceiverState.waitingForStream;
      connection.sendSignal({'type': 'webrtc.request'});
    }
  }

  Future<void> _handleSignal(Map<String, dynamic> message) async {
    final peer = _peer;
    if (_disposed || peer == null) return;
    try {
      if (message['type'] == 'webrtc.offer') {
        await peer.setRemoteDescription(RTCSessionDescription(message['sdp'] as String, 'offer'));
        _hasRemoteDescription = true;
        for (final candidate in List<RTCIceCandidate>.from(_pendingCandidates)) {
          await peer.addCandidate(candidate);
        }
        _pendingCandidates.clear();
        final answer = await peer.createAnswer({'offerToReceiveVideo': 1, 'offerToReceiveAudio': 0});
        await peer.setLocalDescription(answer);
        connection.sendSignal({'type': 'webrtc.answer', 'sdp': answer.sdp, 'descriptionType': 'answer'});
      } else if (message['type'] == 'webrtc.ice') {
        final candidate = message['candidate'] as Map<String, dynamic>?;
        if (candidate == null) return;
        final lineIndex = candidate['sdpMLineIndex'];
        final ice = RTCIceCandidate(
          candidate['candidate'] as String?,
          candidate['sdpMid'] as String?,
          lineIndex is int ? lineIndex : int.tryParse('$lineIndex'),
        );
        if (_hasRemoteDescription) {
          await peer.addCandidate(ice);
        } else {
          _pendingCandidates.add(ice);
        }
      }
    } catch (_) {
      _setError();
    }
  }

  void _setError() {
    if (!_disposed) state.value = ReceiverState.error;
  }

  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    state.value = ReceiverState.disposed;
    await _signals?.cancel();
    await _connectionStatus?.cancel();
    await _peer?.close();
    await renderer.dispose();
    state.dispose();
  }
}
