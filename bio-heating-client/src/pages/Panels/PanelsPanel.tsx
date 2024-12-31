import { Padding } from "@mui/icons-material";
import { Card, CardContent, Paper, Typography, Checkbox } from "@mui/material";

const paperStyle = { marginTop: 1}
function PanelsPanel({activePanels, setActivePanels}: 
    {activePanels: Record<string, boolean>, setActivePanels: (v: any) => void})
{
    return <Card variant="outlined" sx={{height: "100%"}}><Paper><CardContent>
        <Typography variant="h5">Panels</Typography>
        {Object.keys(activePanels).map((panel: string) => {
            return <Card sx={paperStyle} variant="outlined" key={panel}>
                <Paper elevation={4} sx={{display: "flex", alignItems: "center", "justifyContent": "space-between", 
                    paddingLeft: 1}}>
                    <Typography>{panel}</Typography>
                    <Checkbox checked={activePanels[panel]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const newPanels = JSON.parse(JSON.stringify(activePanels))
                        newPanels[panel] = e.target.checked
                        setActivePanels(newPanels)
                    }}/>
                </Paper>
            </Card>
        })}
    </CardContent></Paper></Card>
}

export default PanelsPanel