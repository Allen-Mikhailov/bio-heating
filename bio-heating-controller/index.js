import { config } from 'dotenv';
config()

import { Timestamp } from 'firebase/firestore';
import { readFileSync, readdirSync } from 'fs';
import { db } from './firebase.js';
import { addDoc, collection, setDoc } from 'firebase/firestore';
import sgMail from '@sendgrid/mail'
import http from "http"
import TempSensor from './temp_sensor.js';
import { forward as ngfoward } from "@ngrok/ngrok";
import GPIO from 'rpi-gpio';

const CONTROL_DEVICE = "28-3cf104575517"
const EXPERIMENTAL_DEVICE = "28-3cd8f64961fe"

const CONTROL_CALLIBRATION = 2.5
const EXPERIMENTAL_CALLIBRATION = 3

const EXPERIMENT_NAME = process.env.EXPERIMENT_NAME
const READ_INTERVAL = 3 * 1000
const PACKET_LENGTH = 10

const SERVER_PORT = 8080

const EMAIL = "bioheating.rice@gmail.com"
const EMAIL_TARGET = "slinkyshelf8@gmail.com"

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const experiment_doc = new doc(db, "experiments", process.env.EXPERIMENT_NAME)

let packet
let packet_additions = 0
let total_packets_sent = 0

let heating_override = false

function send_email(subject, text)
{
    const msg = {
        to: EMAIL_TARGET, // Change to your recipient
        from: EMAIL, // Change to your verified sender
        subject: subject,
        text: text,
        html: text,
      }
      sgMail
        .send(msg)
        .then(() => {
          console.log('Email of subject %s sent', subject)
        })
        .catch((error) => {
          console.error(error)
        })
}

function InitializeFailState()
{
    // Makes sure nothing goes terribly wrong
}

function server_handler(req, res)
{
    res.writeHead(200, { 'Content-Type': 'text/html' });
	res.end('Congrats you have created an ngrok web server');
}

function server_success()
{
    console.log('Node.js web server at %s is running...', SERVER_PORT)
}

async function ngrok_setup()
{
    // Establish connectivity
    const listener = await forward({ addr: SERVER_PORT, authtoken_from_env: true });

    // Push url onto database
    const experiment_data = {
        active_url: listener.url(),
        is_active: true,
        server_start: Timestamp.now()
    }
    setDoc(experiment_doc, experiment_data)

    console.log("Ngrok started at %s at port %s", listener.url(), SERVER_PORT)
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
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

function HandleTempDif(dif)
{

}

// Setting up control server
http.createServer(server_handler).listen(SERVER_PORT, server_success);

// Setting up ngrok 
ngrok_setup();

// Creating 
const control_sensor = new TempSensor("control", CONTROL_DEVICE, CONTROL_CALLIBRATION)
const experimental_sensor = new TempSensor("experimental", EXPERIMENTAL_DEVICE, EXPERIMENTAL_CALLIBRATION)

control_sensor.start()
experimental_sensor.start()

packet = generate_new_packet()

send_email("Experiment Online", `The Experiment "${EXPERIMENT_NAME}" is online and running smoothly`)

// Reading Loop
while (true)
{
    // Reading Sensors
    const control_temp = control_sensor.read()
    const experimental_temp = experimental_sensor.read()
    
    if (control_temp == -1 || experimental_temp == -1)
    {   
        // Errored read
    } else {
        // Successful read
        const dif = experimental_temp - control_temp

        HandleTempDif(dif)

        // Logging
        console.log("Control %s C, Expirment %s C, dif %s", 
            control_temp, 
            experimental_temp, 
            dif
        )
    }

    

    // Writing to packet
    packet.control_temp.push(control_temp)
    packet.experimental_temp.push(experimental_temp)
    packet.temperature_timestamps.push(Timestamp.now())

    packet_additions++;

    // Sending Data to server
    if (packet_additions >= PACKET_LENGTH)
    {
        packet.upload_timestamp = Timestamp.now()
        addDoc(collection(db, "experiment_data"), packet)
        packet = generate_new_packet()

        packet_additions = 0

        total_packets_sent++;
        console.log("Sent packet #%s to server", total_packets_sent)
        
    }


    await sleep(READ_INTERVAL)
}