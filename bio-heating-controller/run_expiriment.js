import { Timestamp } from 'firebase/firestore';
import { readFileSync, readdirSync } from 'fs';
import { db } from './firebase.js';
import { addDoc, collection } from 'firebase/firestore';
import { createTransport } from 'nodemailer';
import path from "path";
import { fileURLToPath } from 'url';

// Getting File path
const devices_path = "/sys/bus/w1/devices/w1_bus_master1/"

const CONTROL_DEVICE = "28-3cf104575517"
const EXPERIMENTAL_DEVICE = "28-3cd8f64961fe"

const EXPERIMENT_NAME = "test1"
const READ_INTERVAL = 3 * 1000
const PACKET_LENGTH = 10

const EMAIL = "bioheating.rice@gmail.com"
const EMAIL_TARGET = "slinkyshelf8@gmail.com"

const password_file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), './email_password.txt')

const transporter = createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL,
        pass: readFileSync(password_file, "utf-8")
    }
});

function send_email(subject, text)
{
    transporter.sendMail({
        from: EMAIL,
        to: EMAIL_TARGET,
        subject: subject,
        text: text
    }, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    })
}

// If sensor outputs this temperature it has failed
const ERROR_TEMPERATURE = 85

// Creating 

console.log("Finding Sensors:")
const files = readdirSync(devices_path, { withFileTypes: true })
const valid_dirents = {}
files.map(dirent => {
    if (dirent.isDirectory() && dirent.name.startsWith("28"))
    {
        valid_dirents[dirent.name] = dirent
        console.log("Found Valid Sensor with ID: \"%s\"", dirent.name)
    }
})

// Checking for Control and Experimental Sensors
if (valid_dirents[CONTROL_DEVICE] == undefined)
    console.log("Found Control Sensor")
else
    console.error("Unable to find Control Sensor")

if (valid_dirents[EXPERIMENTAL_DEVICE] == undefined)
    console.log("Found Experiment Sensor")
else
    console.error("Unable to find Experiment Sensor")

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
        "experiment_id": EXPERIMENT_NAME,
        "control_temp": [],
        "experimental_temp": [],
        "temperature_timestamps": []
    }
}

let packet = generate_new_packet()
let packet_additions = 0
let total_packets_sent = 0

send_email("Experiment Online", `The Experiment "${EXPERIMENT_NAME}" is online and running smoothly`)

// Reading Loop
while (true)
{
    // Reading Sensors
    const control_temp = read_sensor(valid_dirents[CONTROL_DEVICE])
    const experimental_temp = read_sensor(valid_dirents[EXPERIMENTAL_DEVICE])

    if (control_temp == ERROR_TEMPERATURE)
        console.error("Control Sensor is erroring")

    if (experimental_temp == ERROR_TEMPERATURE)
        console.error("Experiment Sensor is erroring")

    // Logging
    console.log("Control %s C, Expirment %s C, dif %s", 
        control_temp, 
        experimental_temp, 
        experimental_temp - control_temp
    )

    // Writing to packet
    packet.control_temp.push(control_temp)
    packet.experimental_temp.push(experimental_temp)
    packet.temperature_timestamps.push(Timestamp.now())

    packet_additions++;
    total_packets_sent++;

    // Sending Data to server
    if (packet_additions >= PACKET_LENGTH)
    {
        packet.upload_timestamp = Timestamp.now()
        addDoc(collection(db, "experiment_data"), packet)
        packet = generate_new_packet()
        packet_additions = 0
        console.log("Sent packet #%s to server", total_packets_sent)
    }


    await sleep(READ_INTERVAL)
}