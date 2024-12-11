import { collection, Timestamp, where } from "firebase/firestore"
import { useState, useEffect } from "react"
import { LineChart } from "@mui/x-charts"
import { 
    Button,
    Card, 
    CardActionArea, 
    CardContent, 
    Chip, 
    Divider, 
    Grid2, List, 
    ListItem, 
    ListItemButton, 
    ListItemIcon, 
    ListItemText, 
    Paper, 
    Snackbar, 
    TextField, 
    Typography 
} from "@mui/material"
import { axisClasses } from '@mui/x-charts/ChartsAxis';


import { db } from "../modules/firebase"
import { query, getDocs } from "firebase/firestore"

import { convert_data, generate_csv } from "../modules/data_helpers"
import dayjs from "dayjs"
import Prototype5 from "./Prototype5"

interface SensorConfig {
    id: string,
    calibration: number,
    optional: boolean
}

interface DeviceData {
    active_url: string,
    device_id: string,
    ip_address: string,
    last_activity: Timestamp,
    server_up_time: Timestamp,
    is_active: boolean
}

interface DevicePacket {
    all_device_sensors: string[],
    sensor_config: {[key: string]: SensorConfig},
    simulation_sensor_configs: {[key: string]: string},
    env: {[key: string]: string},
    sensor_readings: {[key: string]: number}
}

const experiment_types = ["simulation"]
const properties: {[property: string]: string} = {
    "EXPERIMENT_NAME": "Experiment Name",
    "EMAIL": "Email Senser",
    "EMAIL_TARGET": "Email Target"
}

function DevicesPanel({devicesData, selectedDevice, setSelectedDevice, refresh_devices_list}: 
    {
        devicesData: DeviceData[], selectedDevice: string|null, 
        setSelectedDevice: (n: string|null) => void, 
        refresh_devices_list: () => void
    })
{
    return <Card variant="outlined" sx={{height: "100%"}}>
        <Paper><CardContent>
            <Typography variant="h5" component="div">
                Devices
            </Typography>
            <Button onClick={refresh_devices_list} variant="outlined" sx={{marginTop: 1}}>Refresh</Button>
            {devicesData.map((data) => {
                return <Card sx={{marginTop: 1, borderColor: selectedDevice===data.device_id?"#fb8c00":null}} 
                variant="outlined" key={data.device_id}>
                    <CardActionArea onClick={() => {setSelectedDevice(selectedDevice===data.device_id?null:data.device_id)}}>
                    <Paper elevation={4}>
                        <CardContent>
                            <Typography  sx={{ color: 'text.secondary', fontSize: 14 }}>
                                Device ID:
                            </Typography>
                            <Typography gutterBottom>
                                {data.device_id} 
                            </Typography>

                            {data.is_active && <Chip variant="outlined" label="Online" color="success"/>}
                            {!data.is_active && <Chip variant="outlined" label="Offline" color="error"/>}
                            
                        </CardContent>
                    </Paper>
                    </CardActionArea>
                </Card>
            })}
        </CardContent></Paper>
    </Card>
}

function PropertyEdit({selectedDevice, post_to_device, devicePacket, selectedDeviceData}: 
    {
        selectedDevice: string|null, 
        post_to_device: (...any: any) => void, 
        devicePacket: DevicePacket|undefined, 
        selectedDeviceData: DeviceData|null
    })
{
    const [newDevice, setNewDevice] = useState(true)
    const [deviceProperties, setDeviceProperties] = useState<{[key: string]: string}>({})

    const offline = selectedDeviceData == null || !selectedDeviceData.is_active
    const cardSX ={height: "100%", opacity: offline ? 0.5 : 1,pointerEvents:offline ? "none" : "auto"}

    useEffect(() => {
        setNewDevice(true)
    }, [selectedDevice])

    useEffect(() => {
        if (!newDevice || !devicePacket) { return }
        const newProps: {[key: string]: string} = {}
        Object.keys(properties).map(property => {
            newProps[property] = devicePacket.env[property]
        })
        setDeviceProperties(newProps)
        setNewDevice(false)
    }, [devicePacket, newDevice])


    return <Card variant="outlined" sx={cardSX}><Paper>
        <CardContent>
            <Typography variant="h5" component="div">
                Device Properties
            </Typography>
            <List>
                {Object.keys(properties).map(property => {
                    return <ListItem key={property}><Paper sx={{padding: 1, display: "flex"}} elevation={4} >
                        <TextField 
                        id={`device_property_input_${property}`} 
                        label={properties[property]} 
                        variant="outlined" 
                        size="small"
                        value={deviceProperties[property] || ""}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            const newProps = JSON.parse(JSON.stringify(deviceProperties))
                            newProps[property] = event.target.value
                            setDeviceProperties(newProps)
                        }}
                        defaultValue={devicePacket?.env[property]}
                        helperText={""}
                        />
                        <Button variant="outlined" size="small" sx={{marginLeft: 1}} onClick={() => {
                            const input = document.getElementById(`device_property_input_${property}`) as HTMLInputElement
                            post_to_device({action: "change_env_property", property: property, value: input.value})
                        }}>Update</Button>
                    </Paper>
                        
                    
                    </ListItem>
                })}
                
            </List>
        </CardContent></Paper>
    </Card>
}

