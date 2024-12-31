import { collection, Timestamp, where } from "firebase/firestore"
import { useState, useEffect } from "react"
import { LineChart } from "@mui/x-charts"

import { db } from "../../modules/firebase"
import { query, getDocs } from "firebase/firestore"

import { convert_data } from "../../modules/data_helpers"

function Prototype4()
{
    const [experimentId, setExperimentId] = useState("")
    const [axisData, setAxisData] = useState<number[]>([])
    const [controlData, setControlData] = useState<number[]>([])
    const [experimentalData, setExperimentalData] = useState<number[]>([])

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

        console.log("packets", packets)
        
        const new_thread = convert_data(packets)

        console.log("new_thread", new_thread)

        const start_time = new_thread[0][2].toMillis()/1000

        const data_points = 10

        let new_control: number[] = []
        let new_experimental: number[] = []
        let new_axis: number[] = []
        for (let i = 0; i < data_points; i++)
        {
            const j = Math.floor(i/data_points * new_thread.length)

            new_control.push(new_thread[j][0])
            new_experimental.push(new_thread[j][1])
            new_axis.push(new_thread[j][2].toMillis()/1000 - start_time)
        }

        setAxisData(new_axis)
        setControlData(new_control)
        setExperimentalData(new_experimental)
    }

    return <div>
        <h1>Prototype 4</h1>
        <h2>Displaying generated data</h2>
        Experiment Id<input value={experimentId} onChange={(e) => setExperimentId(e.target.value)}></input>
        <button onClick={request_data}>Get Data</button>
        <LineChart
            xAxis={[{ data: axisData }]}
            series={[
                {
                    data: controlData,
                    label: 'Control Tank',
                    color: "#f7a62d"
                    },
                    {
                    data: experimentalData,
                    label: 'Expirimental Tank',
                    },
            ]}
            width={500}
            height={300}
            />
    </div>
}

export default Prototype4