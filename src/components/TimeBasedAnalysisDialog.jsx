import {
    Dialog,
    CloseButton,
    Button,
    Portal,
    HStack,
    Input,
    Box,
    Text,
    Table,
    Carousel,
    IconButton,
    VStack
} from "@chakra-ui/react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid
} from "recharts"
import { format } from "date-fns"
import { LuChevronLeft, LuChevronRight } from "react-icons/lu"
import { useEffect, useState } from "react";
import { IoAnalytics } from "react-icons/io5";
import { DatePicker } from "react-datepicker";
import { startOfMonth, endOfMonth } from "date-fns"
import { formatDate } from "../utils/otherParsers";
import { secondsToHHMM } from "../utils/otherParsers";
import routeStorage from "../utils/routeStorage";
import "react-datepicker/dist/react-datepicker.css";

const TimeBasedAnalysisDialog = ({ disabled }) => {

    const [rows, setRows] = useState([]);
    const [startDate, setStartDate] = useState(startOfMonth(new Date()));
    const [endDate, setEndDate] = useState(new Date());

    const wrapText = (text, maxCharsPerLine = 10) => {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            if ((currentLine + word).length <= maxCharsPerLine) {
                currentLine += `${word} `;
            } else {
                lines.push(currentLine.trim());
                currentLine = `${word} `;
            }
        });

        if (currentLine) lines.push(currentLine.trim());
        return lines;
    };

    const WrappedTick = ({ x, y, payload }) => {
        const lines = wrapText(payload.value, 12);

        return (
            <g transform={`translate(${x},${y})`}>
                <text textAnchor="middle" dy={16}>
                    {lines.map((line, index) => (
                        <tspan
                            key={index}
                            x={0}
                            dy={index === 0 ? 0 : 14}
                        >
                            {line}
                        </tspan>
                    ))}
                </text>
            </g>
        );
    };

    const groupRoutes = (data) => {
        let row = {
            startDate: startDate,
            endDate: endDate,
            totalRoutes: 0,
            avgSpeed: 0,
            avgMaxSpeed: 0,
            totalCalories: 0,
            totalDistance: 0,
            totalMovingTime: 0
        }
        data.forEach(route => {
            row.totalRoutes += 1
            row.avgSpeed += route.summary.avgSpeed / data.length
            row.avgMaxSpeed += route.summary.maxSpeed / data.length
            row.totalCalories += route.summary.totalCalories
            row.totalDistance += route.summary.totalDistance
            row.totalMovingTime += route.summary.totalMovingTime
        })
        return row;
    }

    useEffect(() => {
        const getMonthRoutes = async () => {
            const data = await routeStorage.getRoutesByDateRange(startDate, endDate)
            setRows([...rows, groupRoutes(data)])
        }
        if (startDate !== null && endDate !== null) {
            getMonthRoutes()
        }
    }, [startDate, endDate])

    return (
        <Dialog.Root size='full' >
            <Dialog.Trigger asChild>
                <Button
                    disabled={disabled}
                    variant="outline"
                    size="sm"
                >
                    <IoAnalytics /> Time Based Analysis
                </Button>
            </Dialog.Trigger>
            <Dialog.Backdrop />
            <Portal>
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>
                                Time Based Analysis
                            </Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>

                            {/* Period Selector */}
                            <HStack spacing={2} py={5}>
                                Time period:
                                <DatePicker
                                    selectsRange
                                    preventOpenOnFocus
                                    autoFocus={false}
                                    startDate={startDate}
                                    endDate={endDate}
                                    onChange={([start, end]) => {
                                        setStartDate(start)
                                        setEndDate(end)
                                    }}
                                    dateFormat="dd/MM/yyyy"
                                    maxDate={new Date()}
                                    customInput={<Input size="sm" w='185px' />}
                                />
                                <Button
                                    size="sm"
                                    variant="subtle"
                                    colorPalette={'yellow'}
                                    onClick={() => { setRows([]) }}
                                >
                                    Reset
                                </Button>
                            </HStack>

                            {/* Table */}
                            <Table.ScrollArea h="calc(40vh - 100px)" w="100%">
                                <Table.Root size="sm" striped showColumnBorder>
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.ColumnHeader>Start date</Table.ColumnHeader>
                                            <Table.ColumnHeader>End date</Table.ColumnHeader>
                                            <Table.ColumnHeader>Total routes</Table.ColumnHeader>
                                            <Table.ColumnHeader>Avg speed [km/h]</Table.ColumnHeader>
                                            <Table.ColumnHeader>Avg max speed [km/h]</Table.ColumnHeader>
                                            <Table.ColumnHeader>Total calories [kcal]</Table.ColumnHeader>
                                            <Table.ColumnHeader>Total distance [km]</Table.ColumnHeader>
                                            <Table.ColumnHeader>Total moving time [hh:mm]</Table.ColumnHeader>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {
                                            rows.map((row, index) => (
                                                <Table.Row key={index}>
                                                    <Table.Cell>{formatDate(row.startDate)}</Table.Cell>
                                                    <Table.Cell>{formatDate(row.endDate)}</Table.Cell>
                                                    <Table.Cell>{row.totalRoutes}</Table.Cell>
                                                    <Table.Cell>{Math.round(row.avgSpeed * 100) / 100}</Table.Cell>
                                                    <Table.Cell>{Math.round(row.avgMaxSpeed * 100) / 100}</Table.Cell>
                                                    <Table.Cell>{Math.round(row.totalCalories * 100) / 100}</Table.Cell>
                                                    <Table.Cell>{Math.round(row.totalDistance * 100) / 100}</Table.Cell>
                                                    <Table.Cell>{secondsToHHMM(row.totalMovingTime)}</Table.Cell>
                                                </Table.Row>
                                            ))
                                        }
                                    </Table.Body>
                                </Table.Root>
                            </Table.ScrollArea>

                            {/* Charts */}
                            <Carousel.Root slideCount={6} width="100%" px='20px' mt='50px'>
                                <Carousel.ItemGroup>

                                    {/* Total routes */}
                                    <Carousel.Item key={1} index={1}>
                                        <VStack gap={5}>
                                            <Text fontSize='2xl'>Total routes</Text>
                                            <ResponsiveContainer width="100%" height={285}>
                                                <BarChart data={rows.map(row => {
                                                    return {
                                                        date: format(row.startDate, "dd/MM/yyyy") + ' - ' + format(row.endDate, "dd/MM/yyyy"),
                                                        data: row.totalRoutes
                                                    }
                                                })}
                                                >
                                                    <CartesianGrid strokeDasharray="2 2" />
                                                    <XAxis dataKey="date" />
                                                    <YAxis width="auto" />
                                                    <Bar dataKey="data" fill="#8884d8" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </VStack>
                                    </Carousel.Item>

                                    {/* Avg Speed */}
                                    <Carousel.Item key={2} index={2}>
                                        <VStack gap={5}>
                                            <Text fontSize='2xl'>Avg speed [km/h]</Text>
                                            <ResponsiveContainer width="100%" height={285}>
                                                <BarChart data={rows.map(row => {
                                                    return {
                                                        date: format(row.startDate, "dd/MM/yyyy") + ' - ' + format(row.endDate, "dd/MM/yyyy"),
                                                        data: row.avgSpeed
                                                    }
                                                })}
                                                >
                                                    <CartesianGrid strokeDasharray="2 2" />
                                                    <XAxis dataKey="date" />
                                                    <YAxis width="auto" />
                                                    <Bar dataKey="data" fill="#8884d8" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </VStack>
                                    </Carousel.Item>

                                    {/* Avg Max Speed */}
                                    <Carousel.Item key={3} index={3}>
                                        <VStack gap={5}>
                                            <Text fontSize='2xl'>Avg max speed [km/h]</Text>
                                            <ResponsiveContainer width="100%" height={285}>
                                                <BarChart data={rows.map(row => {
                                                    return {
                                                        date: format(row.startDate, "dd/MM/yyyy") + ' - ' + format(row.endDate, "dd/MM/yyyy"),
                                                        data: row.avgMaxSpeed
                                                    }
                                                })}
                                                >
                                                    <CartesianGrid strokeDasharray="2 2" />
                                                    <XAxis dataKey="date" />
                                                    <YAxis width="auto" />
                                                    <Bar dataKey="data" fill="#8884d8" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </VStack>
                                    </Carousel.Item>

                                    {/* Total Calories */}
                                    <Carousel.Item key={4} index={4}>
                                        <VStack gap={5}>
                                            <Text fontSize='2xl'>Total calories [kcal]</Text>
                                            <ResponsiveContainer width="100%" height={285}>
                                                <BarChart data={rows.map(row => {
                                                    return {
                                                        date: format(row.startDate, "dd/MM/yyyy") + ' - ' + format(row.endDate, "dd/MM/yyyy"),
                                                        data: row.totalCalories
                                                    }
                                                })}
                                                >
                                                    <CartesianGrid strokeDasharray="2 2" />
                                                    <XAxis dataKey="date" />
                                                    <YAxis width="auto" />
                                                    <Bar dataKey="data" fill="#8884d8" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </VStack>
                                    </Carousel.Item>

                                    {/* Total Distance */}
                                    <Carousel.Item key={5} index={5}>
                                        <VStack gap={5}>
                                            <Text fontSize='2xl'>Total distance [km]</Text>
                                            <ResponsiveContainer width="100%" height={285}>
                                                <BarChart data={rows.map(row => {
                                                    return {
                                                        date: format(row.startDate, "dd/MM/yyyy") + ' - ' + format(row.endDate, "dd/MM/yyyy"),
                                                        data: row.totalDistance
                                                    }
                                                })}
                                                >
                                                    <CartesianGrid strokeDasharray="2 2" />
                                                    <XAxis dataKey="date" />
                                                    <YAxis width="auto" />
                                                    <Bar dataKey="data" fill="#8884d8" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </VStack>
                                    </Carousel.Item>

                                    {/* Total Moving Time */}
                                    <Carousel.Item key={6} index={6}>
                                        <VStack gap={5}>
                                            <Text fontSize='2xl'>Total moving time [hh:mm]</Text>
                                            <ResponsiveContainer width="100%" height={285}>
                                                <BarChart data={rows.map(row => {
                                                    return {
                                                        date: format(row.startDate, "dd/MM/yyyy") + ' - ' + format(row.endDate, "dd/MM/yyyy"),
                                                        data: row.totalMovingTime
                                                    }
                                                })}
                                                >
                                                    <CartesianGrid strokeDasharray="2 2" />
                                                    <XAxis dataKey="date" />
                                                    <YAxis width="auto" tickFormatter={secondsToHHMM} />
                                                    <Bar dataKey="data" fill="#8884d8" >
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </VStack>
                                    </Carousel.Item>

                                </Carousel.ItemGroup>
                                <Carousel.Control justifyContent="center" gap="4">
                                    <Carousel.PrevTrigger asChild>
                                        <IconButton size="xs" variant="ghost">
                                            <LuChevronLeft />
                                        </IconButton>
                                    </Carousel.PrevTrigger>
                                    <Carousel.Indicators />
                                    <Carousel.NextTrigger asChild>
                                        <IconButton size="xs" variant="ghost">
                                            <LuChevronRight />
                                        </IconButton>
                                    </Carousel.NextTrigger>
                                </Carousel.Control>
                            </Carousel.Root>
                        </Dialog.Body>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton size="lg" />
                        </Dialog.CloseTrigger>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    )
}

export default TimeBasedAnalysisDialog;