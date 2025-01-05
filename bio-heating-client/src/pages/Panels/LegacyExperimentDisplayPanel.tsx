import { useState } from "react"
import { convert_data, generate_csv } from "../../modules/data_helpers"
import { collection, getDocs, query, Timestamp, where } from "firebase/firestore"
import { db } from "../../modules/firebase"
import { Button, Card, CardContent, Paper, TextField, Typography } from "@mui/material"
import { axisClasses, LineChart } from "@mui/x-charts"

function LegacyExperimentDisplayPanel()
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
                    Legacy Experiment Data
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

export default LegacyExperimentDisplayPanel