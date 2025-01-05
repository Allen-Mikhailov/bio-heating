import { Box, Button, Card, CardContent, Divider, Grid2, Paper, Snackbar, Tab, Tabs, TextField, Typography } from "@mui/material"
import { useEffect, useState } from "react"
import { DeviceData, ExperimentMap } from "../../../../shared/src/interfaces"

const experiment_types = ["simulation"]

function ExperimentPanel({post_to_device, selectedDeviceData, experiments}: 
    {post_to_device: (...any: any) => Promise<void>, selectedDeviceData: DeviceData|null, experiments: ExperimentMap})
{
    const [snackOpen, setSnackOpen] = useState(false)
    const [snackMessage, setSnackMessage] = useState("")
    const [tab, setTab] = useState(0)
    const [defaultExperimentId, setDefaultExperimentId] = useState("")
    const [experimentId, setExperimentId] = useState("")
    const [experimentType, setExperimentType] = useState(experiment_types[0])

    useEffect(() => {
        setDefaultExperimentId("NewExperiment"+Math.floor(Math.random()*100))
    }, [])

    function open_snack(snack: string)
    {
        setSnackOpen(true)
        setSnackMessage(snack)
    }

    async function device_post(post: any, snack: string)
    {
        await post_to_device(post)
        open_snack(snack)
    }

    const buttonSX = {width: "100%", marginTop: 1}
    const offline = selectedDeviceData == null || !selectedDeviceData.is_active
    const cardSX ={height: "100%", opacity: offline ? 0.5 : 1,pointerEvents:offline ? "none" : "auto"}

    function startExperiment()
    {
        if (experimentId == "")
            return open_snack("The experiment id cannot be empty")
        else if (experiments[experimentId] != null)
            return open_snack(`The experiment id "${experimentId}" is already in use. Maybe try to resume the experiment`) 


        device_post({
            "action": "start_experiment", 
            "new_experiment_type": experimentType, 
            "experiment_id": experimentId
        }, `Started Experiment "${experimentId}"`)
    }

    return <><Card variant="outlined" sx={cardSX}><Paper>
        <CardContent>
            <Typography variant="h5" component="div">
                Experiment
            </Typography>
            <Tabs value={tab} onChange={(e, i) => setTab(i)} aria-label="basic tabs example">
                <Tab label="New Experiment"/>
                <Tab label="Resume Experiment"/>
            </Tabs>

            {/* New Experiment */}
            {tab == 0 && <Box sx={{marginTop: 1.5}}>
            <TextField
                    size="small"
                    sx={{width: "100%"}}
                    label="Experiment Id"
                    value={experimentId}
                    required
                    onChange={(e) => setExperimentId(e.currentTarget.value)}
                />
            <Grid2 container spacing={2} sx={{width: "100%", marginTop: 2}}>
                
                <Grid2 size={6}>
                    <TextField
                        id="experiment-picker"
                        select
                        size="small"
                        sx={{width: "100%"}}
                        label="Experiment Type"
                        defaultValue="simulation"
                        slotProps={{
                            select: {
                            native: true,
                            },
                        }}>
                            {experiment_types.map((option) => (
                                <option key={option} value={option}>
                                {option}
                                </option>
                            ))}
                        </TextField>
                    </Grid2>
                <Grid2 size={6}>
                    <Button variant="outlined" sx={{width: "100%"}} onClick={startExperiment}>START</Button>
                </Grid2>
            </Grid2>
            </Box>}

            {/* Resume Experiment */}
            {tab == 1 && <>
                
            </>}
        </CardContent>
    </Paper></Card>
    <Snackbar
        open={snackOpen}
        autoHideDuration={6000}
        onClose={() => setSnackOpen(false)}
        message={snackMessage}
    />
    </>
}

export default ExperimentPanel