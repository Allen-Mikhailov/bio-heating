import { collection, Timestamp, where } from "firebase/firestore"
import { useState, useEffect } from "react"
import { LineChart } from "@mui/x-charts"


import { db } from "../modules/firebase"
import { query, getDocs } from "firebase/firestore"

import { convert_data, generate_csv } from "../modules/data_helpers"
import dayjs from "dayjs"

interface DeviceData {
    active_url: string,
    device_id: string,
    ip_address: string,
    last_activity: Timestamp,
    server_up_time: Timestamp,
    is_active: boolean
}

const experiment_types = ["simulation"]
const properties = [
    "EXPERIMENT_NAME",
    "EMAIL",
    "EMAIL_TARGET",
]

function Prototype6()
{
    const [devicesData, setDevicesData] = useState<DeviceData[]>([])
    const [selectedDevice, setSelectedDevice] = useState<string|null>(null)
    const [selectedDeviceData, setSelectedDeviceData] = useState<DeviceData|null>(null)
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

    useEffect(() => {
        if (selectedDevice !== null)
        {
            setSelectedDeviceData(getDeviceData(selectedDevice))
        } else {
            setSelectedDeviceData(null)
        }
        
    }, [selectedDevice])

    function start_experiment()
    {
        post_to_device({action: "start_experiment", new_experiment_type: experimentType})
    }

    function stop_experiment()
    {
        post_to_device({action: "stop_experiment"})
    }

    function update_device()
    {
        post_to_device({action: "service_update"})
    }

    function service_restart()
    {
        post_to_device({action: "service_restart"})
    }

    function server_restart()
    {
        post_to_device({action: "server_restart"})
    } 

    function server_shutdown()
    {
        post_to_device({action: "server_shutdown"})
    }  
    
    return <div style={{display: "flex"}}>
        <div id="devices-list">
            <div><b>Devices:</b></div>
            <button onClick={refresh_devices_list}>Refresh</button>
            {devicesData.map((data) => {
                return <div 
                    key={data.device_id} 
                    style={{background: data.is_active?"green":"red", color: data.device_id==selectedDevice?"yellow":"black"}} 
                    onClick={() => {setSelectedDevice(selectedDevice===data.device_id?null:data.device_id)}}>    
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
            <button onClick={stop_experiment}>Stop Experiment</button><div/>
            <button onClick={service_restart}>Service Restart</button><div/>
            <button onClick={update_device}>Update Device</button><div/>
            <button onClick={server_restart}>Restart Device</button><div/>
            <button onClick={server_shutdown}>Shutdown Device</button><div/>
        </div>
        <div>
            <div><b>Device Properties</b></div>
            {selectedDevice && properties.map(property => {
                return <div key={property}>
                    <div>{property}</div>
                    <input id={`device-property-${property}`}></input>
                    <button onClick={() => {
                        const input = document.getElementById(`device-property-${property}`) as HTMLInputElement
                        if (!input) {return;}
                        post_to_device({action: "change_env_property", property: property, value: input.value})
                    }}>Apply</button>
                </div>
            })}
        </div>
        <div id="device-data">
            <div><b>Data</b></div>
            {selectedDeviceData && Object.keys(selectedDeviceData).map((key: string) => {
                return <div key={key}>
                    {key} <b>:</b> {(() => {
                        if (typeof ((selectedDeviceData as any)[key]) == typeof(Timestamp.now()))
                        {
                            const time: Timestamp = (selectedDeviceData as any)[key] as Timestamp
                            return dayjs(time.toDate()).format("LLL")
                        }
                        return (selectedDeviceData as any)[key].toString()
                    })()}
                </div>
            })}
        </div>
        </>}
    </div>
}

export default Prototype6