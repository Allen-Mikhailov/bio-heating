import { Padding } from "@mui/icons-material";
import { Card, CardContent, Paper, Typography, Checkbox } from "@mui/material";
import { useEffect, useState } from "react";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";

const paperStyle = { marginTop: 1}
function PanelsPanel({activePanels, setActivePanels, order, setOrder}: 
    {activePanels: Record<string, boolean>, setActivePanels: (v: any) => void, 
        setOrder: (v: string[]) => void, order: string[]})
{

    const dragEnded = (param: DropResult) => {
        const { source, destination } = param;
        let _arr = [...order];
        //extracting the source item from the list
        const _item = _arr.splice(source.index, 1)[0];
        //inserting it at the destination index.
        if (!destination) {return;}
        _arr.splice(destination.index, 0, _item);
        setOrder(_arr);
    };

    useEffect(() => {
        setOrder(Object.keys(activePanels))
    }, [])

    return <Card variant="outlined" sx={{height: "100%"}}><Paper><CardContent>
        <Typography variant="h5">Panels</Typography>
        <DragDropContext onDragEnd={dragEnded}>
            <Droppable droppableId="comments-wrapper">
            {(provided, snapshot) => {
                return <div ref={provided.innerRef} {...provided.droppableProps}>
                    {order.map((panel: string, index: number) => {
                        return (
                            <Draggable
                              draggableId={`comment-${panel}`}
                              index={index}
                              key={panel}
                            >
                              {(_provided, _snapshot) => {
                                return <div {..._provided.dragHandleProps}
                                {..._provided.draggableProps}><Card sx={paperStyle} variant="outlined" key={panel} ref={_provided.innerRef} >
                                <Paper elevation={4} sx={{display: "flex", alignItems: "center", "justifyContent": "space-between", 
                                    paddingLeft: 1}}>
                                    <Typography>{panel}</Typography>
                                    <Checkbox checked={activePanels[panel]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const newPanels = JSON.parse(JSON.stringify(activePanels))
                                        newPanels[panel] = e.target.checked
                                        setActivePanels(newPanels)
                                    }}/>
                                </Paper>
                            </Card></div>
                              }}
                            </Draggable>
                          );
                    })}
                    {provided.placeholder}
                </div>
            }}
            </Droppable>
        </DragDropContext>
    </CardContent></Paper></Card>
}

export default PanelsPanel