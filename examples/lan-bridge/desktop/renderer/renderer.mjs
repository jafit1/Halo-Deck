const state = {
  info: null, devices: [], activeDevice: null, peer: null, stream: null, processing: null,
  captureProfile: localStorage.getItem('halo.captureProfile') || 'screen',
  streamQuality: localStorage.getItem('halo.streamQuality') || 'smooth', lyricRegion: localStorage.getItem('halo.lyricRegion') || 'spotify', selectingSource: false,
};
const $ = (selector) => document.querySelector(selector);
const captureProfiles = {
  screen: { label: 'Layar', type: 'screen', contentHint: 'detail', note: 'Pilih layar.', crop: null },
  window: { label: 'Aplikasi', type: 'window', contentHint: 'detail', note: 'Pilih aplikasi.', crop: null },
  lyrics: { label: 'Lirik', type: 'window', contentHint: 'detail', note: 'Spotify/lirik akan dipotong ke area teks.', crop: 'lyrics' },
  media: { label: 'Media', type: 'window', contentHint: 'motion', note: 'Pilih Spotify atau media.', crop: null },
};
const streamProfiles = {
  quality: { label: 'Ultra', note: '1080p · 60 fps · detail', width: 1920, height: 1080, frameRate: 60, bitrate: 12_000_000 },
  smooth: { label: 'Lancar', note: '720p · 60 fps · seimbang', width: 1280, height: 720, frameRate: 60, bitrate: 7_000_000 },
  lyrics: { label: 'Lirik', note: '1080p · 45 fps · tajam', width: 1920, height: 1080, frameRate: 45, bitrate: 6_000_000 },
};
const lyricRegions = { spotify: { label: 'Spotify kanan', x: .47, y: .10, width: .50, height: .80 }, center: { label: 'Browser tengah', x: .14, y: .10, width: .72, height: .80 } };

function trace(event, details = {}) { window.haloDeck.writeDiagnostic?.(event, details); }
function render(info) { if (!info) return; state.info = info; state.devices = info.devices ?? []; $('#top-address').textContent = info.address.replace('ws://', ''); $('#stat-ip').textContent = info.address.replace('ws://', '').split(':')[0]; $('#full-address').textContent = info.address; $('#activity-address').textContent = `${info.address} · LAN`; $('#pin').textContent = info.pin; $('#qr').src = info.qrDataUrl; renderDevices(); renderCaptureProfile(); renderStreamQuality(); }
function renderDevices() { const devices = state.devices; $('#stat-devices').textContent = String(devices.length); $('#nav-device-count').textContent = String(devices.length).padStart(2, '0'); if (!devices.length) { $('#devices-list').innerHTML = '<div class="empty-device"><div class="empty-orbit"><span>⌁</span></div><div><strong>Menunggu Pocket Hub</strong><p>Scan QR untuk terhubung.</p></div><span class="empty-code">READY</span></div>'; return; } $('#devices-list').innerHTML = devices.map((device) => `<div class="device-card"><div class="device-avatar">▣</div><div class="device-main"><strong>${escapeHtml(device.name)}</strong><small>${escapeHtml(device.platform)} · ${formatSince(device.connectedAt)}</small></div><div class="device-status"><i></i> ONLINE</div><button class="device-action primary" data-screen="${escapeHtml(device.id)}">Kirim layar</button><button class="device-action" data-disconnect="${escapeHtml(device.id)}">Putuskan</button></div>`).join(''); document.querySelectorAll('[data-disconnect]').forEach((button) => button.addEventListener('click', async () => { await window.haloDeck.disconnectDevice(button.dataset.disconnect); trace('device.disconnect', { id: button.dataset.disconnect }); showToast('Perangkat diputuskan'); })); document.querySelectorAll('[data-screen]').forEach((button) => button.addEventListener('click', () => { const device = devices.find((candidate) => candidate.id === button.dataset.screen); if (device) selectSourceAndOffer(device); })); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
function formatSince(timestamp) { const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000)); return seconds < 3 ? 'baru' : `${seconds} dtk`; }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('visible'); window.setTimeout(() => toast.classList.remove('visible'), 2000); }
function renderCaptureProfile() { const profile = captureProfiles[state.captureProfile] ?? captureProfiles.screen; document.querySelectorAll('[data-capture-profile]').forEach((button) => button.classList.toggle('active', button.dataset.captureProfile === state.captureProfile)); document.querySelectorAll('[data-lyric-region]').forEach((button) => button.classList.toggle('active', button.dataset.lyricRegion === state.lyricRegion)); $('#capture-note').textContent = profile.note; }
function renderStreamQuality() { const quality = streamProfiles[state.streamQuality] ?? streamProfiles.smooth; document.querySelectorAll('[data-stream-quality]').forEach((button) => button.classList.toggle('active', button.dataset.streamQuality === state.streamQuality)); const note = $('#stream-note'); if (note) note.textContent = quality.note; }
function cacheKey(profile) { return `halo.lastSource.${profile}`; }
function saveLastSource(profile, source) { localStorage.setItem(cacheKey(profile), JSON.stringify({ id: source.id, name: source.name, type: source.type })); }
function cachedSource(profile, sources) { try { const saved = JSON.parse(localStorage.getItem(cacheKey(profile)) || 'null'); if (!saved) return null; return sources.find((source) => source.id === saved.id) || sources.find((source) => source.type === saved.type && source.name === saved.name) || null; } catch { return null; } }
function clearLastSource() { localStorage.removeItem(cacheKey(state.captureProfile)); showToast('Sumber terakhir dilupakan'); }
function stopCapture() { state.processing?.stop?.(); state.processing = null; state.stream?.getTracks().forEach((track) => track.stop()); state.stream = null; state.peer?.close(); state.peer = null; }

