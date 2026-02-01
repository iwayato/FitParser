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
    VStack,
    Stat
} from "@chakra-ui/react";
import {
    AreaChart,
    Area,
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

    const [data, setData] = useState([]);
    const [stats, setStats] = useState();
    const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
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
        const getRoutesByPeriod = async () => {
            const data = await routeStorage.getRoutesByDateRange(startDate, endDate)
            setData(data.map(route => route.summary).reverse())
            setStats({
                totalRoutes: data.length,
                totalDistance: data.reduce((sum, r) => sum + (r.summary.totalDistance || 0), 0),
                totalMovingTime: data.reduce((sum, r) => sum + (r.summary.totalMovingTime || 0), 0),
                totalCalories: data.reduce((sum, r) => sum + (r.summary.totalCalories || 0), 0)
            })
        }
        if (startDate !== null && endDate !== null) {
            getRoutesByPeriod()
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
                            <HStack spacing={2}>
                                <Button
                                    size="sm"
                                    variant="subtle"
                                    colorPalette={'green'}
                                    onClick={() => {
                                        setStartDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
                                        setEndDate(new Date())
                                    }}
                                >
                                    1W
                                </Button>
                                <Button
                                    size="sm"
                                    variant="subtle"
                                    colorPalette={'green'}
                                    onClick={() => {
                                        setStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
                                        setEndDate(new Date())
                                    }}
                                >
                                    1M
                                </Button>
                                <Button
                                    size="sm"
                                    variant="subtle"
                                    colorPalette={'green'}
                                    onClick={() => {
                                        setStartDate(new Date(new Date().getFullYear(), 0, 1))
                                        setEndDate(new Date())
                                    }}
                                >
                                    YTD
                                </Button>
                                <Button
                                    size="sm"
                                    variant="subtle"
                                    colorPalette={'green'}
                                    onClick={() => {
                                        setStartDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
                                        setEndDate(new Date())
                                    }}
                                >
                                    1Y
                                </Button>
                                <Button
                                    size="sm"
                                    variant="subtle"
                                    colorPalette={'green'}
                                    onClick={() => {
                                        setStartDate(new Date(0))
                                        setEndDate(new Date())
                                    }}
                                >
                                    Beginning
                                </Button>
                            </HStack>

                            {/* Stats */}
                            <HStack gap={5} mt={6}>
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

                            {/* Charts */}
                            <Carousel.Root slideCount={5} mt='30px'>
                                <Carousel.ItemGroup>

                                    {/* Avg Speed */}
                                    <Carousel.Item key={2} index={2}>
                                        <VStack gap={5}>
                                            <Text fontSize='2xl'>Avg speed [km/h]</Text>
                                            <div style={{ width: '100%', height: 'calc(100vh - 400px)', minHeight: '100px', minWidth: '100px'}}>
                                                <ResponsiveContainer>
                                                    <AreaChart
                                                        data={data.map(row => {
                                                            return {
                                                                date: format(new Date(row.startTime).toString(), "dd/MM/yyyy"),
                                                                avgSpeed: row.avgSpeed
                                                            }
                                                        })}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="date" />
                                                        <YAxis />
                                                        <Tooltip
                                                            labelStyle={{ color: "black" }}
                                                            formatter={(value, name, props) => {
                                                                return [`${Math.round(value * 100) / 100}`, "Avg speed"];
                                                            }}
                                                        />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="avgSpeed"
                                                            activeDot={{ r: 8 }}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </VStack>
                                    </Carousel.Item>

                                    {/* Max Speed */}
                                    <Carousel.Item key={3} index={3}>
                                        <VStack gap={5}>
                                            <Text fontSize='2xl'>Max speed [km/h]</Text>
                                            <div style={{ width: '100%', height: 'calc(100vh - 400px)', minHeight: '100px', minWidth: '100px'}}>
                                                <ResponsiveContainer>
                                                    <AreaChart
                                                        data={data.map(row => {
                                                            return {
                                                                date: format(new Date(row.startTime).toString(), "dd/MM/yyyy"),
                                                                maxSpeed: row.maxSpeed
                                                            }
                                                        })}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="date" />
                                                        <YAxis />
                                                        <Tooltip
                                                            labelStyle={{ color: "black" }}
                                                            formatter={(value, name, props) => {
                                                                return [`${Math.round(value * 100) / 100}`, "Max speed"];
                                                            }}
                                                        />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="maxSpeed"
                                                            activeDot={{ r: 8 }}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </VStack>
                                    </Carousel.Item>

                                    {/* Total Calories */}
                                    <Carousel.Item key={4} index={4}>
                                        <VStack gap={5}>
                                            <Text fontSize='2xl'>Total calories [kcal]</Text>
                                            <div style={{ width: '100%', height: 'calc(100vh - 400px)', minHeight: '100px', minWidth: '100px'}}>
                                                <ResponsiveContainer>
                                                    <AreaChart
                                                        data={data.map(row => {
                                                            return {
                                                                date: format(new Date(row.startTime).toString(), "dd/MM/yyyy"),
                                                                totalCalories: row.totalCalories
                                                            }
                                                        })}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="date" />
                                                        <YAxis />
                                                        <Tooltip
                                                            labelStyle={{ color: "black" }}
                                                            formatter={(value, name, props) => {
                                                                return [`${Math.round(value * 100) / 100}`, "Total calories"];
                                                            }}
                                                        />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="totalCalories"
                                                            activeDot={{ r: 8 }}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </VStack>
                                    </Carousel.Item>

                                    {/* Total Distance */}
                                    <Carousel.Item key={5} index={5}>
                                        <VStack gap={5}>
                                            <Text fontSize='2xl'>Total distance [km]</Text>
                                            <div style={{ width: '100%', height: 'calc(100vh - 400px)', minHeight: '100px', minWidth: '100px'}}>
                                                <ResponsiveContainer>
                                                    <AreaChart
                                                        data={data.map(row => {
                                                            return {
                                                                date: format(new Date(row.startTime).toString(), "dd/MM/yyyy"),
                                                                totalDistance: row.totalDistance
                                                            }
                                                        })}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="date" />
                                                        <YAxis />
                                                        <Tooltip
                                                            labelStyle={{ color: "black" }}
                                                            formatter={(value, name, props) => {
                                                                return [`${Math.round(value * 100) / 100}`, "Total distance"];
                                                            }}
                                                        />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="totalDistance"
                                                            activeDot={{ r: 8 }}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </VStack>
                                    </Carousel.Item>

                                    {/* Total Moving Time */}
                                    <Carousel.Item key={6} index={6}>
                                        <VStack gap={5}>
                                            <Text fontSize='2xl'>Total moving time [hh:mm]</Text>
                                            <div style={{ width: '100%', height: 'calc(100vh - 400px)', minHeight: '100px', minWidth: '100px'}}>
                                                <ResponsiveContainer>
                                                    <AreaChart
                                                        data={data.map(row => {
                                                            return {
                                                                date: format(new Date(row.startTime).toString(), "dd/MM/yyyy"),
                                                                totalMovingTime: row.totalMovingTime
                                                            }
                                                        })}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="date" />
                                                        <YAxis />
                                                        <Tooltip
                                                            labelStyle={{ color: "black" }}
                                                            formatter={(value, name, props) => {
                                                                return [`${secondsToHHMM(value)}`, "Total moving time"];
                                                            }}
                                                        />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="totalMovingTime"
                                                            activeDot={{ r: 8 }}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
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