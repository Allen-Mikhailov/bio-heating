import { collection, Timestamp, where } from "firebase/firestore"
import { useState, useEffect } from "react"
import { LineChart } from "@mui/x-charts"

import { db } from "../modules/firebase"
import { query, getDocs } from "firebase/firestore"

import { convert_data, generate_csv } from "../modules/data_helpers"

function Prototype5()
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
        link.setAttribute("download", "my_data.csv");
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

        const data_points = 10

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

    return <div>
        
        Experiment Id<input value={experimentId} onChange={(e) => setExperimentId(e.target.value)}></input>
        <button onClick={request_data}>Get Data</button><br/>
        <button onClick={download_csv}>Download Data</button><br/>
        <LineChart
            xAxis={[{ data: axisData, scaleType: "time" }]}
            series={[
                {
                data: controlData,
                label: 'Control Tank',
                },
                {
                data: experimentalData,
                label: 'Expirimental Tank',
                },
            ]}
            width={1000}
            height={600}
            
            />
    </div>
}

export default Prototype5