async function selectSourceAndOffer(device) {
  if (state.selectingSource) return;
  state.selectingSource = true;
  const profile = captureProfiles[state.captureProfile] ?? captureProfiles.screen;
  try {
    const allSources = await window.haloDeck.getCaptureSources();
    const sources = sortSources(allSources.filter((source) => profile.type === 'screen' ? source.type === 'screen' : source.type === 'window'), profile);
    const source = cachedSource(state.captureProfile, sources) || await showSourceDialog(profile, sources);
    if (!source) { trace('capture.dismissed', { profile: state.captureProfile }); return; }
    await window.haloDeck.selectCaptureSource(source.id); saveLastSource(state.captureProfile, source);
    trace('capture.sourceSelected', { profile: state.captureProfile, sourceType: source.type, sourceName: source.name, reused: Boolean(cachedSource(state.captureProfile, sources)) });
    await createOffer(device, profile, source);
  } catch (error) { trace('capture.error', { stage: 'select', message: String(error).slice(0, 160) }); showToast('Sumber tidak tersedia'); } finally { state.selectingSource = false; }
}
function sortSources(sources, profile) { return [...sources].sort((a, b) => { const score = (item) => profile.crop === 'lyrics' && /spotify|lyric|lirik/i.test(item.name) ? 0 : 1; return score(a) - score(b) || a.name.localeCompare(b.name); }); }
async function showSourceDialog(profile, sources) {
  const dialog = $('#source-dialog'); const list = $('#source-list'); $('#source-dialog-title').textContent = `Pilih ${profile.label}`; $('#source-dialog-copy').textContent = profile.crop ? 'Pilih Spotify atau browser. Area lirik akan dipotong otomatis.' : profile.type === 'screen' ? 'Pilih layar untuk Pocket Hub.' : 'Pilih aplikasi untuk Pocket Hub.';
  list.innerHTML = sources.length ? sources.map((source) => `<button type="button" class="source-choice" data-source-id="${escapeHtml(source.id)}"><i>${source.type === 'screen' ? '▣' : '▤'}</i><span><strong>${escapeHtml(source.name)}</strong><small>${profile.crop ? 'Crop lirik otomatis' : source.type === 'screen' ? 'Layar' : 'Aplikasi'}</small></span></button>`).join('') : '<div class="capture-note">Tidak ada sumber.</div>';
  return new Promise((resolve) => { const close = () => resolve(null); dialog.addEventListener('close', close, { once: true }); document.querySelectorAll('[data-source-id]').forEach((button) => button.addEventListener('click', () => { const source = sources.find((item) => item.id === button.dataset.sourceId); dialog.removeEventListener('close', close); dialog.close(); resolve(source ?? null); })); dialog.showModal(); });
}

