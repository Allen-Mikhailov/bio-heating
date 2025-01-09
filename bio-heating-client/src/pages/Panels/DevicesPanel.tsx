import { Button, Card, CardActionArea, CardContent, Chip, Paper, Typography } from "@mui/material"
import { DeviceData } from "../../../../shared/src/interfaces"
import { useEffect, useState } from "react"

function DevicesPanel({devicesData, selectedDevice, setSelectedDevice, refresh_devices_list, sx}: 
    {
        devicesData: DeviceData[], selectedDevice: string|null, 
        setSelectedDevice: (n: string|null) => void, 
        refresh_devices_list: () => void,
        sx: any
    })
{
    const [devicesSorted, setDevicesSorted] = useState<DeviceData[]>([])

    useEffect(() => {
        const devices_data = JSON.parse(JSON.stringify(devicesData))
        devices_data.sort((a: DeviceData, b:DeviceData) => {

            if (a.is_active != b.is_active)
                return (!a.is_active)?1:-1

            const x = a.device_id.toLowerCase();
            const y = b.device_id.toLowerCase();
            return x < y ? -1 : x > y ? 1 : 0;
        })
        setDevicesSorted(devices_data)
    }, [devicesData])

    return <Card variant="outlined" sx={{height: "100%", ...sx}}>
        <Paper><CardContent>
            <Typography variant="h5" component="div">
                Devices
            </Typography>
            <Button onClick={refresh_devices_list} variant="outlined" sx={{marginTop: 1}}>Refresh</Button>
            {devicesSorted.map((data) => {
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