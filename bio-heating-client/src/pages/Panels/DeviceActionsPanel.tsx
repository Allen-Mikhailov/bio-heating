import { Button, Card, CardContent, Divider, Grid2, Paper, Snackbar, TextField, Typography } from "@mui/material"
import { useState } from "react"
import { DeviceData } from "../../interfaces"

const experiment_types = ["simulation"]

const DividerColor = "#555"
function DeviceActionsPanel({post_to_device, selectedDeviceData}: 
    {post_to_device: (...any: any) => Promise<void>, selectedDeviceData: DeviceData|null})
{
    const [snackOpen, setSnackOpen] = useState(false)
    const [snackMessage, setSnackMessage] = useState("")

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

    const [experimentType, setExperimentType] = useState<string>("simulation")
    const start_post = {action: "start_experiment", new_experiment_type: experimentType}
    const start_experiment = () => { device_post(start_post, "Started Experiment") }
    const stop_experiment =  () => { device_post({action: "stop_experiment"}, "Stopped Experiment") }
    const service_update =   () => { device_post({action: "service_update"}, "Updated Service") }
    const service_restart =  () => { device_post({action: "service_restart"}, "Restarted Service") }
    const server_restart =   () => { device_post({action: "server_restart"}, "Restarted Device") } 
    const server_shutdown =  () => { device_post({action: "server_shutdown"}, "Shutdown Device") }  

    const buttonSX = {width: "100%", marginTop: 1}
    const offline = selectedDeviceData == null || !selectedDeviceData.is_active
    const cardSX ={height: "100%", opacity: offline ? 0.5 : 1,pointerEvents:offline ? "none" : "auto"}

    return <Card variant="outlined" sx={cardSX}><Paper>
        <CardContent>
            <Typography variant="h5" component="div">
                Device Actions
            </Typography>
            <Divider variant="fullWidth" sx={{marginTop: 1, color: DividerColor}}>Experiment</Divider>
            <Grid2 container spacing={2} sx={{width: "100%", marginTop: 1}}>
            <Grid2 size={6}>
                    <Button variant="outlined"sx={{width: "100%", marginTop: .25}} onClick={start_experiment}>start</Button>
                </Grid2>
                <Grid2 size={6}>
                
                    <TextField
                id="experiment-picker"
                select
                size="small"
                sx={{width: "100%"}}
                label="Experiment"
                defaultValue="simulation"
                slotProps={{
                    select: {
                    native: true,
                    },
                }}
                >
                {experiment_types.map((option) => (
                    <option key={option} value={option}>
                    {option}
                    </option>
                ))}
                </TextField>
                </Grid2>
                
            
            </Grid2>
            <Button variant="outlined"sx={buttonSX} onClick={stop_experiment}>stop experiment</Button>
            <Divider variant="fullWidth" sx={{marginTop: 1, color: DividerColor}}>Service</Divider>
            <Button variant="outlined"sx={buttonSX} onClick={service_update}>service update</Button>
            <Button variant="outlined"sx={buttonSX} onClick={service_restart}>service restart</Button>
            <Divider variant="fullWidth" sx={{marginTop: 1, color: DividerColor}}>Device</Divider>
            <Button variant="outlined"sx={buttonSX} onClick={server_restart}>device restart</Button>
            <Button variant="outlined"sx={buttonSX} onClick={server_shutdown}>device shutdown</Button>
            
        </CardContent></Paper>
            <Snackbar
            open={snackOpen}
            autoHideDuration={6000}
            onClose={() => setSnackOpen(false)}
            message={snackMessage}
        />
    </Card>
}

export default DeviceActionsPanel