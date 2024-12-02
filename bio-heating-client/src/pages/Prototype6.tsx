import { collection, Timestamp, where } from "firebase/firestore"
import { useState, useEffect } from "react"
import { LineChart } from "@mui/x-charts"


import { db } from "../modules/firebase"
import { query, getDocs } from "firebase/firestore"

import { convert_data, generate_csv } from "../modules/data_helpers"

interface DeviceData {
    active_url: string,
    device_id: string,
    ip_address: string,
    last_activity: Timestamp,
    server_up_time: Timestamp,
    is_active: boolean
}

const experiment_types = ["simulation"]

function Prototype6()
{
    const [devicesData, setDevicesData] = useState<DeviceData[]>([])
    const [selectedDevice, setSelectedDevice] = useState<string|null>(null)
    const [experimentType, setExperimentType] = useState<string>(experiment_types[0])

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
        console.log(devices_data)
        setDevicesData(devices_data)
    }

    useEffect(() => {
        refresh_devices_list()
    }, [])

    function start_experiment()
    {
        post_to_device({action: "start_experiment", new_experiment_type: experimentType})
        console.log("posted")
    }

    function stop_experiment()
    {
        post_to_device({action: "stop_experiment"})
        console.log("posted")
    }
    
    return <div style={{display: "flex"}}>
        <div id="devices-list">
            <div><b>Devices:</b></div>
            {devicesData.map((data) => {
                return <div 
                    key={data.device_id} 
                    style={{background: data.is_active?"green":"red", color: data.device_id==selectedDevice?"yellow":"black"}} 
                    onClick={() => {setSelectedDevice(data.device_id)}}>    
                    {data.device_id}
                </div>
            })}
        </div>
        {selectedDevice!=null&&<>
        <div id="device-sensors">
            <div><b>Sensors:</b></div>
        </div>
        <div id="device-experiments">
            <div><b>Experiments:</b></div>
            <div>Experiment Type</div>
            <select>
                {experiment_types.map(_type => {
                    return <option key={_type} value={_type}>{_type}</option>
                })}
            </select>
        </div>
        <div id="device-controls">
            <div><b>Controls:</b></div>
            <button onClick={start_experiment}>Start Experiment</button><div/>
            <button onClick={stop_experiment}>Stop Experiment</button>
        </div>
        <div id="device-data">

        </div>
        </>}
    </div>
}

export default Prototype6