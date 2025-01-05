import { useEffect, useState } from "react";
import { DevicePacket, SensorConfig } from "../../../../shared/src/interfaces";
import { Button, Card, CardContent, Chip, Dialog, DialogTitle, Paper, TextField, Typography } from "@mui/material";

function SensorCard({devicePacket, sensor_id, post_to_device}: 
    {devicePacket: DevicePacket|undefined, sensor_id: string, post_to_device: (data: any) => void})
{
    const [sensorName, setSensorName] = useState("")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [sensorCalibration, setSensorCalibration] = useState("")
    useEffect(() => {
        if (devicePacket == null) {return;}

        let found_config_match = false

        Object.keys(devicePacket.sensor_config || {}).map(sensor_name => {
            const sensor_config: SensorConfig = devicePacket.sensor_config[sensor_name]
            if (sensor_config.id == sensor_id)
            {
                setSensorName(sensor_name)
                found_config_match = true
            }
        })

        if (!found_config_match)
        {
            setSensorName("NO ALIAS")
            setSensorCalibration("0")
        }
    }, [sensor_id, devicePacket])

    let reading: number|undefined = devicePacket?.sensor_readings[sensorName]
    if (reading) {reading = Math.round(reading*100)/100}

    function SetCalibration()
    {
        post_to_device({
            action: "update_sensor_calibration",
            name: sensorName,
            temp: sensorCalibration
        })
    }

    return <Card sx={{marginTop: 1}} variant="outlined" key={sensor_id}>
        <Paper elevation={4}>
            <CardContent>
                <Typography>{sensor_id}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 14, marginTop: -.25 }}>
                    Alias: {sensorName}
                </Typography>
                {devicePacket && <Chip label={reading+"°C"}/>}
                <Button onClick={() => {setDialogOpen(true); setSensorCalibration(""+reading)}}>Calibrate</Button>
            </CardContent>
        </Paper>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            <DialogTitle>Calibrate: {sensor_id} ({sensorName})</DialogTitle>
            <TextField 
            sx={{padding: 1}}
            label="Temperature °C"
            size="small"
            type="number"
            value={sensorCalibration}
            onChange={(e) => setSensorCalibration(e.target.value)}
            />
            <Button onClick={SetCalibration} size="small" variant="outlined" sx={{margin: 1}}>Calibrate</Button>
        </Dialog>
    </Card>
}

function SensorPanel({devicePacket, post_to_device}: {devicePacket: DevicePacket|undefined, post_to_device: (data: any) => void})
{
    return <Card variant="outlined" sx={{height: "100%"}}>
        <Paper>
            <CardContent>
                <Typography gutterBottom variant="h5" component="div">
                    Sensors
                </Typography>
                {devicePacket && devicePacket.all_device_sensors.map((sensor_id) => {
                    return <SensorCard devicePacket={devicePacket} sensor_id={sensor_id} 
                    key={sensor_id} post_to_device={post_to_device}/>
                })}
            </CardContent>
        </Paper>
    </Card>
}

export default SensorPanel