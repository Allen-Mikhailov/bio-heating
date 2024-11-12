import { Timestamp } from 'firebase/firestore';
import { readFileSync, readdirSync } from 'fs';
import { db } from './firebase.js';
import { addDoc, collection } from 'firebase/firestore';

// Getting File path
const devices_path = "/sys/bus/w1/devices/w1_bus_master1/"

const CONTROL_DEVICE = "28-3cf104575517"
const EXPIRIMENTAL_DEVICE = "28-01144d041caa"

const EXPIRIMENT_NAME = "test1"
const READ_INTERVAL = 3 * 1000
const PACKET_LENGTH = 10

const files = readdirSync(devices_path, { withFileTypes: true })
const valid_dirents = {}
files.map(dirent => {
    if (dirent.isDirectory() && dirent.name.startsWith("28"))
        valid_dirents[dirent.name] = dirent
})

console.log(valid_dirents)

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function read_sensor(dirent)
{
    const data = readFileSync(devices_path+dirent.name+"/temperature", "utf-8")
    return parseFloat(data)/1000
}

function generate_new_packet()
{
    return {
        "expiriment_id": EXPIRIMENT_NAME,
        "control_temp": [],
        "experimental_temp": [],
        "temperature_timestamps": []
    }
}

let packet = generate_new_packet()
let packet_additions = 0

while (true)
{
    // Reading Sensors
    const control_temp = read_sensor(valid_dirents[CONTROL_DEVICE])
    const expirimental_temp = read_sensor(valid_dirents[EXPIRIMENTAL_DEVICE])


    // Logging
    console.log("Control %s C, Expirment %s C, dif %s", 
        control_temp, 
        expirimental_temp, 
        expirimental_temp - control_temp
    )

    // Writing to packet
    packet.control_temp.push(control_temp)
    packet.experimental_temp.push(expirimental_temp)
    packet.temperature_timestamps.push(Timestamp.now())

    packet_additions += 1

    // Sending Data to server
    if (packet_additions >= PACKET_LENGTH)
    {
        packet.upload_timestamp = Timestamp.now()
        addDoc(collection(db, "experiment_data"), packet)
        packet = generate_new_packet()
        packet_additions = 0
    }


    await sleep(READ_INTERVAL)
}