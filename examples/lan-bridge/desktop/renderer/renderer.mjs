const state = { info: null, devices: [], activeDevice: null, peer: null, stream: null, captureProfile: localStorage.getItem('halo.captureProfile') || 'screen', selectingSource: false };
const $ = (selector) => document.querySelector(selector);
const captureProfiles = {
  screen: { label: 'Layar', type: 'screen', contentHint: 'detail', note: 'Pilih satu layar.' },
  window: { label: 'Aplikasi', type: 'window', contentHint: 'detail', note: 'Pilih aplikasi.' },
  lyrics: { label: 'Lirik', type: 'window', contentHint: 'detail', note: 'Pilih browser atau aplikasi lirik.' },
  media: { label: 'Media', type: 'window', contentHint: 'motion', note: 'Pilih Spotify atau pemutar media.' },
};

function trace(event, details = {}) { window.haloDeck.writeDiagnostic?.(event, details); }
function render(info) { if (!info) return; state.info = info; state.devices = info.devices ?? []; $('#top-address').textContent = info.address.replace('ws://', ''); $('#stat-ip').textContent = info.address.replace('ws://', '').split(':')[0]; $('#full-address').textContent = info.address; $('#activity-address').textContent = `${info.address} · LAN`; $('#pin').textContent = info.pin; $('#qr').src = info.qrDataUrl; renderDevices(); renderCaptureProfile(); }
function renderDevices() { const devices = state.devices; $('#stat-devices').textContent = String(devices.length); $('#nav-device-count').textContent = String(devices.length).padStart(2, '0'); if (!devices.length) { $('#devices-list').innerHTML = '<div class="empty-device"><div class="empty-orbit"><span>⌁</span></div><div><strong>Menunggu Pocket Hub</strong><p>Scan QR untuk terhubung.</p></div><span class="empty-code">READY</span></div>'; return; } $('#devices-list').innerHTML = devices.map((device) => `<div class="device-card"><div class="device-avatar">▣</div><div class="device-main"><strong>${escapeHtml(device.name)}</strong><small>${escapeHtml(device.platform)} · ${formatSince(device.connectedAt)}</small></div><div class="device-status"><i></i> ONLINE</div><button class="device-action primary" data-screen="${escapeHtml(device.id)}">Kirim layar</button><button class="device-action" data-disconnect="${escapeHtml(device.id)}">Putuskan</button></div>`).join(''); document.querySelectorAll('[data-disconnect]').forEach((button) => button.addEventListener('click', async () => { await window.haloDeck.disconnectDevice(button.dataset.disconnect); trace('device.disconnect', { id: button.dataset.disconnect }); showToast('Perangkat diputuskan'); })); document.querySelectorAll('[data-screen]').forEach((button) => button.addEventListener('click', () => { const device = devices.find((candidate) => candidate.id === button.dataset.screen); if (device) selectSourceAndOffer(device); })); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
function formatSince(timestamp) { const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000)); return seconds < 3 ? 'baru' : `${seconds} dtk`; }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('visible'); window.setTimeout(() => toast.classList.remove('visible'), 1800); }
function renderCaptureProfile() { const profile = captureProfiles[state.captureProfile] ?? captureProfiles.screen; document.querySelectorAll('[data-capture-profile]').forEach((button) => button.classList.toggle('active', button.dataset.captureProfile === state.captureProfile)); $('#capture-note').textContent = profile.note; }
function stopCapture() { state.stream?.getTracks().forEach((track) => track.stop()); state.stream = null; state.peer?.close(); state.peer = null; }

async function selectSourceAndOffer(device) {
  if (state.selectingSource) return;
  state.selectingSource = true;
  const profile = captureProfiles[state.captureProfile] ?? captureProfiles.screen;
  try {
    const source = await showSourceDialog(profile);
    if (!source) { trace('capture.dismissed', { profile: state.captureProfile }); return; }
    await window.haloDeck.selectCaptureSource(source.id);
    trace('capture.sourceSelected', { profile: state.captureProfile, sourceType: source.type, sourceName: source.name });
    await createOffer(device, profile, source);
  } catch (error) {
    trace('capture.error', { stage: 'select', message: String(error).slice(0, 160) });
    showToast('Sumber tidak tersedia');
  } finally { state.selectingSource = false; }
}

