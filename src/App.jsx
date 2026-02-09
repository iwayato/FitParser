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
    InputGroup,
    Input
} from "@chakra-ui/react";
import { Toaster, toaster } from "./components/ui/toaster"
import { useEffect, useState, useRef } from "react";
import { HiUpload } from "react-icons/hi";
import { parseFitFile, getElevationProfile } from "./utils/fitParser";
import { secondsToHHMM, formatDate } from "./utils/otherParsers";
import { MdDriveFileRenameOutline, MdDelete } from "react-icons/md"
import { CiExport, CiImport } from "react-icons/ci";
import { IoSearch } from "react-icons/io5";
import routeStorage from "./utils/routeStorage";
import Map from "./components/Map";
import TimeBasedAnalysisDialog from "./components/TimeBasedAnalysisDialog";

const SortIcon = ({ direction }) => {
    if (direction === 'asc') {
        return <span style={{ marginLeft: '8px' }}>▲</span>;
    }
    if (direction === 'desc') {
        return <span style={{ marginLeft: '8px' }}>▼</span>;
    }
    return <span style={{ marginLeft: '8px', opacity: 0.3 }}>▲</span>;
};

const App = () => {

    // States
    const [routes, setRoutes] = useState([])
    const [stats, setStats] = useState()
    const [newRouteName, setNewRouteName] = useState('')
    const [fileUploadLoader, setFileUploadLoader] = useState(false)
    const [updateRouteNameLoader, setUpdateRouteLoader] = useState(false)
    const [refresh, setRefresh] = useState(false)
    const [exportLoader, setExportLoader] = useState(false)
    const [importLoader, setImportLoader] = useState(false)

    // Filters
    const inputRef = useRef(null)
    const [routeNameFilter, setRouteNameFilter] = useState('')

    // Sort
    const [sortConfig, setSortConfig] = useState({ key: 'startTime', direction: 'desc' });

    useEffect(() => {
        const getRoutesAndStats = async () => {
            const routes = await routeStorage.getAllRoutes();
            const stats = await routeStorage.getStats();
            setRoutes(routes)
            setStats(stats)
        }
        getRoutesAndStats()
    }, [fileUploadLoader, updateRouteNameLoader, refresh, importLoader])

    const handleSort = (key) => {
        let direction = 'asc';

        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }

        setSortConfig({ key, direction });
    };

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
            toaster.create({
                title: "Route deleted successfully",
                closable: true,
                type: 'success',
                duration: 3000,
            })
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
            toaster.create({
                title: "Route name changed successfully",
                closable: true,
                type: 'success',
                duration: 3000,
            })
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

    const handleExportRoutes = async () => {
        setExportLoader(true)
        try {
            await routeStorage.exportAllRoutes()
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
            setExportLoader(false)
        }
    }

    const handleImportRoutes = async (file) => {
        setImportLoader(true)
        try {
            const totalRoutesAdded = await routeStorage.importRoutes(file)
            if (totalRoutesAdded > 0) {
                toaster.create({
                    title: `${totalRoutesAdded} routes have been added`,
                    closable: true,
                    type: 'success',
                    duration: 5000,
                })
            }
            else if (totalRoutesAdded === 0) {
                toaster.create({
                    title: "No routes have been added",
                    closable: true,
                    type: 'warning',
                    duration: 5000,
                })
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
            setImportLoader(false)
        }
    }

    const filteredRoutes = routes.filter((route) => {
        return (
            (routeNameFilter.trim() === '' || route.routeName.toLowerCase().includes(routeNameFilter.toLocaleLowerCase()))
        )
    }).sort((a, b) => {
        const aVal = a.summary[sortConfig.key];
        const bVal = b.summary[sortConfig.key];

        if (aVal < bVal) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    return (
        <VStack p={8} gap={5}>

            {/* Stats */}
            <HStack gap={5} mb={2}>
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

            {/* Upload, Export, Import buttons */}
            <HStack gap={5} w={'100%'}>
                <HStack>
                    <InputGroup
                        startElement={<IoSearch />}
                        endElement={routeNameFilter ? (
                            <CloseButton
                                size="xs"
                                onClick={() => {
                                    setRouteNameFilter('')
                                    inputRef.current?.focus()
                                }}
                                me="-2"
                            />
                        ) : undefined}
                        w={'220px'}
                    >
                        <Input
                            ref={inputRef}
                            disabled={routes.length === 0}
                            placeholder="Search by route name"
                            size={'sm'}
                            value={routeNameFilter}
                            onChange={(e) => setRouteNameFilter(e.target.value)}
                        />
                    </InputGroup>
                    <TimeBasedAnalysisDialog 
                        disabled={routes.length === 0}
                        fileUploadLoader={fileUploadLoader}
                        importLoader={importLoader}
                    />
                </HStack>
                <HStack ml='auto'>
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
                    <Button
                        loading={exportLoader}
                        disabled={routes.length === 0}
                        variant="outline"
                        size="sm"
                        onClick={handleExportRoutes}
                    >
                        <CiExport /> Export routes
                    </Button>
                    <FileUpload.Root
                        onFileAccept={(e) => handleImportRoutes(e.files[0])}
                        accept={[".json"]}
                        maxFiles={1}
                    >
                        <FileUpload.HiddenInput />
                        <FileUpload.Trigger asChild>
                            <Button
                                loading={importLoader}
                                variant="outline"
                                size="sm"
                            >
                                <CiImport /> Import routes
                            </Button>
                        </FileUpload.Trigger>
                    </FileUpload.Root>
                </HStack>
            </HStack>

            {/* Table */}
            <Table.ScrollArea h="calc(100vh - 230px)" w="100%">
                <Table.Root size="sm" striped showColumnBorder stickyHeader>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>Route name</Table.ColumnHeader>
                            <Table.ColumnHeader
                                cursor="pointer"
                                userSelect='none'
                                _hover={{ bg: 'gray.800' }}
                                onClick={() => handleSort('startTime')}
                            >
                                Date
                                <SortIcon direction={sortConfig.key === 'startTime' ? sortConfig.direction : null} />
                            </Table.ColumnHeader>
                            <Table.ColumnHeader
                                cursor="pointer"
                                userSelect='none'
                                _hover={{ bg: 'gray.800' }}
                                onClick={() => handleSort('avgSpeed')}
                            >
                                Avg Speed [m/s]
                                <SortIcon direction={sortConfig.key === 'avgSpeed' ? sortConfig.direction : null} />
                            </Table.ColumnHeader>
                            <Table.ColumnHeader
                                cursor="pointer"
                                userSelect='none'
                                _hover={{ bg: 'gray.800' }}
                                onClick={() => handleSort('maxSpeed')}
                            >
                                Max Speed [m/s]
                                <SortIcon direction={sortConfig.key === 'maxSpeed' ? sortConfig.direction : null} />
                            </Table.ColumnHeader>
                            <Table.ColumnHeader
                                cursor="pointer"
                                userSelect='none'
                                _hover={{ bg: 'gray.800' }}
                                onClick={() => handleSort('totalCalories')}
                            >
                                Total calories [kcal]
                                <SortIcon direction={sortConfig.key === 'totalCalories' ? sortConfig.direction : null} />
                            </Table.ColumnHeader>
                            <Table.ColumnHeader
                                cursor="pointer"
                                userSelect='none'
                                _hover={{ bg: 'gray.800' }}
                                onClick={() => handleSort('totalDistance')}
                            >
                                Total Distance [km]
                                <SortIcon direction={sortConfig.key === 'totalDistance' ? sortConfig.direction : null} />
                            </Table.ColumnHeader>
                            <Table.ColumnHeader
                                cursor="pointer"
                                userSelect='none'
                                _hover={{ bg: 'gray.800' }}
                                onClick={() => handleSort('totalMovingTime')}
                            >
                                Total Moving Time [hh:mm]
                                <SortIcon direction={sortConfig.key === 'totalMovingTime' ? sortConfig.direction : null} />
                            </Table.ColumnHeader>
                            <Table.ColumnHeader
                                cursor="pointer"
                                userSelect='none'
                                _hover={{ bg: 'gray.800' }}
                                onClick={() => handleSort('totalTime')}
                            >
                                Total Time [hh:mm]
                                <SortIcon direction={sortConfig.key === 'totalTime' ? sortConfig.direction : null} />
                            </Table.ColumnHeader>
                            <Table.ColumnHeader>Actions</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {
                            filteredRoutes.map((route, index) => (
                                <Table.Row key={route.id}>
                                    <Table.Cell>
                                        <Dialog.Root size='cover' >
                                            <Dialog.Trigger asChild>
                                                <Link colorPalette="teal">
                                                    {route.routeName}
                                                </Link>
                                            </Dialog.Trigger>
                                            <Dialog.Backdrop />
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
                                                <Dialog.Backdrop />
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

                                            <Dialog.Root placement={'center'}>
                                                <Dialog.Trigger asChild>
                                                    <Button
                                                        size="xs"
                                                        variant="subtle"
                                                        colorPalette={'red'}
                                                    >
                                                        <MdDelete />
                                                    </Button>
                                                </Dialog.Trigger>
                                                <Dialog.Backdrop />
                                                <Portal>
                                                    <Dialog.Positioner>
                                                        <Dialog.Content>
                                                            <Dialog.Header>
                                                                <Dialog.Title>Are you sure you want to delete this route?</Dialog.Title>
                                                            </Dialog.Header>
                                                            <Dialog.Footer>
                                                                <Dialog.ActionTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                    >
                                                                        Close
                                                                    </Button>
                                                                </Dialog.ActionTrigger>
                                                                <Button
                                                                    colorPalette={'red'}
                                                                    variant="subtle"
                                                                    loading={refresh}
                                                                    onClick={() => handleDeleteRoute(route.id)}
                                                                >
                                                                    Delete
                                                                </Button>
                                                            </Dialog.Footer>
                                                        </Dialog.Content>
                                                    </Dialog.Positioner>
                                                </Portal>
                                            </Dialog.Root>
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
