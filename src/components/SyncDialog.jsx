import { useEffect, useRef, useState, useCallback } from "react";
import {
    Button, VStack, HStack, Text, Box, Spinner,
    Dialog, CloseButton, Portal,
} from "@chakra-ui/react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { LuSmartphone, LuLaptop, LuCheck, LuRefreshCw } from "react-icons/lu";
import routeStorage from "../utils/routeStorage";
import { createOffer, applyAnswer, createAnswer, sendData } from "../utils/webrtcSync";

const STEP = {
    SELECT_ROLE: "select_role",
    // sender
    SHOW_OFFER_QR: "show_offer_qr",
    SCAN_ANSWER: "scan_answer",
    // receiver
    SCAN_OFFER: "scan_offer",
    SHOW_ANSWER_QR: "show_answer_qr",
    // shared
    CONNECTING: "connecting",
    SYNCING: "syncing",
    DONE: "done",
    ERROR: "error",
};

export default function SyncDialog({ open, onClose, onSyncDone }) {
    const [step, setStep] = useState(STEP.SELECT_ROLE);
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [statusText, setStatusText] = useState("");
    const [syncCount, setSyncCount] = useState(0);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const pcRef = useRef(null);
    const streamRef = useRef(null);
    const scanLoopRef = useRef(null);
    const onDetectedRef = useRef(null); // set before entering a scan step

    const stopCamera = useCallback(() => {
        if (scanLoopRef.current) {
            clearInterval(scanLoopRef.current);
            scanLoopRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

    const cleanup = useCallback(() => {
        stopCamera();
        onDetectedRef.current = null;
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
    }, [stopCamera]);

    const handleClose = useCallback(() => {
        cleanup();
        setStep(STEP.SELECT_ROLE);
        setQrDataUrl(null);
        setStatusText("");
        setSyncCount(0);
        onClose();
    }, [cleanup, onClose]);

    useEffect(() => {
        if (!open) cleanup();
    }, [open, cleanup]);

    // Camera starts in a useEffect so the <video> element is guaranteed to be in the DOM
    useEffect(() => {
        if (step !== STEP.SCAN_OFFER && step !== STEP.SCAN_ANSWER) return;
        let cancelled = false;

        (async () => {
            let stream;
            if (!navigator.mediaDevices?.getUserMedia) {
                if (!cancelled) {
                    setStatusText("Camera API not available. Make sure the app is served over HTTPS.");
                    setStep(STEP.ERROR);
                }
                return;
            }
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" },
                });
            } catch (err) {
                if (!cancelled) {
                    const msg = err.name === "NotAllowedError"
                        ? "Camera permission denied."
                        : err.name === "NotSupportedError" || err.name === "TypeError"
                            ? "Camera not available — app must be served over HTTPS."
                            : `Camera error: ${err.name}`;
                    setStatusText(msg);
                    setStep(STEP.ERROR);
                }
                return;
            }
            if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(() => {});
            } else {
                setStatusText("Video element not ready — please try again.");
                setStep(STEP.ERROR);
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            scanLoopRef.current = setInterval(() => {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) return;

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0);
                const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(img.data, img.width, img.height);
                if (code?.data && onDetectedRef.current) {
                    const cb = onDetectedRef.current;
                    onDetectedRef.current = null;
                    stopCamera();
                    cb(code.data);
                }
            }, 200);
        })();

        return () => { cancelled = true; };
    }, [step, stopCamera]);

    // ── SENDER FLOW (laptop) ──────────────────────────────────────────────────

    const startSender = useCallback(async () => {
        setStep(STEP.SHOW_OFFER_QR);
        setStatusText("Generating QR...");
        try {
            const { pc, channel, encoded } = await createOffer();
            pcRef.current = pc;

            // Wire up the data channel for sender
            channel.onopen = async () => {
                setStep(STEP.SYNCING);
                setStatusText("Waiting for route list from mobile...");
            };
            channel.onmessage = async (e) => {
                const msg = JSON.parse(e.data);
                if (msg.type !== "have") return;

                const haveSet = new Set(msg.startTimes);
                const all = await routeStorage.getAllRoutes();
                const missing = all.filter(r => !haveSet.has(r.summary?.startTime));

                await sendData(channel, JSON.stringify({ type: "total", count: missing.length }));
                setStatusText(`Sending ${missing.length} new route(s)...`);

                for (const route of missing) {
                    const { id: _id, ...data } = route;
                    await sendData(channel, JSON.stringify({ type: "route", data }));
                }
                await sendData(channel, JSON.stringify({ type: "done" }));
                setSyncCount(missing.length);
                setStep(STEP.DONE);
                if (onSyncDone) onSyncDone();
            };

            const url = await QRCode.toDataURL(encoded, { errorCorrectionLevel: "M", width: 300 });
            setQrDataUrl(url);
            setStatusText("Scan this QR with your mobile");
        } catch (err) {
            setStatusText("Error: " + err.message);
            setStep(STEP.ERROR);
        }
    }, [onSyncDone]);

    const startScanAnswer = useCallback(() => {
        onDetectedRef.current = async (answerEncoded) => {
            setStep(STEP.CONNECTING);
            setStatusText("Connecting...");
            try {
                await applyAnswer(pcRef.current, answerEncoded);
            } catch (err) {
                setStatusText("Connection error: " + err.message);
                setStep(STEP.ERROR);
            }
        };
        setStep(STEP.SCAN_ANSWER);
        setStatusText("Point the camera at the mobile's QR code");
    }, []);

    // ── RECEIVER FLOW (iPhone) ────────────────────────────────────────────────

    const startReceiver = useCallback(() => {
        onDetectedRef.current = async (offerEncoded) => {
            setStep(STEP.CONNECTING);
            setStatusText("QR detected — creating answer...");
            try {
                let pc, encoded;
                try {
                    ({ pc, encoded } = await createAnswer(offerEncoded));
                } catch (err) {
                    throw new Error(`SDP error: ${err.message}. The QR may have been misread — retry.`);
                }
                pcRef.current = pc;

                pc.ondatachannel = (e) => {
                    const channel = e.channel;
                    let total = 0;
                    let received = 0;

                    channel.onopen = async () => {
                        setStep(STEP.SYNCING);
                        const all = await routeStorage.getAllRoutes();
                        const startTimes = all.map(r => r.summary?.startTime).filter(Boolean);
                        channel.send(JSON.stringify({ type: "have", startTimes }));
                        setStatusText("Sending route list to laptop...");
                    };
                    channel.onmessage = async (ev) => {
                        const msg = JSON.parse(ev.data);
                        if (msg.type === "total") {
                            total = msg.count;
                            setStatusText(total === 0 ? "No new routes." : `Receiving ${total} route(s)...`);
                        } else if (msg.type === "route") {
                            await routeStorage.saveRoute(msg.data, msg.data.routeName || "Ruta");
                            received++;
                            setStatusText(`Receiving routes... ${received}/${total}`);
                        } else if (msg.type === "done") {
                            setSyncCount(received);
                            setStep(STEP.DONE);
                            if (onSyncDone) onSyncDone();
                        }
                    };
                };

                setStatusText("Generating response QR...");
                const url = await QRCode.toDataURL(encoded, { errorCorrectionLevel: "M", width: 300 });
                setQrDataUrl(url);
                setStep(STEP.SHOW_ANSWER_QR);
                setStatusText("Show this QR to the laptop camera");
            } catch (err) {
                setStatusText("Error: " + err.message);
                setStep(STEP.ERROR);
            }
        };
        setStep(STEP.SCAN_OFFER);
        setStatusText("Point the camera at the laptop's QR code");
    }, [onSyncDone]);

    // ── RENDER ────────────────────────────────────────────────────────────────

    const renderContent = () => {
        switch (step) {
            case STEP.SELECT_ROLE:
                return (
                    <VStack gap={4} width="100%">
                        <Text color="fg.muted" textAlign="center" fontSize="sm">
                            Which device is this?
                        </Text>
                        <Button
                            width="100%"
                            size="lg"
                            variant="outline"
                            onClick={startSender}
                            justifyContent="flex-start"
                            gap={3}
                        >
                            <LuLaptop />
                            <Text minW={0}>Laptop — send routes</Text>
                        </Button>
                        <Button
                            width="100%"
                            size="lg"
                            variant="outline"
                            onClick={startReceiver}
                            justifyContent="flex-start"
                            gap={3}
                        >
                            <LuSmartphone />
                            <Text minW={0}>Mobile — receive routes</Text>
                        </Button>
                    </VStack>
                );

            case STEP.SHOW_OFFER_QR:
                return (
                    <VStack gap={4}>
                        <Text fontSize="sm" color="fg.muted" textAlign="center">{statusText}</Text>
                        {qrDataUrl
                            ? <>
                                <Box borderRadius="md" overflow="hidden" border="1px solid" borderColor="border">
                                    <img src={qrDataUrl} alt="QR offer" width={280} height={280} />
                                </Box>
                                <Button onClick={startScanAnswer} width="100%" gap={2}>
                                    <LuRefreshCw />
                                    <Text>Done — scan mobile's response QR</Text>
                                </Button>
                            </>
                            : <Spinner />
                        }
                    </VStack>
                );

            case STEP.SHOW_ANSWER_QR:
                return (
                    <VStack gap={4}>
                        <Text fontSize="sm" color="fg.muted" textAlign="center">{statusText}</Text>
                        {qrDataUrl
                            ? <Box borderRadius="md" overflow="hidden" border="1px solid" borderColor="border">
                                <img src={qrDataUrl} alt="QR answer" width={280} height={280} />
                            </Box>
                            : <Spinner />
                        }
                    </VStack>
                );

            case STEP.SCAN_OFFER:
            case STEP.SCAN_ANSWER:
                return (
                    <VStack gap={3}>
                        <Text fontSize="sm" color="fg.muted" textAlign="center">{statusText}</Text>
                        <Box
                            position="relative"
                            width="280px"
                            height="280px"
                            borderRadius="md"
                            overflow="hidden"
                            border="1px solid"
                            borderColor="border"
                            bg="black"
                        >
                            <video
                                ref={videoRef}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                playsInline
                                muted
                            />
                            {/* crosshair overlay */}
                            <Box
                                position="absolute" top="50%" left="50%"
                                transform="translate(-50%, -50%)"
                                width="160px" height="160px"
                                border="2px solid white"
                                borderRadius="sm"
                                opacity={0.6}
                            />
                        </Box>
                        <canvas ref={canvasRef} style={{ display: "none" }} />
                    </VStack>
                );

            case STEP.CONNECTING:
            case STEP.SYNCING:
                return (
                    <VStack gap={4} py={4}>
                        <Spinner size="xl" />
                        <Text fontSize="sm" color="fg.muted" textAlign="center">{statusText}</Text>
                    </VStack>
                );

            case STEP.DONE:
                return (
                    <VStack gap={4} py={4}>
                        <Box color="green.500" fontSize="4xl"><LuCheck /></Box>
                        <Text fontWeight="semibold">
                            {syncCount === 0
                                ? "All up to date — no new routes."
                                : `${syncCount} route(s) synced.`}
                        </Text>
                        <Button onClick={handleClose} width="100%">Close</Button>
                    </VStack>
                );

            case STEP.ERROR:
                return (
                    <VStack gap={4} py={4}>
                        <Text color="red.500" textAlign="center">{statusText}</Text>
                        <HStack>
                            <Button variant="outline" onClick={() => { cleanup(); setStep(STEP.SELECT_ROLE); }}>
                                Retry
                            </Button>
                            <Button onClick={handleClose}>Close</Button>
                        </HStack>
                    </VStack>
                );

            default:
                return null;
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={({ open: o }) => { if (!o) handleClose(); }}>
            <Portal>
                <Dialog.Positioner>
                    <Dialog.Content maxWidth="360px" width="90vw">
                        <Dialog.Header>
                            <Dialog.Title>Sync routes</Dialog.Title>
                            <CloseButton onClick={handleClose} position="absolute" top={3} right={3} />
                        </Dialog.Header>
                        <Dialog.Body pb={6}>
                            {renderContent()}
                        </Dialog.Body>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