const DividerColor = "#555"
function DeviceActionsPanel({post_to_device, selectedDeviceData}: {post_to_device: (...any: any) => Promise<void>, selectedDeviceData: DeviceData|null})
{
    const [snackOpen, setSnackOpen] = useState(false)
    const [snackMessage, setSnackMessage] = useState("")

    function open_snack(snack: string)
    {
        setSnackOpen(true)
        setSnackMessage(snack)
        console.log("snacked")
    }

    async function device_post(post: any, snack: string)
    {
        console.log("sneed")
        await post_to_device(post)
        console.log("sneed2")
        open_snack(snack)
    }

    const [experimentType, setExperimentType] = useState<string>("simulation")
    const start_post = {action: "start_experiment", new_experiment_type: experimentType}
    const start_experiment = () => { device_post(start_post, "Started Experiment") }
    const stop_experiment =  () => { device_post({action: "stop_experiment"}, "Stopped Experiment") }
    const service_update =   () => { device_post({action: "service_update"}, "Updated Service") }
    const service_restart =  () => { device_post({action: "service_restart"}, "Restarted Service") }
    const server_restart =   () => { device_post({action: "server_restart"}, "Restarted Device") } 
    const server_shutdown =  () => { device_post({action: "server_shutdown"}, "Shutdown Device") }  

    const buttonSX = {width: "100%", marginTop: 1}
    const offline = selectedDeviceData == null || !selectedDeviceData.is_active
    const cardSX ={height: "100%", opacity: offline ? 0.5 : 1,pointerEvents:offline ? "none" : "auto"}

    return <Card variant="outlined" sx={cardSX}><Paper>
        <CardContent>
            <Typography variant="h5" component="div">
                Device Actions
            </Typography>
            <Divider variant="fullWidth" sx={{marginTop: 1, color: DividerColor}}>Experiment</Divider>
            <Grid2 container spacing={2} sx={{width: "100%", marginTop: 1}}>
            <Grid2 size={6}>
                    <Button variant="outlined"sx={{width: "100%", marginTop: .25}} onClick={start_experiment}>start</Button>
                </Grid2>
                <Grid2 size={6}>
                
                    <TextField
                id="experiment-picker"
                select
                size="small"
                sx={{width: "100%"}}
                label="Experiment"
                defaultValue="simulation"
                slotProps={{
                    select: {
                    native: true,
                    },
                }}
                >
                {experiment_types.map((option) => (
                    <option key={option} value={option}>
                    {option}
                    </option>
                ))}
                </TextField>
                </Grid2>
                
            
            </Grid2>
            <Button variant="outlined"sx={buttonSX} onClick={stop_experiment}>stop experiment</Button>
            <Divider variant="fullWidth" sx={{marginTop: 1, color: DividerColor}}>Service</Divider>
            <Button variant="outlined"sx={buttonSX} onClick={service_update}>service update</Button>
            <Button variant="outlined"sx={buttonSX} onClick={service_restart}>service restart</Button>
            <Divider variant="fullWidth" sx={{marginTop: 1, color: DividerColor}}>Device</Divider>
            <Button variant="outlined"sx={buttonSX} onClick={server_restart}>device restart</Button>
            <Button variant="outlined"sx={buttonSX} onClick={server_shutdown}>device shutdown</Button>
            
        </CardContent></Paper>
            <Snackbar
            open={snackOpen}
            autoHideDuration={6000}
            onClose={() => setSnackOpen(false)}
            message={snackMessage}
        />
    </Card>
}

function DeviceDataPanel({selectedDeviceData, selectedDevice}: {selectedDeviceData: DeviceData|null, selectedDevice: string|null})
{
    const offline = selectedDeviceData == null || !selectedDeviceData.is_active
    const cardSX ={height: "100%", opacity: offline ? 0.5 : 1,pointerEvents:offline ? "none" : "auto"}
    return <Card variant="outlined" sx={cardSX}>
        <Paper>
            <CardContent>
                <Typography gutterBottom variant="h5" component="div">
                    Connection
                </Typography>

                {/* SSH */}
                <Divider />
                <Typography sx={{ color: 'text.secondary', fontSize: 14, marginTop: 1 }}>
                    IP Address
                </Typography>
                <Typography component="div">
                    {selectedDeviceData && selectedDeviceData.ip_address}
                </Typography>

                {/* Address */}
                <Divider />
                <Typography sx={{ color: 'text.secondary', fontSize: 14, marginTop: 1 }}>
                    Ngrok URL
                </Typography>
                <Typography component="div">
                    {selectedDeviceData && selectedDeviceData.active_url}
                </Typography>
            </CardContent>
        </Paper>
    </Card>
}

