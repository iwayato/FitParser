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

export function encodeSdp(desc) {
    return btoa(JSON.stringify({ type: desc.type, sdp: desc.sdp }));
}

export function decodeSdp(encoded) {
    return JSON.parse(atob(encoded));
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
