import { Timestamp } from "firebase/firestore";
import dayjs from "dayjs";

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

function generate_csv(thread: [number, number, Timestamp][])
{
    let csv_string = `TIME,CONTROL_TEMP_C,EXPERIMENTAL_TEMP_C\n`
    for (let i = 0; i < thread.length; i++)
    {
        csv_string += `${dayjs(thread[i][2].toDate()).format("YYYY-MM-DD HH:mm:ss")},${thread[i][0]},${thread[i][1]}\n`
    }

    csv_string = csv_string.substring(0, csv_string.length-1)

    return csv_string
}

export { convert_data, generate_csv }