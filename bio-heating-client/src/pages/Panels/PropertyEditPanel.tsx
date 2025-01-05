import { useEffect, useState } from "react"
import { DeviceData, DevicePacket } from "../../../../shared/src/interfaces"
import { Button, Card, CardContent, List, ListItem, Paper, TextField, Typography } from "@mui/material"

const properties: {[property: string]: string} = {
    "EMAIL": "Email Sender",
    "EMAIL_TARGET": "Email Target"
}

function PropertyEditPanel({selectedDevice, post_to_device, devicePacket, selectedDeviceData}: 
    {
        selectedDevice: string|null, 
        post_to_device: (...any: any) => void, 
        devicePacket: DevicePacket|undefined, 
        selectedDeviceData: DeviceData|null
    })
{
    const [newDevice, setNewDevice] = useState(true)
    const [deviceProperties, setDeviceProperties] = useState<{[key: string]: string}>({})

    const offline = selectedDeviceData == null || !selectedDeviceData.is_active
    const cardSX ={height: "100%", opacity: offline ? 0.5 : 1,pointerEvents:offline ? "none" : "auto"}

    useEffect(() => {
        setNewDevice(true)
    }, [selectedDevice])

    useEffect(() => {
        if (!newDevice || !devicePacket) { return }
        const newProps: {[key: string]: string} = {}
        Object.keys(properties).map(property => {
            newProps[property] = devicePacket.env[property]
        })
        setDeviceProperties(newProps)
        setNewDevice(false)
    }, [devicePacket, newDevice])


    return <Card variant="outlined" sx={cardSX}><Paper>
        <CardContent>
            <Typography variant="h5" component="div">
                Device Properties
            </Typography>
            <List>
                {Object.keys(properties).map(property => {
                    return <ListItem key={property}><Paper sx={{padding: 1, display: "flex"}} elevation={4} >
                        <TextField 
                        id={`device_property_input_${property}`} 
                        label={properties[property]} 
                        variant="outlined" 
                        size="small"
                        value={deviceProperties[property] || ""}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            const newProps = JSON.parse(JSON.stringify(deviceProperties))
                            newProps[property] = event.target.value
                            setDeviceProperties(newProps)
                        }}
                        defaultValue={devicePacket?.env[property]}
                        helperText={""}
                        />
                        <Button variant="outlined" size="small" sx={{marginLeft: 1}} onClick={() => {
                            const input = document.getElementById(`device_property_input_${property}`) as HTMLInputElement
                            post_to_device({action: "change_env_property", property: property, value: input.value})
                        }}>Update</Button>
                    </Paper>
                        
                    
                    </ListItem>
                })}
                
            </List>
        </CardContent></Paper>
    </Card>
}

export default PropertyEditPanel