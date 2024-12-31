import { Button, Card, CardActionArea, CardContent, Chip, Paper, Typography } from "@mui/material"
import { DeviceData } from "../../interfaces"

function DevicesPanel({devicesData, selectedDevice, setSelectedDevice, refresh_devices_list}: 
    {
        devicesData: DeviceData[], selectedDevice: string|null, 
        setSelectedDevice: (n: string|null) => void, 
        refresh_devices_list: () => void
    })
{
    return <Card variant="outlined" sx={{height: "100%"}}>
        <Paper><CardContent>
            <Typography variant="h5" component="div">
                Devices
            </Typography>
            <Button onClick={refresh_devices_list} variant="outlined" sx={{marginTop: 1}}>Refresh</Button>
            {devicesData.map((data) => {
                return <Card sx={{marginTop: 1, borderColor: selectedDevice===data.device_id?"#fb8c00":null}} 
                variant="outlined" key={data.device_id}>
                    <CardActionArea onClick={() => {setSelectedDevice(selectedDevice===data.device_id?null:data.device_id)}}>
                    <Paper elevation={4}>
                        <CardContent>
                            <Typography  sx={{ color: 'text.secondary', fontSize: 14 }}>
                                Device ID:
                            </Typography>
                            <Typography gutterBottom>
                                {data.device_id} 
                            </Typography>

                            {data.is_active && <Chip variant="outlined" label="Online" color="success"/>}
                            {!data.is_active && <Chip variant="outlined" label="Offline" color="error"/>}
                            
                        </CardContent>
                    </Paper>
                    </CardActionArea>
                </Card>
            })}
        </CardContent></Paper>
    </Card>
}

export default DevicesPanel