function SensorCard({devicePacket, sensor_id}: {devicePacket: DevicePacket|undefined, sensor_id: string})
{
    const [sensorName, setSensorName] = useState("")
    useEffect(() => {
        if (devicePacket == null) {return;}

        let found_config_match = false

        Object.keys(devicePacket.sensor_config || {}).map(sensor_name => {
            const sensor_config: SensorConfig = devicePacket.sensor_config[sensor_name]
            if (sensor_config.id == sensor_id)
            {
                setSensorName(sensor_name)
                found_config_match = true
            }
        })

        if (!found_config_match)
        {
            setSensorName("NO ALIAS")
        }
    }, [sensor_id, devicePacket])

    let reading: number|undefined = devicePacket?.sensor_readings[sensorName]
    if (reading) {reading = Math.round(reading*100)/100}

    return <Card sx={{marginTop: 1}} variant="outlined" key={sensor_id}>
        <Paper elevation={4}>
            <CardContent>
                <Typography>{sensor_id}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 14, marginTop: -.25 }}>
                    Alias: {sensorName}
                </Typography>
                {devicePacket && <Chip label={reading+"°C"}/>}
                <Button>Calibrate</Button>
            </CardContent>
        </Paper>
    </Card>
}

function SensorPanel({devicePacket}: {devicePacket: DevicePacket|undefined})
{
    return <Card variant="outlined" sx={{height: "100%"}}>
        <Paper>
            <CardContent>
                <Typography gutterBottom variant="h5" component="div">
                    Sensors
                </Typography>
                {devicePacket && devicePacket.all_device_sensors.map((sensor_id) => {
                    return <SensorCard devicePacket={devicePacket} sensor_id={sensor_id} key={sensor_id}/>
                })}
            </CardContent>
        </Paper>
    </Card>
}

