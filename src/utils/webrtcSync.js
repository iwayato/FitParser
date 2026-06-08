const RTC_CONFIG = { iceServers: [] }; // same-WiFi only, no STUN needed
const ICE_TIMEOUT_MS = 6000;

function waitForIceGathering(pc) {
    return new Promise(resolve => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const timeout = setTimeout(resolve, ICE_TIMEOUT_MS);
        pc.addEventListener('icegatheringstatechange', () => {
            if (pc.iceGatheringState === 'complete') {
                clearTimeout(timeout);
                resolve();
            }
        });
    });
}

// Extract only the fields needed to establish a DataChannel connection,
// reducing QR data from ~1200 chars to ~400 chars.
function sdpToCompact(sdp, type) {
    const lines = sdp.split(/\r?\n/);
    const get = (prefix) => lines.find(l => l.startsWith(prefix))?.slice(prefix.length);
    return {
        t: type[0], // 'o' or 'a'
        u: get('a=ice-ufrag:'),
        p: get('a=ice-pwd:'),
        f: get('a=fingerprint:'),
        s: get('a=setup:'),
        c: lines.filter(l => l.startsWith('a=candidate:')).map(l => l.slice(12)),
    };
}

function compactToSdp(obj) {
    const type = obj.t === 'o' ? 'offer' : 'answer';
    const sdp = [
        'v=0',
        'o=- 0 0 IN IP4 127.0.0.1',
        's=-',
        't=0 0',
        'a=group:BUNDLE 0',
        'a=extmap-allow-mixed',
        'a=msid-semantic: WMS',
        'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
        'c=IN IP4 0.0.0.0',
        `a=ice-ufrag:${obj.u}`,
        `a=ice-pwd:${obj.p}`,
        'a=ice-options:trickle',
        `a=fingerprint:${obj.f}`,
        `a=setup:${obj.s}`,
        'a=mid:0',
        'a=sctp-port:5000',
        'a=max-message-size:262144',
        ...(obj.c || []).map(c => `a=candidate:${c}`),
        '',
    ].join('\r\n');
    return { type, sdp };
}

export function encodeSdp(desc) {
    return btoa(JSON.stringify(sdpToCompact(desc.sdp, desc.type)));
}

export function decodeSdp(encoded) {
    return compactToSdp(JSON.parse(atob(encoded)));
}

// Called on the sender (laptop): creates offer + DataChannel
export async function createOffer() {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    const channel = pc.createDataChannel('sync', { ordered: true });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGathering(pc);

    return { pc, channel, encoded: encodeSdp(pc.localDescription) };
}

// Called on the sender after receiving the answer QR
export async function applyAnswer(pc, answerEncoded) {
    await pc.setRemoteDescription(decodeSdp(answerEncoded));
}

// Called on the receiver (iPhone): creates answer from offer QR
export async function createAnswer(offerEncoded) {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    await pc.setRemoteDescription(decodeSdp(offerEncoded));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIceGathering(pc);

    return { pc, encoded: encodeSdp(pc.localDescription) };
}

// Sends data with simple backpressure
export async function sendData(channel, data) {
    const HIGH_WATER = 65536;
    if (channel.bufferedAmount > HIGH_WATER) {
        await new Promise(resolve => {
            channel.bufferedAmountLowThreshold = HIGH_WATER / 2;
            channel.addEventListener('bufferedamountlow', resolve, { once: true });
        });
    }
    channel.send(data);
}
