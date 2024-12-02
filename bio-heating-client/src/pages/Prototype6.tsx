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

function Prototype6()
{
    const [deviceData, setDeviceData] = useState<DeviceData[]>([])
    async function refresh_devices_list()
    {
        const myCollection = collection(db, "devices");

        // Fetch all documents
        const querySnapshot = await getDocs(myCollection);

        // Extract document data
        const device_data: DeviceData[] = []
        querySnapshot.docs.map(async (doc) => {
            const data = doc.data() as DeviceData
            fetch(data.active_url)
            .then((response) => {
                if (response.status === 200) {
                    data.is_active = true
                } else {
                    data.is_active = false
                }
            })
            .catch((error) => {
                data.is_active = false
                console.log('network error: ' + error);
            }).finally(() => {
                device_data.push(data)
            })
            
        })
        console.log("Done pinging", device_data);
        setDeviceData(device_data)
    }

    useEffect(() => {
        refresh_devices_list()
    }, [])

    
    return <div style={{display: "flex"}}>
        <div id="devices-list">

        </div>
    </div>
}

export default Prototype6