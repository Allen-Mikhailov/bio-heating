import { collection, Timestamp, where } from "firebase/firestore"
import { useState, useEffect } from "react"
import { LineChart } from "@mui/x-charts"
import {
    Grid2, 
} from "@mui/material"
import { DeviceData, DevicePacket, ExperimentData, ExperimentMap, SensorConfig } from "../../../shared/src/interfaces.js";

import { db } from "../modules/firebase"
import { query, getDocs } from "firebase/firestore"

import DevicesPanel from "./Panels/DevicesPanel";
import PropertyEditPanel from "./Panels/PropertyEditPanel";
import DeviceActionsPanel from "./Panels/DeviceActionsPanel";
import DeviceDataPanel from "./Panels/DeviceDataPanel";
import SensorPanel from "./Panels/SensorPanel";
import ExperimentDisplayPanel from "./Panels/ExperimentDisplayPanel.js";
import LegacyExperimentDisplayPanel from "./Panels/LegacyExperimentDisplayPanel.js";
import ExperimentPanel from "./Panels/ExperimentPanel";
import PanelsPanel from "./Panels/PanelsPanel";

import dayjs from "dayjs"

const defaultPanelStates = {
    "Devices": true,
    "Device Data": true,
    "Device Properties": true,
    "Device Sensors": false,
    "Device Actions": true,
    "Legacy Experiment Display": false,
    "Experiment Display": true,
    "Experiment Controls": true,
}

const defaultPanelOrder = Object.keys(defaultPanelStates)

function Panels()
{
    const [devicesData, setDevicesData] = useState<DeviceData[]>([])
    const [selectedDevice, setSelectedDevice] = useState<string|null>(null)
    const [selectedDeviceData, setSelectedDeviceData] = useState<DeviceData|null>(null)
    const [devicePacket, setDevicePacket] = useState<DevicePacket>()
    const [experiments, setExperiments] = useState<ExperimentMap>({})

    const [activePanels, setActivePanels] = useState<Record<string, boolean>>(defaultPanelStates)
    const [panelOrder, setPanelOrder] = useState(defaultPanelOrder)

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
            
        })
        await Promise.all(fetches)
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
            order={panelOrder}
            setOrder={setPanelOrder}
            activePanels={activePanels} 
            setActivePanels={setActivePanels}
        />

        {activePanels["Devices"] && <DevicesPanel 
            sx={{order: panelOrder.indexOf("Devices")}}
            selectedDevice={selectedDevice} 
            setSelectedDevice={setSelectedDevice} 
            devicesData={devicesData}
            refresh_devices_list={refresh_devices_list}
        />}

        {activePanels["Device Data"] && <DeviceDataPanel 
            sx={{order: panelOrder.indexOf("Device Data")}}
            selectedDevice={selectedDevice} 
            selectedDeviceData={selectedDeviceData}
        />}

        {activePanels["Device Properties"] && <PropertyEditPanel 
            sx={{order: panelOrder.indexOf("Device Properties")}}
            post_to_device={post_to_device} 
            selectedDevice={selectedDevice} 
            devicePacket={devicePacket} 
            selectedDeviceData={selectedDeviceData}
        />}

        {activePanels["Device Actions"] && <DeviceActionsPanel 
            sx={{order: panelOrder.indexOf("Device Actions")}}
            post_to_device={post_to_device} 
            selectedDeviceData={selectedDeviceData}
        />}

        {activePanels["Device Sensors"] && <SensorPanel 
            sx={{order: panelOrder.indexOf("Device Sensors")}}
            devicePacket={devicePacket} 
            post_to_device={post_to_device}
        />}

        {activePanels["Experiment Display"] && <ExperimentDisplayPanel
            experiments={experiments}
            sx={{order: panelOrder.indexOf("Experiment Display")}}
        />}

        {activePanels["Legacy Experiment Display"] && <LegacyExperimentDisplayPanel
            sx={{order: panelOrder.indexOf("Legacy Experiment Display")}}
        />}

        {activePanels["Experiment Controls"] && <ExperimentPanel 
            sx={{order: panelOrder.indexOf("Experiment Controls")}}
            devicePacket={devicePacket}
            post_to_device={post_to_device} 
            selectedDeviceData={selectedDeviceData}
            experiments={experiments}
        />}
    </Grid2>
}

export default Panels