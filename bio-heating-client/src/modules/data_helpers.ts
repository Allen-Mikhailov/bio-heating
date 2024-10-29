import { Timestamp } from "firebase/firestore";

function convert_data(data: [number[], number[], Timestamp[]][]): [number, number, Timestamp][]
{
    const values: [number, number, Timestamp][] = [];

    data.map(([packet_values1, packet_values2, packet_timestamps]) => {
        for (let i = 0; i < packet_values1.length; i++)
        {
            values.push([packet_values1[i], packet_values2[i], packet_timestamps[i]])
        }
    })

    values.sort((a, b) => {
        return a[2].toMillis()-b[2].toMillis()
    })

    return values
}

export { convert_data }