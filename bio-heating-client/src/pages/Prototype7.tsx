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
    TextField, 
    Typography 
} from "@mui/material"


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
    env: {[key: string]: string}
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

function PropertyEdit({selectedDevice, post_to_device, devicePacket}: 
    {selectedDevice: string|null, post_to_device: (...any: any) => void, devicePacket: DevicePacket|undefined})
{
    const [newDevice, setNewDevice] = useState(true)


    return <Card variant="outlined" sx={{height: "100%"}}><Paper>
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
function DeviceActionsPanel({post_to_device}: {post_to_device: (...any: any) => void})
{
    const [experimentType, setExperimentType] = useState<string>("simulation")
    const start_experiment = () => { post_to_device({action: "start_experiment", new_experiment_type: experimentType}) }
    const stop_experiment =  () => { post_to_device({action: "stop_experiment"}) }
    const service_update =   () => { post_to_device({action: "service_update"}) }
    const service_restart =  () => { post_to_device({action: "service_restart"}) }
    const server_restart =   () => { post_to_device({action: "server_restart"}) } 
    const server_shutdown =  () => { post_to_device({action: "server_shutdown"}) }  

    const buttonSX = {width: "100%", marginTop: 1}

    return <Card variant="outlined" sx={{width: 300, height: "100%"}}><Paper>
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
                id="outlined-select-currency-native"
                select
                size="small"
                sx={{width: "100%"}}
                label="Experiment"
                defaultValue="EUR"
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
    </Card>
}

function DeviceDataPanel({selectedDeviceData, selectedDevice}: {selectedDeviceData: DeviceData|null, selectedDevice: string|null})
{
    const offline = selectedDeviceData == null || !selectedDeviceData.is_active
    return <Card variant="outlined" sx={{height: "100%", opacity: offline ? 0.5 : 1,pointerEvents:offline ? "none" : "auto"}}>
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
            setSensorName("NO_CONFIG")
        }
    }, [sensor_id, devicePacket])

    return <Card sx={{marginTop: 1}} variant="outlined" key={sensor_id}>
        <Paper elevation={4}>
            <CardContent>
                <Typography>{sensor_id}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 14, marginTop: -.25 }}>
                    {sensorName}
                </Typography>{}
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

function Prototype7()
{
    const [devicesData, setDevicesData] = useState<DeviceData[]>([])
    const [selectedDevice, setSelectedDevice] = useState<string|null>(null)
    const [selectedDeviceData, setSelectedDeviceData] = useState<DeviceData|null>(null)
    const [devicePacket, setDevicePacket] = useState<DevicePacket>()


    const [requestTick, setRequestTick] = useState<number>(0)

    function getDeviceData(device_id: string): DeviceData|null
    {
        for (let i = 0; i < devicesData.length; i++)
        {
            if (devicesData[i].device_id == device_id)
                return devicesData[i]
        }
        return null
    }

    function post_to_device(data: any)
    {
        if (selectedDevice == null) {return;}
        const device_data = getDeviceData(selectedDevice)
        if (device_data == null) {return;}
        fetch(device_data.active_url, {
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
        <PropertyEdit post_to_device={post_to_device} selectedDevice={selectedDevice} devicePacket={devicePacket}/>
        <DeviceActionsPanel post_to_device={post_to_device}/>
        <SensorPanel devicePacket={devicePacket}/>
    </Grid2>
}

export default Prototype7