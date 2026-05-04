import {
    Dialog,
    CloseButton,
    Button,
    Portal,
    VStack,
    Box,
    Text,
    Progress,
    HStack,
    Spinner,
} from "@chakra-ui/react";
import { useState } from "react";
import { LuBrain } from "react-icons/lu";
import { CreateMLCEngine } from "@mlc-ai/web-llm";
import routeStorage from "../utils/routeStorage";
import { buildTrainingPrompt } from "../utils/trainingAnalyzer";

const MODEL_ID = "Phi-3.5-mini-instruct-q4f16_1-MLC";

// Persist engine across open/close cycles so we don't re-download
let globalEngine = null;

const AICoachDialog = ({ disabled }) => {
    const [open, setOpen] = useState(false);
    const [phase, setPhase] = useState("idle"); // idle | loading | analyzing | done | error
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState("");
    const [isCached, setIsCached] = useState(false);
    const [analysis, setAnalysis] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const runAnalysis = async () => {
        setAnalysis("");
        setErrorMsg("");

        try {
            if (!globalEngine) {
                setPhase("loading");
                setProgress(0);
                setProgressText("Initializing...");

                const cache = await caches.open('webllm/model');
                const keys = await cache.keys();
                setIsCached(keys.some(req => req.url.includes('Phi-3.5-mini')));

                globalEngine = await CreateMLCEngine(MODEL_ID, {
                    initProgressCallback: (report) => {
                        setProgress(Math.round((report.progress || 0) * 100));
                        setProgressText(report.text || "");
                    },
                });
            }

            setPhase("analyzing");
            const routes = await routeStorage.getAllRoutes();
            const prompt = buildTrainingPrompt(routes);

            if (!prompt) {
                setErrorMsg("No training data found. Upload some FIT files first.");
                setPhase("error");
                return;
            }

            const stream = await globalEngine.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                stream: true,
                temperature: 0.5,
                max_tokens: 900,
            });

            let full = "";
            for await (const chunk of stream) {
                full += chunk.choices[0]?.delta?.content || "";
                setAnalysis(full);
            }
        }
        catch (err) {
            console.error(err);
            globalEngine = null;
            setErrorMsg(err.message || "An error occurred loading the model.");
            setPhase("error");
        }
        finally {
            setPhase("done");
        }
    };

    const handleOpenChange = (e) => {
        setOpen(e.open);
        if (e.open) runAnalysis();
    };

    // Render markdown-like text: bold **text**, headings with #
    const renderAnalysis = (text) => {
        return text.split('\n').map((line, i) => {
            // Heading lines
            if (line.startsWith('# ')) {
                return <Text key={i} fontWeight="bold" fontSize="md" mt={3}>{line.slice(2)}</Text>;
            }
            if (line.startsWith('## ') || line.match(/^\d+\.\s*\*\*/)) {
                // Section like "1. **Training Load**" or "## Training Load"
                const clean = line.replace(/^#+\s*/, '').replace(/^\d+\.\s*/, '');
                return <Text key={i} fontWeight="semibold" mt={3} mb={1}>{renderInline(clean)}</Text>;
            }
            if (line.trim() === '') return <Box key={i} h={2} />;
            return <Text key={i} fontSize="sm" lineHeight="tall">{renderInline(line)}</Text>;
        });
    };

    const renderInline = (text) => {
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <Text as="span" key={i} fontWeight="bold">{part.slice(2, -2)}</Text>;
            }
            return part;
        });
    };

    return (
        <Dialog.Root open={open} onOpenChange={handleOpenChange} size="xl" closeOnInteractOutside={false} closeOnEscape={false}>
            <Dialog.Trigger asChild>
                <Button disabled={disabled} variant="outline" size="sm">
                    <LuBrain /> AI Coach
                </Button>
            </Dialog.Trigger>
            <Dialog.Backdrop />
            <Dialog.Positioner>
                <Dialog.Content maxH="80vh" overflow="hidden" display="flex" flexDir="column">
                    <Dialog.Header>
                        <HStack>
                            <LuBrain />
                            <Dialog.Title>AI Coach</Dialog.Title>
                        </HStack>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton size="sm" disabled={phase === 'loading' || phase === 'analyzing'} />
                        </Dialog.CloseTrigger>
                    </Dialog.Header>

                    <Dialog.Body pb={6} overflowY="auto" flex="1">
                        {phase === "loading" && (
                            <VStack gap={4} py={8} align="stretch">
                                <HStack justify="center" py={6} color="fg.muted">
                                    <Spinner size="sm" />
                                    <Text fontWeight="medium" textAlign="center">
                                        {isCached ? "Loading model" : "Downloading model (first time only)"}
                                    </Text>
                                </HStack>
                                <Progress.Root value={progress} w="100%">
                                    <Progress.Track borderRadius="full">
                                        <Progress.Range />
                                    </Progress.Track>
                                </Progress.Root>
                                <Text fontSize="xs" color="fg.muted" textAlign="center">
                                    {progressText}
                                </Text>
                                <Text fontSize="xs" color="fg.subtle" textAlign="center">
                                    ~2.3 GB — cached in your browser after this download
                                </Text>
                            </VStack>
                        )}

                        {phase === "analyzing" && !analysis && (
                            <HStack justify="center" py={6} color="fg.muted">
                                <Spinner size="sm" />
                                <Text>Analyzing your training data...</Text>
                            </HStack>
                        )}

                        {(phase === "analyzing" || phase === "done") && analysis && (
                            <Box>{renderAnalysis(analysis)}</Box>
                        )}

                        {phase === "error" && (
                            <Text color="red.500" py={4}>{errorMsg}</Text>
                        )}
                    </Dialog.Body>

                    {(phase === "done" || phase === "error") && (
                        <Dialog.Footer borderTopWidth="1px" pt={3}>
                            <Button size="sm" variant="outline" onClick={runAnalysis}>
                                Re-analyze
                            </Button>
                        </Dialog.Footer>
                    )}
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
};

export default AICoachDialog;
