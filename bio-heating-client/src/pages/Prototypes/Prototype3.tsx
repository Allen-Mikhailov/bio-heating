import { Timestamp } from "firebase/firestore"
import { useState, useEffect } from "react"
import { LineChart } from "@mui/x-charts"

import { generate_random_temp_example } from "../../modules/examples"

import { convert_data } from "../../modules/data_helpers"

function Prototype3()
{
    const [packets, setPackets] = useState<[number[], number[], Timestamp[]][]>()
    const [thread, setThread] = useState<[number, number, Timestamp][]>()
    const [axisData, setAxisData] = useState<number[]>([])
    const [controlData, setControlData] = useState<number[]>([])
    const [experimentalData, setExperimentalData] = useState<number[]>([])

    useEffect(() => {
        const new_packets = generate_random_temp_example()
        setPackets(new_packets)

        const new_thread = convert_data(new_packets)
        setThread(new_thread)

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
    }, [])

    return <div>
        <h1>Prototype 3</h1>
        <h2>Displaying generated data</h2>
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

export default Prototype3