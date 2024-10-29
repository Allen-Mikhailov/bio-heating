import { Timestamp } from "firebase/firestore"
import { useState, useEffect } from "react"

import { generate_random_temp_example } from "../modules/examples"

import { convert_data } from "../modules/data_helpers"

function Prototype2()
{
    const [packets, setPackets] = useState<[number[], number[], Timestamp[]][]>()
    const [thread, setThread] = useState<[number, number, Timestamp][]>()
    const [displayString, setDisplayString] = useState("")

    useEffect(() => {
        const new_packets = generate_random_temp_example()
        setPackets(new_packets)

        const new_thread = convert_data(new_packets)
        setThread(new_thread)

        let new_string = ""
        new_thread.map(([number, number2, _time]) => {
            new_string += `${Math.round(number*100)/100} C ${Math.round(number2*100)/100} C    ${_time.toString()}\n`
        })
        setDisplayString(new_string)
    }, [])

    return <div>
        <h1>Prototype 2</h1>
        <h2>Displaying generated data</h2>
        <div style={{whiteSpace: "pre"}}>{displayString}</div>
    </div>
}

export default Prototype2