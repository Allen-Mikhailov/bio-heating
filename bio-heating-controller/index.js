import { config } from 'dotenv';
config({path: import.meta.dirname+"/.env"})
console.log("firebase.js", import.meta.dirname+"/.env", __dirname)

import { Timestamp } from 'firebase/firestore';
import { readFileSync, readdirSync } from 'fs';
import { db } from './firebase.js';
import { addDoc, collection, setDoc, doc } from 'firebase/firestore';
import sgMail from '@sendgrid/mail'
import http from "http"
import { TempSensor, find_sensors } from './temp_sensor.js';
import { forward as ngforward } from "@ngrok/ngrok";
import GPIO from 'rpi-gpio';
import log4js from 'log4js';

const CONTROL_DEVICE = "28-3cf104575517"
const EXPERIMENTAL_DEVICE = "28-3cf8f649bf48"

const CONTROL_CALLIBRATION = 2.5
const EXPERIMENTAL_CALLIBRATION = 3

const EXPERIMENT_NAME = process.env.EXPERIMENT_NAME
const READ_INTERVAL = 3 * 1000
const PACKET_LENGTH = 10

const HEATING_CONTROL_PIN = parseInt(process.env.HEATING_CONTROL_PIN)

const SERVER_PORT = 8080

const EMAIL = "bioheating.rice@gmail.com"
const EMAIL_TARGET = "slinkyshelf8@gmail.com"

const ERROR_EMAIL_BUFFER_TIME = 3 * 1000

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const experiment_doc = new doc(db, "experiments", process.env.EXPERIMENT_NAME)

let setup_error_occured = false

let packet
let packet_additions = 0
let total_packets_sent = 0

let error_buffer = ""

let heating_mode = "automatic"

log4js.configure({
    appenders: {
      console: { type: 'console' }, // Console appender
      file: { type: 'file', filename: 'application.log' } // File appender
    },
    categories: {
      default: { appenders: ['console', 'file'], level: 'debug' } // Use both appenders
    }
  });
const logger = log4js.getLogger()


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
            logger.info('Email of subject %s sent', subject)
        })
        .catch((error) => {
            logger.error(error)
        })
}

function critical_error_messager()
{
    if (error_buffer != "")
    {
        send_email(`Critical Error with Experiment ${EXPERIMENT_NAME}`, error_buffer)
        error_buffer = ""
        logger.info("Sent Critical Error Email")
    }
}

function critical_error(error)
{
    error_buffer += error + "<br><br>"
    logger.error(error)
}

function server_handler(req, res)
{
    res.writeHead(200, { 'Content-Type': 'text/html' });
	res.end('Congrats you have created an ngrok web server');
}

async function gpio_setup()
{
    GPIO.setup(HEATING_CONTROL_PIN, GPIO.DIR_OUT, (err) => {
        if (err != undefined)
        {
            critical_error(`GPIO error has occured ${err}`)
            setup_error_occured = true
        } else {
            logger.info("GPIO Setup Completed")
        }
    })
}

async function ngrok_setup()
{
    // Establish connectivity
    await ngforward({ addr: SERVER_PORT, authtoken_from_env: true }).then((listener) => {
        // Push url onto database
        const experiment_data = {
            active_url: listener.url(),
            is_active: true,
            server_start: Timestamp.now()
        }
        setDoc(experiment_doc, experiment_data)

        logger.info("Ngrok started at %s at port %s", listener.url(), SERVER_PORT)
    }).catch((e) => {
        setup_error_occured = true
        critical_error(`Ngrok Setup errored ${e}`)
    });
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
    // Very simple logic
    // TODO: Impliment PID

    if (heating_mode == "automatic")
    {
        if (dif > 2.5)
        {
            GPIO.write(HEATING_CONTROL_PIN, false)
        } else {
            GPIO.write(HEATING_CONTROL_PIN, true)
        }
    }
    
}

async function server_setup()
{
    http.createServer(server_handler).listen(SERVER_PORT, () =>
        logger.info('Node.js web server at %s is running...', SERVER_PORT)
    );
}

function sensor_start_failure(sensor, err)
{
    setup_error_occured = true
    critical_error(`Sensor ${sensor.name} with id ${sensor.id} failed to start with error ${err}`)
}

function sensor_read_failure(sensor, err)
{

}

async function sensor_setup()
{
    try {
        find_sensors(logger);
    } catch(e) {
        critical_error("Failed to find sensors")
    }

    control_sensor.on_start_failure = sensor_start_failure
    experimental_sensor.on_start_failure = sensor_start_failure

    control_sensor.set_on_read_failure = sensor_read_failure
    experimental_sensor.set_on_read_failure = sensor_read_failure

    control_sensor.start(logger)
    experimental_sensor.start(logger)
}

// Creating 
const control_sensor = new TempSensor("control", CONTROL_DEVICE, CONTROL_CALLIBRATION)
const experimental_sensor = new TempSensor("experimental", EXPERIMENTAL_DEVICE, EXPERIMENTAL_CALLIBRATION)

// Reading Loop
function update()
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
        logger.info("Sent packet #%s to server", total_packets_sent)
    }
}

async function main_loop()
{
    while (true)
    {
        update()
        await sleep(READ_INTERVAL)
    }
    
}

async function safe_shutdown()
{
    logger.info("Attemping Safe Shutdown of components")

    
    try {
        GPIO.write(HEATING_CONTROL_PIN, false)
        logger.info("Heating Shutdown successful")
    } catch(e) {
        critical_error(`Heating shutdown failed with error ${e}`)
    }
}

async function start_process() 
{
    setTimeout(critical_error_messager, ERROR_EMAIL_BUFFER_TIME)

    await Promise.all([
        ngrok_setup(),
        gpio_setup(),
        server_setup(),
        sensor_setup()
    ]);

    if (setup_error_occured)
    {
        logger.error("Setup error Occured : Canceling Process (View Logs)")
        safe_shutdown()
        return
    }

    packet = generate_new_packet()

    logger.info("All systems initialized")

    send_email("Experiment Online", `The Experiment "${EXPERIMENT_NAME}" is online and running smoothly`)

    await main_loop()
}

start_process() 

process.stdin.resume();