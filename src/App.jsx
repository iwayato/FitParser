import {
    Button,
    IconButton,
    FileUpload,
    VStack,
    HStack,
    SimpleGrid,
    Box,
    Text,
    Table,
    Link,
    Dialog,
    CloseButton,
    Portal,
    Stat,
    List,
    InputGroup,
    Input,
    Skeleton,
} from "@chakra-ui/react";
import { Toaster, toaster } from "./components/ui/toaster"
import { MenuRoot, MenuTrigger, MenuContent, MenuItem, MenuSeparator } from "./components/ui/menu"
import { useEffect, useState, useRef } from "react";
import { HiUpload } from "react-icons/hi";
import { LuEllipsis, LuMenu, LuChartLine, LuCalendar, LuBrain, LuUpload, LuDownload, LuRefreshCw } from "react-icons/lu";
import { parseFitFile } from "./utils/fitParser";
import { secondsToHHMM, formatDate, formatDateShort } from "./utils/otherParsers";
import { MdDriveFileRenameOutline, MdDelete } from "react-icons/md"
import { CiExport, CiImport } from "react-icons/ci";
import { IoSearch, IoShareSocialOutline } from "react-icons/io5";
import { shareRouteImage } from "./utils/routeImageGenerator";
import routeStorage from "./utils/routeStorage";
import Map from "./components/Map";
import TimeBasedAnalysisDialog from "./components/TimeBasedAnalysisDialog";
import CalendarDialog from "./components/CalendarDialog";
import AICoachDialog from "./components/AICoachDialog";
import SyncDialog from "./components/SyncDialog";

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
    const [sharingRouteId, setSharingRouteId] = useState(null)
    const [actionRoute, setActionRoute] = useState(null)
    const [renameOpen, setRenameOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)

    // Dialog open states
    const [timeAnalysisOpen, setTimeAnalysisOpen] = useState(false)
    const [calendarOpen, setCalendarOpen] = useState(false)
    const [aiCoachOpen, setAICoachOpen] = useState(false)
    const [syncOpen, setSyncOpen] = useState(false)

    // File input refs
    const fitUploadRef = useRef(null)
    const jsonUploadRef = useRef(null)

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
                    const d = new Date(data.summary.startTime);
                    const defaultName = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                    await routeStorage.saveRoute(data, defaultName);
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
            setDeleteOpen(false)
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
            setRenameOpen(false)
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

    const handleShareRoute = async (route) => {
        setSharingRouteId(route.id)
        try {
            const result = await shareRouteImage(route)
            if (result === 'copied') {
                toaster.create({ title: 'Image copied to clipboard', type: 'success', duration: 2500 })
            }
        } catch {
            toaster.create({ title: 'Could not copy image', type: 'error', duration: 3000 })
        } finally {
            setSharingRouteId(null)
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
        let aVal = a.summary[sortConfig.key];
        let bVal = b.summary[sortConfig.key];

        // Normalize Date objects (or date strings) to numeric timestamps for reliable comparison
        if (sortConfig.key === 'startTime') {
            aVal = aVal ? new Date(aVal).getTime() : 0;
            bVal = bVal ? new Date(bVal).getTime() : 0;
        }

        if (aVal < bVal) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    return (
        <VStack p={{ base: 3, md: 8 }} gap={5} h="100dvh" overflow="hidden">

            {/* Stats */}
            <SimpleGrid columns={{ base: 2, md: 4 }} gap={3} w="100%">
                <Stat.Root borderWidth="1px" rounded="md" p={3}>
                    <Stat.Label>Total routes</Stat.Label>
                    <Stat.ValueText>
                        <Skeleton loading={!stats}>{stats?.totalRoutes ?? 0}</Skeleton>
                    </Stat.ValueText>
                </Stat.Root>
                <Stat.Root borderWidth="1px" rounded="md" p={3}>
                    <Stat.Label>Total distance</Stat.Label>
                    <Stat.ValueText alignItems="baseline">
                        <Skeleton loading={!stats}>
                            {Math.round((stats?.totalDistance ?? 0) * 100) / 100} <Stat.ValueUnit>km</Stat.ValueUnit>
                        </Skeleton>
                    </Stat.ValueText>
                </Stat.Root>
                <Stat.Root borderWidth="1px" rounded="md" p={3}>
                    <Stat.Label>Total moving time</Stat.Label>
                    <Stat.ValueText alignItems="baseline">
                        <Skeleton loading={!stats}>
                            {secondsToHHMM(stats?.totalMovingTime ?? 0).split(':')[0]}<Stat.ValueUnit>hr</Stat.ValueUnit>
                            {secondsToHHMM(stats?.totalMovingTime ?? 0).split(':')[1]}<Stat.ValueUnit>min</Stat.ValueUnit>
                        </Skeleton>
                    </Stat.ValueText>
                </Stat.Root>
                <Stat.Root borderWidth="1px" rounded="md" p={3}>
                    <Stat.Label>Total calories</Stat.Label>
                    <Stat.ValueText alignItems="baseline">
                        <Skeleton loading={!stats}>
                            {stats?.totalCalories ?? 0}<Stat.ValueUnit>kcal</Stat.ValueUnit>
                        </Skeleton>
                    </Stat.ValueText>
                </Stat.Root>
            </SimpleGrid>

            {/* Toolbar */}
            <HStack gap={2} w="100%">
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
                    flex={1}
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

                {/* Hidden file inputs triggered from menu */}
                <FileUpload.Root onFileAccept={(e) => handleFitFile(e.files)} accept={[".fit"]} maxFiles={100} display="none">
                    <FileUpload.HiddenInput ref={fitUploadRef} />
                </FileUpload.Root>
                <FileUpload.Root onFileAccept={(e) => handleImportRoutes(e.files[0])} accept={[".json"]} maxFiles={1} display="none">
                    <FileUpload.HiddenInput ref={jsonUploadRef} />
                </FileUpload.Root>

                {/* Mobile: hamburger menu */}
                <MenuRoot>
                    <MenuTrigger asChild>
                        <IconButton display={{ base: 'flex', md: 'none' }} variant="outline" size="sm" aria-label="Actions">
                            <LuMenu />
                        </IconButton>
                    </MenuTrigger>
                    <MenuContent>
                        <MenuItem value="time-analysis" disabled={routes.length === 0} onClick={() => setTimeAnalysisOpen(true)}>
                            <LuChartLine /> Time Based Analysis
                        </MenuItem>
                        <MenuItem value="calendar" disabled={routes.length === 0} onClick={() => setCalendarOpen(true)}>
                            <LuCalendar /> Calendar
                        </MenuItem>
                        <MenuSeparator />
                        <MenuItem value="upload" onClick={() => fitUploadRef.current?.click()}>
                            <LuUpload /> Upload route
                        </MenuItem>
                        <MenuItem value="export" disabled={routes.length === 0 || exportLoader} onClick={handleExportRoutes}>
                            <LuDownload /> Export routes
                        </MenuItem>
                        <MenuItem value="import" onClick={() => jsonUploadRef.current?.click()}>
                            <CiImport /> Import routes
                        </MenuItem>
                        <MenuItem value="sync" onClick={() => setSyncOpen(true)}>
                            <LuRefreshCw /> Sync between devices
                        </MenuItem>
                    </MenuContent>
                </MenuRoot>

                {/* Desktop: inline buttons */}
                <HStack display={{ base: 'none', md: 'flex' }} gap={2}>
                    <Button disabled={routes.length === 0} variant="outline" size="sm" onClick={() => setTimeAnalysisOpen(true)}>
                        <LuChartLine /> Time Based Analysis
                    </Button>
                    <Button disabled={routes.length === 0} variant="outline" size="sm" onClick={() => setCalendarOpen(true)}>
                        <LuCalendar /> Calendar
                    </Button>
                    <Button disabled={routes.length === 0} variant="outline" size="sm" onClick={() => setAICoachOpen(true)}>
                        <LuBrain /> AI Coach
                    </Button>
                    <Button loading={fileUploadLoader} variant="outline" size="sm" onClick={() => fitUploadRef.current?.click()}>
                        <LuUpload /> Upload route
                    </Button>
                    <Button loading={exportLoader} disabled={routes.length === 0} variant="outline" size="sm" onClick={handleExportRoutes}>
                        <LuDownload /> Export routes
                    </Button>
                    <Button loading={importLoader} variant="outline" size="sm" onClick={() => jsonUploadRef.current?.click()}>
                        <CiImport /> Import routes
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSyncOpen(true)}>
                        <LuRefreshCw /> Sync
                    </Button>
                </HStack>
            </HStack>

            {/* Dialogs controlled from menu */}
            <TimeBasedAnalysisDialog
                fileUploadLoader={fileUploadLoader}
                importLoader={importLoader}
                open={timeAnalysisOpen}
                onOpenChange={({ open }) => setTimeAnalysisOpen(open)}
            />
            <CalendarDialog
                fileUploadLoader={fileUploadLoader}
                importLoader={importLoader}
                open={calendarOpen}
                onOpenChange={({ open }) => setCalendarOpen(open)}
            />
            <AICoachDialog
                open={aiCoachOpen}
                onOpenChange={({ open }) => setAICoachOpen(open)}
            />
            <SyncDialog
                open={syncOpen}
                onClose={() => setSyncOpen(false)}
                onSyncDone={() => setRefresh(r => !r)}
            />

            {/* Mobile cards */}
            <VStack display={{ base: 'flex', md: 'none' }} gap={2} w="100%" overflowY="auto" flex="1" minH="0">
                {filteredRoutes.map((route) => (
                    <Box key={route.id} w="100%" borderWidth="1px" rounded="md" p={3}>
                        <HStack justify="space-between" align="flex-start">
                            <VStack align="flex-start" gap={1} flex={1} minW={0}>
                                <Dialog.Root size="full">
                                    <Dialog.Trigger asChild>
                                        <Link colorPalette="teal" fontWeight="semibold" fontSize="sm">
                                            {route.routeName}
                                        </Link>
                                    </Dialog.Trigger>
                                    <Dialog.Backdrop />
                                    <Portal>
                                        <Dialog.Positioner>
                                            <Dialog.Content display="flex" flexDirection="column" h="100dvh">
                                                <Dialog.Header>
                                                    <Dialog.Title>
                                                        {route.routeName}: {formatDate(new Date(route.summary.startTime.toString()))}
                                                    </Dialog.Title>
                                                </Dialog.Header>
                                                <Dialog.Body p={0} flex="1" minH="0" overflow="hidden">
                                                    <Map points={route.points.map(point => [point.lat, point.lng])} />
                                                </Dialog.Body>
                                                <Dialog.CloseTrigger asChild>
                                                    <CloseButton size="lg" />
                                                </Dialog.CloseTrigger>
                                            </Dialog.Content>
                                        </Dialog.Positioner>
                                    </Portal>
                                </Dialog.Root>
                                <Text fontSize="xs" color="gray.400">
                                    {formatDateShort(new Date(route.summary.startTime.toString()))}
                                </Text>
                                <HStack gap={3} flexWrap="wrap">
                                    <Text fontSize="sm"><Text as="span" fontWeight="bold">{Math.round(route.summary.totalDistance * 100) / 100}</Text> km</Text>
                                    <Text fontSize="sm"><Text as="span" fontWeight="bold">{secondsToHHMM(route.summary.totalMovingTime)}</Text> h</Text>
                                    {route.summary.avgSpeed > 0 && <Text fontSize="sm"><Text as="span" fontWeight="bold">{Math.round(route.summary.avgSpeed * 10) / 10}</Text> km/h</Text>}
                                    {route.summary.totalCalories > 0 && <Text fontSize="sm"><Text as="span" fontWeight="bold">{Math.round(route.summary.totalCalories)}</Text> kcal</Text>}
                                </HStack>
                            </VStack>
                            <MenuRoot>
                                <MenuTrigger asChild>
                                    <IconButton size="xs" variant="ghost" loading={sharingRouteId === route.id}>
                                        <LuEllipsis />
                                    </IconButton>
                                </MenuTrigger>
                                <MenuContent>
                                    <MenuItem value="share" onClick={() => handleShareRoute(route)}>
                                        <IoShareSocialOutline /> Share
                                    </MenuItem>
                                    <MenuItem value="rename" onClick={() => { setActionRoute(route); setRenameOpen(true); }}>
                                        <MdDriveFileRenameOutline /> Rename
                                    </MenuItem>
                                    <MenuSeparator />
                                    <MenuItem value="delete" color="red.400" onClick={() => { setActionRoute(route); setDeleteOpen(true); }}>
                                        <MdDelete /> Delete
                                    </MenuItem>
                                </MenuContent>
                            </MenuRoot>
                        </HStack>
                    </Box>
                ))}
            </VStack>

            {/* Table (desktop only) */}
            <Table.ScrollArea display={{ base: 'none', md: 'block' }} flex="1" minH="0" w="100%">
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
                                display={{ base: 'none', md: 'table-cell' }}
                                cursor="pointer"
                                userSelect='none'
                                _hover={{ bg: 'gray.800' }}
                                onClick={() => handleSort('avgSpeed')}
                            >
                                Avg Speed [km/h]
                                <SortIcon direction={sortConfig.key === 'avgSpeed' ? sortConfig.direction : null} />
                            </Table.ColumnHeader>
                            <Table.ColumnHeader
                                display={{ base: 'none', md: 'table-cell' }}
                                cursor="pointer"
                                userSelect='none'
                                _hover={{ bg: 'gray.800' }}
                                onClick={() => handleSort('maxSpeed')}
                            >
                                Max Speed [km/h]
                                <SortIcon direction={sortConfig.key === 'maxSpeed' ? sortConfig.direction : null} />
                            </Table.ColumnHeader>
                            <Table.ColumnHeader
                                display={{ base: 'none', md: 'table-cell' }}
                                cursor="pointer"
                                userSelect='none'
                                _hover={{ bg: 'gray.800' }}
                                onClick={() => handleSort('totalCalories')}
                            >
                                Calories [kcal]
                                <SortIcon direction={sortConfig.key === 'totalCalories' ? sortConfig.direction : null} />
                            </Table.ColumnHeader>
                            <Table.ColumnHeader
                                cursor="pointer"
                                userSelect='none'
                                _hover={{ bg: 'gray.800' }}
                                onClick={() => handleSort('totalDistance')}
                            >
                                Distance [km]
                                <SortIcon direction={sortConfig.key === 'totalDistance' ? sortConfig.direction : null} />
                            </Table.ColumnHeader>
                            <Table.ColumnHeader
                                display={{ base: 'none', md: 'table-cell' }}
                                cursor="pointer"
                                userSelect='none'
                                _hover={{ bg: 'gray.800' }}
                                onClick={() => handleSort('totalMovingTime')}
                            >
                                Moving Time
                                <SortIcon direction={sortConfig.key === 'totalMovingTime' ? sortConfig.direction : null} />
                            </Table.ColumnHeader>
                            <Table.ColumnHeader
                                display={{ base: 'none', md: 'table-cell' }}
                                cursor="pointer"
                                userSelect='none'
                                _hover={{ bg: 'gray.800' }}
                                onClick={() => handleSort('totalTime')}
                            >
                                Total Time
                                <SortIcon direction={sortConfig.key === 'totalTime' ? sortConfig.direction : null} />
                            </Table.ColumnHeader>
                            <Table.ColumnHeader width="1px" whiteSpace="nowrap">Actions</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {
                            filteredRoutes.map((route) => (
                                <Table.Row key={route.id}>
                                    <Table.Cell>
                                        <Dialog.Root size="cover">
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
                                    <Table.Cell display={{ base: 'none', md: 'table-cell' }}>{Math.round(route.summary.avgSpeed * 100) / 100}</Table.Cell>
                                    <Table.Cell display={{ base: 'none', md: 'table-cell' }}>{Math.round(route.summary.maxSpeed * 100) / 100}</Table.Cell>
                                    <Table.Cell display={{ base: 'none', md: 'table-cell' }}>{Math.round(route.summary.totalCalories * 100) / 100}</Table.Cell>
                                    <Table.Cell>{Math.round(route.summary.totalDistance * 100) / 100}</Table.Cell>
                                    <Table.Cell display={{ base: 'none', md: 'table-cell' }}>{secondsToHHMM(route.summary.totalMovingTime)}</Table.Cell>
                                    <Table.Cell display={{ base: 'none', md: 'table-cell' }}>{secondsToHHMM(route.summary.totalTime)}</Table.Cell>
                                    <Table.Cell width="1px">
                                        <MenuRoot>
                                            <MenuTrigger asChild>
                                                <IconButton
                                                    size="xs"
                                                    variant="ghost"
                                                    loading={sharingRouteId === route.id}
                                                >
                                                    <LuEllipsis />
                                                </IconButton>
                                            </MenuTrigger>
                                            <MenuContent>
                                                <MenuItem
                                                    value="share"
                                                    onClick={() => handleShareRoute(route)}
                                                >
                                                    <IoShareSocialOutline /> Share
                                                </MenuItem>
                                                <MenuItem
                                                    value="rename"
                                                    onClick={() => { setActionRoute(route); setRenameOpen(true); }}
                                                >
                                                    <MdDriveFileRenameOutline /> Rename
                                                </MenuItem>
                                                <MenuSeparator />
                                                <MenuItem
                                                    value="delete"
                                                    color="red.400"
                                                    onClick={() => { setActionRoute(route); setDeleteOpen(true); }}
                                                >
                                                    <MdDelete /> Delete
                                                </MenuItem>
                                            </MenuContent>
                                        </MenuRoot>
                                    </Table.Cell>
                                </Table.Row>
                            ))
                        }
                    </Table.Body>
                </Table.Root>
            </Table.ScrollArea>

            {/* Rename dialog */}
            <Dialog.Root
                placement="center"
                open={renameOpen}
                onOpenChange={({ open }) => { setRenameOpen(open); if (!open) setNewRouteName(''); }}
            >
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
                                        Current route name: <b>{actionRoute?.routeName}</b>
                                    </List.Item>
                                    <List.Item>
                                        <Input
                                            placeholder="New route name"
                                            size="sm"
                                            value={newRouteName}
                                            onChange={(e) => setNewRouteName(e.target.value)}
                                        />
                                    </List.Item>
                                </List.Root>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="outline">Close</Button>
                                </Dialog.ActionTrigger>
                                <Button
                                    colorPalette="green"
                                    variant="subtle"
                                    loading={updateRouteNameLoader}
                                    disabled={newRouteName.trim().length === 0}
                                    onClick={() => handleUpdateRouteName(actionRoute?.id)}
                                >
                                    Update
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            {/* Delete dialog */}
            <Dialog.Root
                placement="center"
                open={deleteOpen}
                onOpenChange={({ open }) => setDeleteOpen(open)}
            >
                <Dialog.Backdrop />
                <Portal>
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>
                                <Dialog.Title>Are you sure you want to delete this route?</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Footer>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="outline">Close</Button>
                                </Dialog.ActionTrigger>
                                <Button
                                    colorPalette="red"
                                    variant="subtle"
                                    loading={refresh}
                                    onClick={() => handleDeleteRoute(actionRoute?.id)}
                                >
                                    Delete
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            <Toaster />

        </VStack>
    )
}

export default App