async function showSourceDialog(profile) {
  const dialog = $('#source-dialog'); const list = $('#source-list');
  $('#source-dialog-title').textContent = `Pilih ${profile.label}`;
  $('#source-dialog-copy').textContent = profile.type === 'screen' ? 'Pilih layar untuk Pocket Hub.' : 'Pilih aplikasi untuk Pocket Hub.';
  list.innerHTML = '<div class="capture-note">Membaca sumber…</div>';
  const allSources = await window.haloDeck.getCaptureSources();
  const sources = allSources.filter((source) => profile.type === 'screen' ? source.type === 'screen' : source.type === 'window');
  list.innerHTML = sources.length ? sources.map((source) => `<button type="button" class="source-choice" data-source-id="${escapeHtml(source.id)}"><i>${source.type === 'screen' ? '▣' : '▤'}</i><span><strong>${escapeHtml(source.name)}</strong><small>${source.type === 'screen' ? 'Layar' : 'Aplikasi'}</small></span></button>`).join('') : '<div class="capture-note">Tidak ada sumber.</div>';
  return new Promise((resolve) => { const close = () => resolve(null); dialog.addEventListener('close', close, { once: true }); document.querySelectorAll('[data-source-id]').forEach((button) => button.addEventListener('click', () => { const source = sources.find((item) => item.id === button.dataset.sourceId); dialog.removeEventListener('close', close); dialog.close(); resolve(source ?? null); })); dialog.showModal(); });
}

async function createOffer(device, profile, source) {
  state.activeDevice = device; stopCapture();
  state.peer = new RTCPeerConnection({ iceServers: [], bundlePolicy: 'max-bundle', iceCandidatePoolSize: 0 });
  state.peer.onicecandidate = (event) => { const candidate = event.candidate?.toJSON?.(); if (candidate?.candidate?.startsWith('candidate:') && typeof candidate.sdpMid === 'string' && Number.isInteger(candidate.sdpMLineIndex)) window.haloDeck.relaySignal({ type: 'webrtc.ice', candidate, targetDeviceId: device.id }); };
  state.peer.onconnectionstatechange = () => { const connectionState = state.peer?.connectionState; trace('stream.state', { state: connectionState }); if (['failed', 'disconnected', 'closed'].includes(connectionState)) showToast('Stream terputus'); };
  try {
    state.stream = await navigator.mediaDevices.getDisplayMedia({ video: { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 }, frameRate: { ideal: 45, max: 60 } }, audio: false });
    const track = state.stream.getVideoTracks()[0]; if (!track) throw new Error('missing_video_track');
    track.contentHint = profile.contentHint; track.onended = () => { trace('capture.ended', { source: source.name }); showToast('Sumber berhenti'); stopCapture(); };
    const sender = state.peer.addTrack(track, state.stream); const parameters = sender.getParameters(); parameters.encodings = parameters.encodings?.length ? parameters.encodings : [{}]; parameters.encodings[0].maxBitrate = profile.contentHint === 'motion' ? 5_000_000 : 3_000_000; parameters.encodings[0].maxFramerate = 45; parameters.degradationPreference = 'maintain-framerate'; await sender.setParameters(parameters);
    const offer = await state.peer.createOffer({ offerToReceiveVideo: false, offerToReceiveAudio: false }); await state.peer.setLocalDescription(offer); await window.haloDeck.relaySignal({ type: 'webrtc.offer', sdp: offer.sdp, descriptionType: 'offer', targetDeviceId: device.id }); trace('stream.offer', { source: source.name, profile: state.captureProfile }); showToast(`${profile.label} dikirim`);
  } catch (error) { trace('capture.error', { stage: 'offer', message: String(error).slice(0, 160) }); stopCapture(); showToast('Capture dibatalkan'); }
}

async function handleSignal({ device, message }) { if (!device) return; if (message.type === 'webrtc.request') return selectSourceAndOffer(device); if (message.type === 'webrtc.answer' && state.peer && state.activeDevice?.id === device.id) return state.peer.setRemoteDescription({ type: 'answer', sdp: message.sdp }); if (message.type === 'webrtc.ice' && state.peer && state.activeDevice?.id === device.id && message.candidate?.candidate?.startsWith('candidate:')) return state.peer.addIceCandidate(message.candidate); }
function wireUi() { document.querySelectorAll('[data-scroll]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' }))); document.querySelectorAll('[data-capture-profile]').forEach((button) => button.addEventListener('click', () => { state.captureProfile = button.dataset.captureProfile; localStorage.setItem('halo.captureProfile', state.captureProfile); renderCaptureProfile(); trace('capture.profile', { profile: state.captureProfile }); })); $('#refresh-button').addEventListener('click', async () => { render(await window.haloDeck.getBridgeInfo()); }); $('#scan-status').addEventListener('click', async () => { render(await window.haloDeck.getBridgeInfo()); }); $('#copy-address').addEventListener('click', async () => { await navigator.clipboard.writeText(state.info?.address ?? ''); showToast('Alamat disalin'); }); }
window.haloDeck.onBridgeReady(render); window.haloDeck.onDevicesUpdated((payload) => { state.devices = payload.devices ?? []; renderDevices(); if (state.devices.length) $('#last-activity').innerHTML = '<span class="activity-icon blue">▣</span><div><strong>Perangkat terhubung</strong><small>Log aktif</small></div><time>now</time>'; }); window.haloDeck.onWebrtcSignal(handleSignal); wireUi(); window.haloDeck.getBridgeInfo().then(render);
