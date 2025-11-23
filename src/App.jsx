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
    Stat,
    List,
    Input
} from "@chakra-ui/react";
import { Toaster, toaster } from "./components/ui/toaster"
import { useEffect, useState } from "react";
import { HiUpload } from "react-icons/hi";
import { parseFitFile, getElevationProfile } from "./utils/fitParser";
import { secondsToHHMM, formatDate } from "./utils/otherParsers";
import { MdDriveFileRenameOutline, MdDelete } from "react-icons/md"
import routeStorage from "./utils/routeStorage";
import Map from "./components/Map";

const App = () => {

    const [routes, setRoutes] = useState([])
    const [stats, setStats] = useState()
    const [newRouteName, setNewRouteName] = useState('')    
    const [fileUploadLoader, setFileUploadLoader] = useState(false)
    const [updateRouteNameLoader, setUpdateRouteLoader] = useState(false)
    const [refresh, setRefresh] = useState(false)

    useEffect(() => {
        const getRoutesAndStats = async () => {
            const routes = await routeStorage.getAllRoutes();
            const stats = await routeStorage.getStats();
            setRoutes(routes)
            setStats(stats)
        }
        getRoutesAndStats()
    }, [fileUploadLoader, updateRouteNameLoader, refresh])

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
                    const id = await routeStorage.saveRoute(data, file.name);
                }
            }
        }
        catch (error) {
            toaster.create({
                title: "An error occurred",
                description: error,
                closable: true,
                type: 'error',
                duration: 10000,
            })
        }
        finally {
            setFileUploadLoader(false)
        }
    }

    const handleDeleteRoute = async (routeId) => {
        setRefresh(true)
        try {
            await routeStorage.deleteRoute(routeId)
        }
        catch (error) {
            toaster.create({
                title: "An error occurred",
                description: error,
                closable: true,
                type: 'error',
                duration: 10000,
            })
        }
        finally {
            setRefresh(false)
        }
    }

    const handleUpdateRouteName = async (routeId) => {
        setUpdateRouteLoader(true)
        try {
            await routeStorage.updateRouteName(routeId, newRouteName)
        }
        catch (error) {
            toaster.create({
                title: "An error occurred",
                description: error,
                closable: true,
                type: 'error',
                duration: 10000,
            })
        }
        finally {
            setUpdateRouteLoader(false)
            setNewRouteName('')
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
                            <Table.ColumnHeader>Route name</Table.ColumnHeader>
                            <Table.ColumnHeader>Date</Table.ColumnHeader>
                            <Table.ColumnHeader>Avg Speed [m/s]</Table.ColumnHeader>
                            <Table.ColumnHeader>Max Speed [m/s]</Table.ColumnHeader>
                            <Table.ColumnHeader>Total calories [kcal]</Table.ColumnHeader>
                            <Table.ColumnHeader>Total Distance [km]</Table.ColumnHeader>
                            <Table.ColumnHeader>Total Moving Time [hh:mm]</Table.ColumnHeader>
                            <Table.ColumnHeader>Total Time [hh:mm]</Table.ColumnHeader>
                            <Table.ColumnHeader>Actions</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {
                            routes.map((route, index) => (
                                <Table.Row key={route.id}>
                                    <Table.Cell>
                                        <Dialog.Root size='cover' >
                                            <Dialog.Trigger asChild>
                                                <Link colorPalette="teal">
                                                    {route.routeName}
                                                </Link>
                                            </Dialog.Trigger>
                                            <Portal>
                                                <Dialog.Positioner>
                                                    <Dialog.Content>
                                                        <Dialog.Header>
                                                            <Dialog.Title>
                                                                {route.routeName}: {formatDate(new Date(route.summary.startTime.toString()))}
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
                                    <Table.Cell>{formatDate(new Date(route.summary.startTime.toString()))}</Table.Cell>
                                    <Table.Cell>{Math.round(route.summary.avgSpeed * 100) / 100}</Table.Cell>
                                    <Table.Cell>{Math.round(route.summary.maxSpeed * 100) / 100}</Table.Cell>
                                    <Table.Cell>{Math.round(route.summary.totalCalories * 100) / 100}</Table.Cell>
                                    <Table.Cell>{Math.round(route.summary.totalDistance * 100) / 100}</Table.Cell>
                                    <Table.Cell>{secondsToHHMM(route.summary.totalMovingTime)}</Table.Cell>
                                    <Table.Cell>{secondsToHHMM(route.summary.totalTime)}</Table.Cell>
                                    <Table.Cell>
                                        <HStack gap={2}>
                                            <Dialog.Root placement={'center'}>
                                                <Dialog.Trigger asChild>
                                                    <Button
                                                        size="xs"
                                                        variant="subtle"
                                                        colorPalette={'yellow'}
                                                    >
                                                        <MdDriveFileRenameOutline />
                                                    </Button>
                                                </Dialog.Trigger>
                                                <Portal>
                                                    <Dialog.Positioner>
                                                        <Dialog.Content>
                                                            <Dialog.Header>
                                                                <Dialog.Title>Change route name</Dialog.Title>
                                                            </Dialog.Header>
                                                            <Dialog.Body>
                                                                <List.Root gap={3} p={3}>
                                                                    <List.Item>
                                                                        Current route name: <b>{route.routeName}</b>
                                                                    </List.Item>
                                                                    <List.Item>
                                                                        <Input
                                                                            placeholder="New route name" 
                                                                            size={'sm'}
                                                                            value={newRouteName}
                                                                            onChange={(e) => setNewRouteName(e.target.value)}
                                                                        />
                                                                    </List.Item>
                                                                </List.Root>

                                                            </Dialog.Body>
                                                            <Dialog.Footer>
                                                                <Dialog.ActionTrigger asChild>
                                                                    <Button 
                                                                        variant="outline"
                                                                        onClick={() => setNewRouteName('')}
                                                                    >
                                                                        Close
                                                                    </Button>
                                                                </Dialog.ActionTrigger>
                                                                <Button 
                                                                    colorPalette={'green'} 
                                                                    variant="subtle"
                                                                    loading={updateRouteNameLoader}
                                                                    disabled={newRouteName.trim().length === 0}
                                                                    onClick={() => handleUpdateRouteName(route.id)}
                                                                >
                                                                    Update
                                                                </Button>
                                                            </Dialog.Footer>
                                                        </Dialog.Content>
                                                    </Dialog.Positioner>
                                                </Portal>
                                            </Dialog.Root>
                                            <Button
                                                size="xs"
                                                variant="subtle"
                                                colorPalette={'red'}
                                                onClick={() => handleDeleteRoute(route.id)}
                                            >
                                                <MdDelete />
                                            </Button>
                                        </HStack>
                                    </Table.Cell>
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