async function createOffer(device, profile, source) {
  const quality = streamProfiles[state.streamQuality] ?? streamProfiles.smooth; state.activeDevice = device; stopCapture(); state.peer = new RTCPeerConnection({ iceServers: [], bundlePolicy: 'max-bundle', iceCandidatePoolSize: 0 });
  state.peer.onicecandidate = (event) => { const candidate = event.candidate?.toJSON?.(); if (candidate?.candidate?.startsWith('candidate:') && typeof candidate.sdpMid === 'string' && Number.isInteger(candidate.sdpMLineIndex)) window.haloDeck.relaySignal({ type: 'webrtc.ice', candidate, targetDeviceId: device.id }); };
  state.peer.onconnectionstatechange = () => { const connectionState = state.peer?.connectionState; trace('stream.state', { state: connectionState }); if (['failed', 'disconnected', 'closed'].includes(connectionState)) showToast('Stream terputus'); };
  try {
    state.stream = await navigator.mediaDevices.getDisplayMedia({ video: { width: { ideal: quality.width, max: 2560 }, height: { ideal: quality.height, max: 1440 }, frameRate: { ideal: quality.frameRate, max: 60 } }, audio: false });
    const originalTrack = state.stream.getVideoTracks()[0]; if (!originalTrack) throw new Error('missing_video_track'); originalTrack.contentHint = profile.contentHint;
    const outgoing = profile.crop === 'lyrics' ? await createLyricsCrop(state.stream, quality) : { stream: state.stream, track: originalTrack };
    if (profile.crop === 'lyrics') state.processing = outgoing;
    outgoing.track.onended = () => { trace('capture.ended', { source: source.name }); showToast('Sumber berhenti'); stopCapture(); };
    const sender = state.peer.addTrack(outgoing.track, outgoing.stream); const parameters = sender.getParameters(); parameters.encodings = parameters.encodings?.length ? parameters.encodings : [{}]; parameters.encodings[0].maxBitrate = quality.bitrate; parameters.encodings[0].maxFramerate = quality.frameRate; parameters.encodings[0].priority = 'high'; parameters.degradationPreference = 'maintain-framerate'; await sender.setParameters(parameters);
    const offer = await state.peer.createOffer({ offerToReceiveVideo: false, offerToReceiveAudio: false }); await state.peer.setLocalDescription(offer); await window.haloDeck.relaySignal({ type: 'webrtc.offer', sdp: offer.sdp, descriptionType: 'offer', targetDeviceId: device.id }); trace('stream.offer', { source: source.name, profile: state.captureProfile, quality: state.streamQuality, crop: profile.crop ?? 'none' }); showToast(profile.crop ? 'Lirik dikirim' : `${profile.label} dikirim`);
  } catch (error) { trace('capture.error', { stage: 'offer', message: String(error).slice(0, 160) }); stopCapture(); showToast('Capture dibatalkan'); }
}
async function createLyricsCrop(stream, quality) {
  const sourceTrack = stream.getVideoTracks()[0]; const settings = sourceTrack.getSettings(); const inputWidth = settings.width || quality.width; const inputHeight = settings.height || quality.height; const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.srcObject = stream; await video.play(); const canvas = document.createElement('canvas'); canvas.width = quality.width; canvas.height = quality.height; const context = canvas.getContext('2d', { alpha: false }); const crop = lyricRegions[state.lyricRegion] ?? lyricRegions.spotify; let frame;
  const paint = () => { context.drawImage(video, inputWidth * crop.x, inputHeight * crop.y, inputWidth * crop.width, inputHeight * crop.height, 0, 0, canvas.width, canvas.height); frame = requestAnimationFrame(paint); }; paint(); const croppedStream = canvas.captureStream(quality.frameRate); const track = croppedStream.getVideoTracks()[0]; track.contentHint = 'detail'; return { stream: croppedStream, track, stop: () => { cancelAnimationFrame(frame); video.pause(); video.srcObject = null; croppedStream.getTracks().forEach((item) => item.stop()); } };
}

async function handleSignal({ device, message }) { if (!device) return; if (message.type === 'webrtc.request') return selectSourceAndOffer(device); if (message.type === 'webrtc.answer' && state.peer && state.activeDevice?.id === device.id) return state.peer.setRemoteDescription({ type: 'answer', sdp: message.sdp }); if (message.type === 'webrtc.ice' && state.peer && state.activeDevice?.id === device.id && message.candidate?.candidate?.startsWith('candidate:')) return state.peer.addIceCandidate(message.candidate); }
function wireUi() { document.querySelectorAll('[data-scroll]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' }))); document.querySelectorAll('[data-capture-profile]').forEach((button) => button.addEventListener('click', () => { state.captureProfile = button.dataset.captureProfile; localStorage.setItem('halo.captureProfile', state.captureProfile); renderCaptureProfile(); trace('capture.profile', { profile: state.captureProfile }); })); document.querySelectorAll('[data-lyric-region]').forEach((button) => button.addEventListener('click', () => { state.lyricRegion = button.dataset.lyricRegion; localStorage.setItem('halo.lyricRegion', state.lyricRegion); renderCaptureProfile(); trace('lyrics.region', { region: state.lyricRegion }); })); document.querySelectorAll('[data-stream-quality]').forEach((button) => button.addEventListener('click', () => { state.streamQuality = button.dataset.streamQuality; localStorage.setItem('halo.streamQuality', state.streamQuality); renderStreamQuality(); trace('stream.profile', { quality: state.streamQuality }); })); $('#forget-source')?.addEventListener('click', clearLastSource); $('#refresh-button').addEventListener('click', async () => render(await window.haloDeck.getBridgeInfo())); $('#scan-status').addEventListener('click', async () => render(await window.haloDeck.getBridgeInfo())); $('#copy-address').addEventListener('click', async () => { await navigator.clipboard.writeText(state.info?.address ?? ''); showToast('Alamat disalin'); }); }
window.haloDeck.onBridgeReady(render); window.haloDeck.onDevicesUpdated((payload) => { state.devices = payload.devices ?? []; renderDevices(); if (state.devices.length) $('#last-activity').innerHTML = '<span class="activity-icon blue">▣</span><div><strong>Perangkat terhubung</strong><small>Log aktif</small></div><time>now</time>'; }); window.haloDeck.onWebrtcSignal(handleSignal); wireUi(); window.haloDeck.getBridgeInfo().then(render);
