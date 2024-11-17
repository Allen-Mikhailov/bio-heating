import path from "path";
import { fileURLToPath } from 'url';

import { config } from 'dotenv';
config({path: path.dirname(fileURLToPath(import.meta.url))+"/.env"})

import { Timestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { addDoc, collection, setDoc, doc } from 'firebase/firestore';
import sgMail from '@sendgrid/mail'
import http from "http"
import { TempSensor, find_sensors } from './temp_sensor.js';
import { forward as ngforward } from "@ngrok/ngrok";
import rpio from "rpio";
import log4js from 'log4js';
import ToggleError from "./toggle_errors.js";
import ActionServer from "./action_server.js";

const CONTROL_DEVICE = "28-3cf104575517"
const EXPERIMENTAL_DEVICE = "28-3cf8f649bf48"

const CONTROL_CALIBRATION = parseFloat(process.env.CONTROL_CALIBRATION)
const EXPERIMENTAL_CALIBRATION = parseFloat(process.env.EXPERIMENTAL_CALIBRATION) 

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
let in_setup 

let heating_mode = "automatic"
let heating_state = "unknown"

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

const sensor_read_error = new ToggleError("sensor_read_error")
const gpio_write_error = new ToggleError("gpio_write_error")


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

const critical_error_message = `Critical Error with Experiment ${EXPERIMENT_NAME}`

function critical_error_messager()
{
    if (error_buffer != "")
    {
        send_email(critical_error_message, error_buffer)
        error_buffer = ""
        logger.info("Sent Critical Error Email")
    }
}

function critical_error(error)
{
    error_buffer += error + "<br><br>"
    logger.error(error)
}

gpio_write_error.set_on_error((name, pin, value, e) => {
    
    let error = "GPIO has failed to set a pin."
    error += " Heaing is unable to be controlled"
    error += ` Last Known state ${heating_state}`
    error += ` <span style="color: red">The raspberry pi has lost control</span>`
    error += `<br>Error Message:<br>${e}`
    send_email(critical_error_message, error)
})

gpio_write_error.on_error_always((name, pin, value, e) => {
    logger.error("GPIO Failed to write state %s on pin %s with error %s", pin, value, e)
})

async function gpio_setup()
{
    try {
        rpio.open(HEATING_CONTROL_PIN, rpio.OUTPUT);
        logger.info("GPIO Setup Completed")
    } catch(e) {
        critical_error(`GPIO error has occured ${e}`)
        setup_error_occured = true
    }
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

function SetHeatingRaw(value)
{
    rpio.write(HEATING_CONTROL_PIN, value?rpio.HIGH:rpio.LOW);
}

function SetHeating(value)
{
    try {
        SetHeatingRaw(value)
        heating_state = value?"on":"off"
    } catch(e) {
        gpio_write_error.refresh_error()
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
            SetHeating(false)
        } else {
            SetHeating(true)
        }
    }
    
}

const action_server = new ActionServer(logger, SERVER_PORT)

async function server_setup()
{
    await action_server.start()
}

function sensor_start_failure(sensor, err)
{
    setup_error_occured = true
    critical_error(`Sensor ${sensor.name} with id ${sensor.id} failed to start with error ${err}`)
}

function sensor_read_failure(sensor, err)
{
    sensor_read_error.refresh_error(sensor, err)
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
const control_sensor = new TempSensor("control", CONTROL_DEVICE, CONTROL_CALIBRATION)
const experimental_sensor = new TempSensor("experimental", EXPERIMENTAL_DEVICE, EXPERIMENTAL_CALIBRATION)

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
        SetHeatingRaw(false)
        heating_state = "off"
        logger.info("Heating Shutdown successful")
    } catch(e) {
        critical_error(`Heating shutdown failed with error ${e}`)
    }
}

async function start_process() 
{
    in_setup = true
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

    in_setup = false

    packet = generate_new_packet()

    logger.info("All systems initialized")

    send_email("Experiment Online", `The Experiment "${EXPERIMENT_NAME}" is online and running smoothly`)

    await main_loop()
}

start_process() 

process.stdin.resume();