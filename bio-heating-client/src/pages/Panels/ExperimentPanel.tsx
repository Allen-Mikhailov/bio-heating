import { Button, Card, CardContent, Divider, Grid2, Paper, Snackbar, Tab, Tabs, TextField, Typography } from "@mui/material"
import { useState } from "react"
import { DeviceData, ExperimentMap } from "../../interfaces"

const experiment_types = ["simulation"]

function ExperimentPanel({post_to_device, selectedDeviceData, experiments}: 
    {post_to_device: (...any: any) => Promise<void>, selectedDeviceData: DeviceData|null, experiments: ExperimentMap})
{
    const [snackOpen, setSnackOpen] = useState(false)
    const [snackMessage, setSnackMessage] = useState("")
    const [tab, setTab] = useState(0)

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
            {tab == 0 && <>
                
            </>}

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