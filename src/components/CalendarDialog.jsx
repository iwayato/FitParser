import {
    Dialog,
    CloseButton,
    Button,
    Portal,
    HStack,
    Box,
    Text,
    VStack,
    IconButton,
    Grid,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { BsCalendar3 } from "react-icons/bs";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    isSameMonth,
    addMonths,
    subMonths,
} from "date-fns";
import routeStorage from "../utils/routeStorage";
import { secondsToHHMM } from "../utils/otherParsers";

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CalendarDialog = ({ disabled, fileUploadLoader, importLoader }) => {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
    const [routes, setRoutes] = useState([]);
    const [hoveredDay, setHoveredDay] = useState(null);

    useEffect(() => {
        const fetchRoutes = async () => {
            const start = startOfMonth(currentMonth);
            const end = endOfMonth(currentMonth);
            const data = await routeStorage.getRoutesByDateRange(start, end);
            setRoutes(data);
        };
        fetchRoutes();
    }, [currentMonth, fileUploadLoader, importLoader]);

    const calendarDays = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }),
    });

    const getRoutesForDay = (day) =>
        routes.filter(r => isSameDay(new Date(r.summary.startTime), day));

    const isNextDisabled = isSameMonth(currentMonth, today);

    return (
        <Dialog.Root size="full">
            <Dialog.Trigger asChild>
                <Button disabled={disabled} variant="outline" size="sm">
                    <BsCalendar3 /> Calendar
                </Button>
            </Dialog.Trigger>
            <Dialog.Backdrop />
            <Portal>
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>Route Calendar</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body pb={6}>
                            {/* Month navigation */}
                            <HStack justify="center" mb={4} gap={4}>
                                <IconButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCurrentMonth(m => subMonths(m, 1))}
                                    aria-label="Previous month"
                                >
                                    <LuChevronLeft />
                                </IconButton>
                                <Text fontWeight="semibold" fontSize="lg" minW="160px" textAlign="center">
                                    {format(currentMonth, 'MMMM yyyy')}
                                </Text>
                                <IconButton
                                    variant="ghost"
                                    size="sm"
                                    disabled={isNextDisabled}
                                    onClick={() => setCurrentMonth(m => addMonths(m, 1))}
                                    aria-label="Next month"
                                >
                                    <LuChevronRight />
                                </IconButton>
                            </HStack>

                            {/* Weekday headers */}
                            <Grid templateColumns="repeat(7, 1fr)" mb={1}>
                                {WEEKDAYS.map(day => (
                                    <Box key={day} textAlign="center" py={2}>
                                        <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
                                            {day}
                                        </Text>
                                    </Box>
                                ))}
                            </Grid>

                            {/* Calendar grid */}
                            <Grid templateColumns="repeat(7, 1fr)" gap={1}>
                                {calendarDays.map((day, idx) => {
                                    const dayRoutes = getRoutesForDay(day);
                                    const isCurrentMonth = isSameMonth(day, currentMonth);
                                    const isToday = isSameDay(day, today);
                                    const hasRoutes = dayRoutes.length > 0;

                                    // Tooltip positioning: flip left for right-side columns, flip up for last rows
                                    const col = idx % 7;
                                    const totalRows = Math.ceil(calendarDays.length / 7);
                                    const row = Math.floor(idx / 7);
                                    const tooltipHAlign = col >= 4 ? { right: 0 } : { left: 0 };
                                    const tooltipVAlign = row >= totalRows - 2
                                        ? { bottom: "100%", mb: 1, mt: 0 }
                                        : { top: "100%", mt: 1, mb: 0 };

                                    return (
                                        <Box
                                            key={idx}
                                            position="relative"
                                            minH="90px"
                                            p={1.5}
                                            borderRadius="md"
                                            borderWidth="1px"
                                            borderColor={isToday ? "green.500" : "border"}
                                            bg={isCurrentMonth ? undefined : "bg.subtle"}
                                            opacity={isCurrentMonth ? 1 : 0.35}
                                            cursor={hasRoutes && isCurrentMonth ? "pointer" : "default"}
                                            onMouseEnter={() => hasRoutes && isCurrentMonth && setHoveredDay(day)}
                                            onMouseLeave={() => setHoveredDay(null)}
                                        >
                                            <Text
                                                fontSize="sm"
                                                fontWeight={isToday ? "bold" : "normal"}
                                                color={isToday ? "green.500" : undefined}
                                                mb={1}
                                            >
                                                {format(day, 'd')}
                                            </Text>

                                            {/* Route labels inside cell */}
                                            {isCurrentMonth && hasRoutes && (
                                                <VStack gap={1} align="stretch">
                                                    {dayRoutes.slice(0, 2).map((route, i) => (
                                                        <Box
                                                            key={i}
                                                            bg="green.subtle"
                                                            borderRadius="sm"
                                                            px={1}
                                                            py={0.5}
                                                        >
                                                            <Text
                                                                fontSize="xs"
                                                                color="green.fg"
                                                                overflow="hidden"
                                                                textOverflow="ellipsis"
                                                                whiteSpace="nowrap"
                                                            >
                                                                {route.routeName}
                                                            </Text>
                                                        </Box>
                                                    ))}
                                                    {dayRoutes.length > 2 && (
                                                        <Text fontSize="xs" color="fg.muted" pl={1}>
                                                            +{dayRoutes.length - 2} more
                                                        </Text>
                                                    )}
                                                </VStack>
                                            )}

                                            {/* Hover tooltip */}
                                            {hoveredDay && isSameDay(hoveredDay, day) && (
                                                <Box
                                                    position="absolute"
                                                    zIndex={20}
                                                    {...tooltipHAlign}
                                                    {...tooltipVAlign}
                                                    bg="bg.panel"
                                                    borderWidth="1px"
                                                    borderColor="border"
                                                    borderRadius="md"
                                                    p={3}
                                                    shadow="lg"
                                                    minW="210px"
                                                    maxW="260px"
                                                >
                                                    <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={2}>
                                                        {format(day, 'MMMM d, yyyy')}
                                                    </Text>
                                                    <VStack align="stretch" gap={2}>
                                                        {dayRoutes.map((route, i) => (
                                                            <Box
                                                                key={i}
                                                                borderTopWidth={i > 0 ? "1px" : "0"}
                                                                borderColor="border"
                                                                pt={i > 0 ? 2 : 0}
                                                            >
                                                                <Text
                                                                    fontSize="sm"
                                                                    fontWeight="semibold"
                                                                    mb={1}
                                                                    overflow="hidden"
                                                                    textOverflow="ellipsis"
                                                                    whiteSpace="nowrap"
                                                                >
                                                                    {route.routeName}
                                                                </Text>
                                                                <VStack align="start" gap={0.5}>
                                                                    {route.summary.totalDistance != null && (
                                                                        <Text fontSize="xs" color="fg.muted">
                                                                            Distance: {route.summary.totalDistance.toFixed(1)} km
                                                                        </Text>
                                                                    )}
                                                                    {route.summary.totalMovingTime != null && (
                                                                        <Text fontSize="xs" color="fg.muted">
                                                                            Moving Time: {secondsToHHMM(route.summary.totalMovingTime)}
                                                                        </Text>
                                                                    )}
                                                                    {route.summary.avgSpeed != null && (
                                                                        <Text fontSize="xs" color="fg.muted">
                                                                            Avg Speed: {route.summary.avgSpeed.toFixed(1)} km/h
                                                                        </Text>
                                                                    )}
                                                                    {route.summary.totalCalories != null && (
                                                                        <Text fontSize="xs" color="fg.muted">
                                                                            Calories: {route.summary.totalCalories} kcal
                                                                        </Text>
                                                                    )}
                                                                </VStack>
                                                            </Box>
                                                        ))}
                                                    </VStack>
                                                </Box>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Grid>
                        </Dialog.Body>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton size="lg" />
                        </Dialog.CloseTrigger>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
};

export default CalendarDialog;
