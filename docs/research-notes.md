# Implementation research notes

## Electron desktop capture

The official Electron `desktopCapturer` documentation states that `desktopCapturer.getSources()` returns screen and window sources and is used with `navigator.mediaDevices.getUserMedia()`. It also notes that screen capture requires user consent on macOS 10.15+ and that audio capture has additional macOS requirements.

Source: https://www.electronjs.org/docs/latest/api/desktop-capturer

## Flutter WebRTC

The current `flutter_webrtc` package supports Android and iOS audio/video, data channels, screen capture, Unified Plan, and simulcast. The package documentation also calls out Android permissions, a minimum SDK adjustment in some setups, Java 8 compile options, iOS usage descriptions, and release Proguard configuration.

Source: https://pub.dev/packages/flutter_webrtc

## WebRTC signaling and ICE

MDN documents `RTCPeerConnection` as the object that connects and monitors the remote peer. The implementation should exchange an SDP offer/answer and trickled ICE candidates over a separate signaling channel, then call `setRemoteDescription()` and `addIceCandidate()` in the correct order. For a same-LAN design, an empty `iceServers` list can be used to prefer host candidates; STUN/TURN can be added later for networks that are not directly reachable.

Source: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection

## Bonjour/mDNS

The `bonjour-service` package publishes a service with `name`, `type`, `port`, and optional TXT metadata, and discovers services with `find({ type, protocol })`. The service type used in the reference implementation is `_halodeck._tcp` and the TXT record carries a non-secret pairing ID and protocol version; the secret PIN/token is never advertised.

Source: https://www.npmjs.com/package/bonjour-service
