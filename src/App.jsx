import {
    Button,
    FileUpload,
    VStack,
    Heading,
    HStack,
    Table,
    Link,
    Dialog,
    CloseButton,
    Portal,
    Stat
} from "@chakra-ui/react";
import { Toaster, toaster } from "./components/ui/toaster"
import { useEffect, useState } from "react";
import { HiUpload } from "react-icons/hi";
import { parseFitFile, getElevationProfile } from "./utils/fitParser";
import { secondsToHHMM } from "./utils/otherParsers";
import routeStorage from "./utils/routeStorage";
import Map from "./components/Map";

const App = () => {

    const [routes, setRoutes] = useState([])
    const [stats, setStats] = useState()
    const [fileUploadLoader, setFileUploadLoader] = useState(false)

    useEffect(() => {
        const getRoutesAndStats = async () => {
            const routes = await routeStorage.getAllRoutes();
            const stats = await routeStorage.getStats();
            setRoutes(routes)
            setStats(stats)
        }
        getRoutesAndStats()
    }, [fileUploadLoader])

    const handleFitFile = async (files) => {
        setFileUploadLoader(true)
        try {
            for (const file of files) {
                const data = await parseFitFile(file)
                if (data.points.length === 0) {
                    toaster.create({
                        title: "Empty file: " + file?.name,
                        description: "This route does not contains data",
                        closable: true,
                        type: 'error',
                        duration: 10000,
                    })
                } else {
                    const id = await routeStorage.saveRoute(data, new Date(data.summary.startTime.toString()).toLocaleString());
                }
            }
        }
        catch (error) {
            console.log(error);
        }
        finally {
            setFileUploadLoader(false)
        }
    }

    return (
        <VStack p={8} gap={5}>

            <Heading size={'3xl'} mb={5}>My Bike Routes</Heading>

            <HStack gap={5} mb={5}>
                <Stat.Root w={'200px'} borderWidth="1px" rounded="md" p={3}>
                    <Stat.Label>Total routes</Stat.Label>
                    <Stat.ValueText>{stats?.totalRoutes}</Stat.ValueText>
                </Stat.Root>
                <Stat.Root w={'200px'} borderWidth="1px" rounded="md" p={3}>
                    <Stat.Label>Total distance</Stat.Label>
                    <Stat.ValueText alignItems="baseline">
                        {Math.round(stats?.totalDistance * 100) / 100} <Stat.ValueUnit>km</Stat.ValueUnit>
                    </Stat.ValueText>
                </Stat.Root>
                <Stat.Root w={'200px'} borderWidth="1px" rounded="md" p={3}>
                    <Stat.Label>Total moving time</Stat.Label>
                    <Stat.ValueText alignItems="baseline">
                        {secondsToHHMM(stats?.totalMovingTime).split(':')[0]}<Stat.ValueUnit>hr</Stat.ValueUnit>
                        {secondsToHHMM(stats?.totalMovingTime).split(':')[1]}<Stat.ValueUnit>min</Stat.ValueUnit>
                    </Stat.ValueText>
                </Stat.Root>
                <Stat.Root w={'200px'} borderWidth="1px" rounded="md" p={3}>
                    <Stat.Label>Total calories</Stat.Label>
                    <Stat.ValueText alignItems="baseline">
                        {stats?.totalCalories}<Stat.ValueUnit>kcal</Stat.ValueUnit>
                    </Stat.ValueText>
                </Stat.Root>
            </HStack>

            <FileUpload.Root
                onFileAccept={(e) => handleFitFile(e.files)}
                accept={[".fit"]}
                maxFiles={100}
            >
                <FileUpload.HiddenInput />
                <FileUpload.Trigger asChild>
                    <Button
                        loading={fileUploadLoader}
                        variant="outline"
                        size="sm"
                    >
                        <HiUpload /> Upload route
                    </Button>
                </FileUpload.Trigger>
            </FileUpload.Root>

            <Table.ScrollArea h="calc(100vh - 320px)" w="100%">
                <Table.Root size="sm" striped showColumnBorder stickyHeader>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>Start time</Table.ColumnHeader>
                            <Table.ColumnHeader>Avg Speed [m/s]</Table.ColumnHeader>
                            <Table.ColumnHeader>Max Speed [m/s]</Table.ColumnHeader>
                            <Table.ColumnHeader>Total calories [kcal]</Table.ColumnHeader>
                            <Table.ColumnHeader>Total Distance [km]</Table.ColumnHeader>
                            <Table.ColumnHeader>Total Moving Time [hh:mm]</Table.ColumnHeader>
                            <Table.ColumnHeader>Total Time [hh:mm]</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {
                            routes.map((route, index) => (
                                <Table.Row key={index}>
                                    <Table.Cell>
                                        <Dialog.Root size='cover' >
                                            <Dialog.Trigger asChild>
                                                <Link colorPalette="teal">
                                                    {new Date(route.summary.startTime.toString()).toLocaleString()}
                                                </Link>
                                            </Dialog.Trigger>
                                            <Portal>
                                                <Dialog.Positioner>
                                                    <Dialog.Content>
                                                        <Dialog.Header>
                                                            <Dialog.Title>
                                                                Route started {new Date(route.summary.startTime.toString()).toLocaleString()}
                                                            </Dialog.Title>
                                                        </Dialog.Header>
                                                        <Dialog.Body>
                                                            <Map points={route.points.map(point => [point.lat, point.lng])} />
                                                        </Dialog.Body>
                                                        <Dialog.CloseTrigger asChild>
                                                            <CloseButton size="lg" />
                                                        </Dialog.CloseTrigger>
                                                    </Dialog.Content>
                                                </Dialog.Positioner>
                                            </Portal>
                                        </Dialog.Root>
                                    </Table.Cell>
                                    <Table.Cell>{Math.round(route.summary.avgSpeed * 100) / 100}</Table.Cell>
                                    <Table.Cell>{Math.round(route.summary.maxSpeed * 100) / 100}</Table.Cell>
                                    <Table.Cell>{Math.round(route.summary.totalCalories * 100) / 100}</Table.Cell>
                                    <Table.Cell>{Math.round(route.summary.totalDistance * 100) / 100}</Table.Cell>
                                    <Table.Cell>{secondsToHHMM(route.summary.totalMovingTime)}</Table.Cell>
                                    <Table.Cell>{secondsToHHMM(route.summary.totalTime)}</Table.Cell>
                                </Table.Row>
                            ))
                        }
                    </Table.Body>
                </Table.Root>
            </Table.ScrollArea>

            <Toaster />

        </VStack>
    )
}

export default App