function ExperimentDisplayPanel()
{
    const [experimentId, setExperimentId] = useState("")
    const [thread, setThread] = useState<[number, number, Timestamp][]>([])

    const [axisData, setAxisData] = useState<Date[]>([])
    const [controlData, setControlData] = useState<number[]>([])
    const [experimentalData, setExperimentalData] = useState<number[]>([])

    async function download_csv()
    {
        const thread = await request_data()

        const csv = "data:text/csv;charset=utf-8,"+generate_csv(thread)
        let encodedUri = encodeURI(csv);
        let link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${experimentId}.csv`);
        document.body.appendChild(link); // Required for FF

        link.click();
    }

    async function request_data()
    {
        const q: any = query(collection(db, "experiment_data"), where('experiment_id', '==', experimentId))
        const docs = await getDocs(q)

        const packets: [number[], number[], Timestamp[]][] = []

        interface firebase_packet 
        {
            control_temp: number[],
            experimental_temp: number[],
            temperature_timestamps: Timestamp[]
        }

        docs.forEach(doc => {
            const data: firebase_packet = doc.data() as firebase_packet
            packets.push([data.control_temp, data.experimental_temp, data.temperature_timestamps])
        })
        
        const new_thread = convert_data(packets)

        setThread(new_thread)

        // const start_time = new_thread[0][2].toMillis()/1000

        const data_points = 50

        let new_control: number[] = []
        let new_experimental: number[] = []
        let new_axis: Date[] = []
        for (let i = 0; i < data_points; i++)
        {
            const j = Math.floor(i/data_points * new_thread.length)

            new_control.push(new_thread[j][0])
            new_experimental.push(new_thread[j][1])
            
            new_axis.push( (new_thread[j][2].toDate()))
        }

        setAxisData(new_axis)
        setControlData(new_control)
        setExperimentalData(new_experimental)

        return new_thread
    }

    return <Card variant="outlined" sx={{height: "100%"}}>
        <Paper>
            <CardContent>
                <Typography variant="h5">
                    Experiment Data
                </Typography>
                <div style={{display: "flex", alignItems: "center"}}>
                <Paper elevation={4} sx={{padding: 1, marginTop: 1}}>
                    <TextField id={`experiment_display_panel_input`} 
                        label="Experiment ID" 
                        variant="outlined" 
                        size="small"
                        value={experimentId}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            setExperimentId(event.target.value)
                        }}
                        />
                        <Button variant="outlined" sx={{marginLeft: 1}} onClick={request_data}>Display</Button>
                        <Button variant="outlined" sx={{marginLeft: 1}} onClick={download_csv}>Download</Button>
                </Paper>
                
                </div>
                <LineChart
            xAxis={[{ data: axisData, scaleType: "time", label: "Time" }]}
            yAxis={ [{label: 'Temperature (C)' }]}
            series={[
                {
                data: controlData,
                label: 'Control Tank',
                color: "#f7a62d",
                showMark: ({ index }) => false,
                },
                {
                data: experimentalData,
                label: 'Expirimental Tank',
                showMark: ({ index }) => false,
                },
            ]}
            width={600}
            height={300}
            sx={{
                [`& .${axisClasses.left} .${axisClasses.label}`]: {
                  transform: 'translateX(-10px)',
                },
              }}
            
            />
            </CardContent>
        </Paper>
    </Card>
}

function Prototype7()
{
    const [devicesData, setDevicesData] = useState<DeviceData[]>([])
    const [selectedDevice, setSelectedDevice] = useState<string|null>(null)
    const [selectedDeviceData, setSelectedDeviceData] = useState<DeviceData|null>(null)
    const [devicePacket, setDevicePacket] = useState<DevicePacket>()

    function getDeviceData(device_id: string): DeviceData|null
    {
        for (let i = 0; i < devicesData.length; i++)
        {
            if (devicesData[i].device_id == device_id)
                return devicesData[i]
        }
        return null
    }

    async function post_to_device(data: any)
    {
        if (selectedDevice == null) {return;}
        const device_data = getDeviceData(selectedDevice)
        if (device_data == null) {return;}
        await fetch(device_data.active_url, {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json"
            }
        });
        
    }

    async function refresh_devices_list()
    {
        const myCollection = collection(db, "devices");

        // Fetch all documents
        const querySnapshot = await getDocs(myCollection);

        // Extract document data
        const devices_data: DeviceData[] = []
        const fetches: Promise<void>[] = []
        querySnapshot.docs.map(async (doc) => {
            const data = doc.data() as DeviceData
            try {
                fetches.push(fetch(data.active_url)
                .then((response) => {
                    data.is_active = response.status === 200
                })
                .catch((error) => {
                    data.is_active = false
                }).finally(() => {
                    data.device_id = data.device_id || "ERROR: NO DEVICE ID"
                    devices_data.push(data)
                }))
                
            } catch(e) {

            }
            
        })
        await Promise.all(fetches)
        devices_data.sort((a: DeviceData, b:DeviceData) => {
            const x = a.device_id.toLowerCase();
            const y = b.device_id.toLowerCase();
            return x < y ? -1 : x > y ? 1 : 0;
        })
        setDevicesData(devices_data)
    }

    useEffect(() => {
        function requestDevicePacket()
        {
            console.log("Requesting", selectedDeviceData)
            if (selectedDeviceData == null) {return;}
            fetch(selectedDeviceData.active_url+"/device_packet").then(async response => {
                const json = await response.json()
                console.log(json)
                setDevicePacket(json as DevicePacket)
            }).catch(e => {
                console.log("Failed to get device packet", e)
            })
        }
        if (!selectedDeviceData || !selectedDeviceData.is_active)
        {
            setDevicePacket(undefined)
            return;
        } else {
            requestDevicePacket()
            const interval = setInterval(requestDevicePacket, 5000)
            return () => {
                clearInterval(interval);
            };
        }
        
    }, [selectedDeviceData])

    useEffect(() => {
        refresh_devices_list()

        
    }, [])

    useEffect(() => {
        if (selectedDevice !== null)
        {
            setSelectedDeviceData(getDeviceData(selectedDevice))
        } else {
            setSelectedDeviceData(null)
        }
        
    }, [selectedDevice])

    return <Grid2 container spacing={2} sx={{margin: 2}}>
        <DevicesPanel 
            selectedDevice={selectedDevice} 
            setSelectedDevice={setSelectedDevice} 
            devicesData={devicesData}
            refresh_devices_list={refresh_devices_list}
        />
        <DeviceDataPanel selectedDevice={selectedDevice} selectedDeviceData={selectedDeviceData}/>
        <PropertyEdit 
            post_to_device={post_to_device} 
            selectedDevice={selectedDevice} 
            devicePacket={devicePacket} 
            selectedDeviceData={selectedDeviceData}
        />
        <DeviceActionsPanel post_to_device={post_to_device} selectedDeviceData={selectedDeviceData}/>
        <SensorPanel devicePacket={devicePacket}/>
        <ExperimentDisplayPanel/>
    </Grid2>
}

export default Prototype7