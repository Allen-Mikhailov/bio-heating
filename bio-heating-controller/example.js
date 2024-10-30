import { Timestamp } from "firebase/firestore";

function generate_temp_example(settings)
{
    const packets = [];

    const date_start = settings.date_start.toMillis()
    const date_end = settings.date_end.toMillis()
    const time_diff = date_end - date_start
    const time_sections = time_diff / settings.packet_count
    const reads_per_packet = Math.floor(time_sections / (settings.read_interval*1000))
    const actual_read_interval = time_sections / reads_per_packet
    const range = settings.max - settings.min

    let value1 = (settings.min + settings.max) / 2;
    let value2 = (settings.min + settings.max) / 2;

    if (time_diff <= 0)
        throw Error("start date is after end date");

    for (let i = 0; i < settings.packet_count; i++)
    {
        
        const values1 = [];
        const values2 = [];
        const timestamps = [];
        for (let j = 0; j < reads_per_packet; j++)
        {
            value1 += (Math.random()-.5) * (range / 20)
            value1 = Math.max(Math.min(value1, settings.max), settings.min)
            values1.push(value1)

            value2 += (Math.random()-.5) * (range / 20)
            value2 = Math.max(Math.min(value2, settings.max), settings.min)
            values2.push(value2)

            timestamps.push(Timestamp.fromMillis(date_start+time_sections*i+actual_read_interval*j))
        }

        packets.push([values1, values2, timestamps]);
    }

    return packets
}

const back_time = 100

function generate_random_temp_example()
{
    const settings = {
        date_start: new Timestamp(Date.now()/1000-back_time, 0),
        date_end: new Timestamp(Date.now()/1000, 0),
        packet_count: 4,
        min: 10,
        max: 50,
        read_interval: 1
    }

    return generate_temp_example(settings)
}

export { generate_random_temp_example, generate_temp_example }