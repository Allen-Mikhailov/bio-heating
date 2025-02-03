import { useEffect, useState } from "react"
import { convert_data, generate_csv } from "../../modules/data_helpers"
import { collection, doc, getDocs, query, Timestamp, where } from "firebase/firestore"
import { db } from "../../modules/firebase"
import { Button, Card, CardContent, FormControl, MenuItem, Paper, Select, TextField, Typography } from "@mui/material"
import { axisClasses, LineChart } from "@mui/x-charts"
import { ExperimentMap } from "../../../../shared/src/interfaces"

function ExperimentDisplayPanel({experiments, sx}: {experiments: ExperimentMap, sx: any})
{
    const [experimentId, setExperimentId] = useState("")
    const [thread, setThread] = useState<[number, number, Timestamp][]>([])

    const [axisData, setAxisData] = useState<Date[]>([])
    const [controlData, setControlData] = useState<(number|null)[]>([])
    const [experimentalData, setExperimentalData] = useState<(number|null)[]>([])

    useEffect(() => {
        if (experimentId == "" && Object.keys(experiments).length > 0)
            setExperimentId(Object.keys(experiments)[0])
    }, [experiments])

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
        const q: any = query(collection(db, "experiments", experimentId, "packets"))
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
            console.log("Doc",data)
            packets.push([data.control_temp, data.experimental_temp, data.temperature_timestamps])
        })
        
        console.log(packets)
        const new_thread = convert_data(packets)

        setThread(new_thread)

        // const start_time = new_thread[0][2].toMillis()/1000

        const data_points = Math.min(new_thread.length, 50)

        let new_control: (number|null)[] = []
        let new_experimental: (number|null)[] = []
        let new_axis: Date[] = []

        

        for (let i = 0; i < data_points; i++)
        {
            const j = Math.floor(i/data_points * new_thread.length)
            
            // Replace Nan with null
            new_control.push(      isNaN(new_thread[j][0]) ? null : new_thread[j][0] )
            new_experimental.push( isNaN(new_thread[j][1]) ? null : new_thread[j][1] )
            
            new_axis.push( (new_thread[j][2].toDate()))
        }

        console.log(new_thread)

        setAxisData(new_axis)
        setControlData(new_control)
        setExperimentalData(new_experimental)

        return new_thread
    }

    return <Card variant="outlined" sx={{height: "100%", ...sx}}>
        <Paper>
            <CardContent>
                <Typography variant="h5">
                    Experiment Data
                </Typography>
                <div style={{display: "flex", alignItems: "center"}}>
                <Paper elevation={4} sx={{padding: 1, marginTop: 1}}>
                    <FormControl>
                    <TextField id={`experiment_display_panel_input`} 
                        select
                        label="Experiment Id" 
                        variant="outlined" 
                        size="small"
                        value={experimentId}
                        onChange={(event) => {
                            setExperimentId(event.target.value)
                        }}
                        >
                            {Object.keys(experiments).map((option) => (
                                <MenuItem key={option} value={option}>
                                {option}
                                </MenuItem>
                            ))}
                        </TextField>
                        </FormControl>
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

export default ExperimentDisplayPanel