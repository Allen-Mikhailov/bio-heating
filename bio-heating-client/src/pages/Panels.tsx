import { collection, Timestamp, where } from "firebase/firestore"
import { useState, useEffect } from "react"
import { LineChart } from "@mui/x-charts"
import { 
    Button,
    Card, 
    CardActionArea, 
    CardContent, 
    Chip, 
    Dialog, 
    DialogTitle, 
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
import { DeviceData, DevicePacket, ExperimentData, ExperimentMap, SensorConfig } from "../interfaces";

import { db } from "../modules/firebase"
import { query, getDocs } from "firebase/firestore"

import { convert_data, generate_csv } from "../modules/data_helpers"
import DevicesPanel from "./Panels/DevicesPanel";
import PropertyEditPanel from "./Panels/PropertyEditPanel";
import DeviceActionsPanel from "./Panels/DeviceActionsPanel";
import DeviceDataPanel from "./Panels/DeviceDataPanel";
import SensorPanel from "./Panels/SensorPanel";
import LegacyExperimentDisplayPanel from "./Panels/LegacyExperimentDisplayPanel.js";
import ExperimentPanel from "./Panels/ExperimentPanel";
import PanelsPanel from "./Panels/PanelsPanel";

import dayjs from "dayjs"

function Panels()
{
    const [devicesData, setDevicesData] = useState<DeviceData[]>([])
    const [selectedDevice, setSelectedDevice] = useState<string|null>(null)
    const [selectedDeviceData, setSelectedDeviceData] = useState<DeviceData|null>(null)
    const [devicePacket, setDevicePacket] = useState<DevicePacket>()
    const [experiments, setExperiments] = useState<ExperimentMap>({})

    const [activePanels, setActivePanels] = useState<Record<string, boolean>>({
        "Devices": true,
        "Device Data": true,
        "Device Properties": true,
        "Device Sensors": false,
        "Device Actions": true,
        "Legacy Experiment Display": true,
        "Experiment Display": true,
        "Experiment Controls": true,
    })

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

    function getAllExperiments()
    {
        const experimentQuery = query(collection(db, "experiments"))
        getDocs(experimentQuery).then((snapshot) => {
            const experimentMap: ExperimentMap = {}
            snapshot.docs.map((document) => {
                experimentMap[document.id] = document.data() as ExperimentData;
            })
            setExperiments(experimentMap);
        })
        
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
                    console.log( data.device_id, data)
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
            console.log("Requesting")
            if (selectedDeviceData == null) {return;}
            fetch(selectedDeviceData.active_url+"/device_packet").then(async response => {
                const json = await response.json()
                console.log("Recieved Device Packet", json)
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
        getAllExperiments()
        refresh_devices_list()

        
    }, [])

    useEffect(() => {
        if (selectedDevice !== null)
        {
            setSelectedDeviceData(getDeviceData(selectedDevice))
        } else {
            setSelectedDeviceData(null)
        }
        
    }, [selectedDevice, devicesData])

    return <Grid2 container spacing={2} sx={{margin: 2}}>
        <PanelsPanel 
            activePanels={activePanels} 
            setActivePanels={setActivePanels}
        />

        {activePanels["Devices"] && <DevicesPanel 
            selectedDevice={selectedDevice} 
            setSelectedDevice={setSelectedDevice} 
            devicesData={devicesData}
            refresh_devices_list={refresh_devices_list}
        />}

        {activePanels["Device Data"] && <DeviceDataPanel 
            selectedDevice={selectedDevice} 
            selectedDeviceData={selectedDeviceData}
        />}

        {activePanels["Device Properties"] && <PropertyEditPanel 
            post_to_device={post_to_device} 
            selectedDevice={selectedDevice} 
            devicePacket={devicePacket} 
            selectedDeviceData={selectedDeviceData}
        />}

        {activePanels["Device Actions"] && <DeviceActionsPanel 
            post_to_device={post_to_device} 
            selectedDeviceData={selectedDeviceData}
        />}

        {activePanels["Device Sensors"] && <SensorPanel 
            devicePacket={devicePacket} 
            post_to_device={post_to_device}
        />}

        {activePanels["Legacy Experiment Display"] && <LegacyExperimentDisplayPanel/>}

        {activePanels["Experiment Controls"] && <ExperimentPanel 
            post_to_device={post_to_device} 
            selectedDeviceData={selectedDeviceData}
            experiments={experiments}
        />}
    </Grid2>
}

export default Panels