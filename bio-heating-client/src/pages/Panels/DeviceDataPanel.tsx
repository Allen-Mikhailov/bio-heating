import { Card, CardContent, Divider, Paper, Typography } from "@mui/material"
import { DeviceData } from "../../../../shared/src/interfaces"

function DeviceDataPanel({selectedDeviceData, selectedDevice}: 
    {selectedDeviceData: DeviceData|null, selectedDevice: string|null})
{
    const offline = selectedDeviceData == null || !selectedDeviceData.is_active
    const cardSX ={height: "100%", opacity: offline ? 0.5 : 1,pointerEvents:offline ? "none" : "auto"}
    return <Card variant="outlined" sx={cardSX}>
        <Paper>
            <CardContent>
                <Typography gutterBottom variant="h5" component="div">
                    Connection
                </Typography>

                {/* SSH */}
                <Divider />
                <Typography sx={{ color: 'text.secondary', fontSize: 14, marginTop: 1 }}>
                    IP Address
                </Typography>
                <Typography component="div">
                    {selectedDeviceData && selectedDeviceData.ip_address}
                </Typography>

                {/* Address */}
                <Divider />
                <Typography sx={{ color: 'text.secondary', fontSize: 14, marginTop: 1 }}>
                    Ngrok URL
                </Typography>
                <Typography component="div">
                    {selectedDeviceData && selectedDeviceData.active_url}
                </Typography>

                {/* Version */}
                <Divider />
                <Typography sx={{ color: 'text.secondary', fontSize: 14, marginTop: 1 }}>
                    Version
                </Typography>
                <Typography component="div">
                    {selectedDeviceData && selectedDeviceData.version}
                </Typography>
            </CardContent>
        </Paper>
    </Card>
}

export default DeviceDataPanel