import { readFileSync } from 'fs';
import { get_env, write_env } from './env_handler.js';
let env = get_env()

import { db } from './firebase.js';
import { addDoc, collection, setDoc, doc, Timestamp } from 'firebase/firestore';
import sgMail from '@sendgrid/mail'
import { exec } from "child_process";
import { logger, startup_logger, startup_memory} from './logger.js';
import ActionServer from './action_server.js';
import { TempSensor, find_sensors } from './temp_sensor.js';
import { forward as ngforward } from "@ngrok/ngrok";
import rpio from "rpio";
import ToggleError from "./toggle_errors.js";
import CustomProcess from "./custom_process.js";

const startup_process = new CustomProcess("Startup")
startup_process.set_logger(startup_logger)

// Sensors
const control_sensor = new TempSensor("control", env.CONTROL_DEVICE)
control_sensor.set_offset_temp(parseFloat(env.CONTROL_CALIBRATION))

const experimental_sensor = new TempSensor("experimental", env.EXPERIMENTAL_DEVICE)
experimental_sensor.set_offset_temp(parseFloat(env.EXPERIMENTAL_CALIBRATION))

const sensor_read_error = new ToggleError("sensor_read_error")
const gpio_write_error = new ToggleError("gpio_write_error")

let active_url

function send_email(subject, text)
{
    text += `\nSent at ${new Date().toString()}`
    const on_email_sent = () => logger.info('Email of subject %s sent', subject)
    const msg = {
        to: EMAIL_TARGET,
        from: EMAIL,
        subject: subject,
        text: text,
        html: text
    }
    sgMail.send(msg).then(on_email_sent).catch(logger.error)
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

const service_update = () => exec("git pull origin master ; sudo systemctl restart bioheating-app")
const service_restart = () => exec("sudo systemctl restart bioheating-app")
const server_restart = () => exec("sudo shutdown now -r")
const server_shutdown = () => exec("sudo shutdown now")

// Server Setup
const server = new ActionServer(logger, env.SERVER_PORT)

server.add_action("POST", "service_update", service_update)
server.add_action("POST", "service_update", service_update)
server.add_action("POST", "service_restart", service_restart)
server.add_action("POST", "server_restart", server_restart)
server.add_action("POST", "server_shutdown", server_shutdown)

async function server_start()
{
    try {
        await server.start()
        logger.info(`HTTP Server started at port ${env.SERVER_PORT}`)
        return true
    } catch(err) {
        logger.error(`HTTP Server failed to start with error: ${err}`)
        return false
    }
}

const sensor_failure = (sensor) => sensor_read_error.refresh_error(sensor)

async function sensor_setup() 
{
    try {
        find_sensors(logger)
        
    } catch(e) {
        logger.error("Failed to find sensors on device")
        return false
    }

    // Will probably have an varying amount sensors in the future
    const sensors = [
        control_sensor,
        experimental_sensor
    ]

    let failed_sensors = []
    function sensor_start_failure(sensor)
    {
        failed_sensors.push(sensor)
        logger.info(`Sensor ${sensor.name} with id ${sensor.id} failed to start with error ${err}`)
    }
    
    for (let i = 0; i < sensors.length; i++)
    {
        const sensor = sensors[i]
        sensor.on_start_failure = sensor_start_failure
        sensor.on_read_failure = sensor_failure
        sensor.start(logger)
    }

    if (failed_sensors.length !== 0)
    {
        logger.error(`Sensor start has failed with sensors ${failed_sensors.map(sensor => sensor.name).join()}`)
        return false
    }

    logger.info("All Sensors started successfully")
    return true
}

function gpio_setup()
{
    try {
        rpio.open(env.HEATING_CONTROL_PIN, rpio.OUTPUT);
        logger.info("GPIO Setup Completed")
        return true
    } catch(e) {
        logger.error(`GPIO error has occured ${e}`)
        return false
    }
}

async function ngrok_setup()
{
    // Establish connectivity
    let failed = false
    await ngforward({ addr: SERVER_PORT, authtoken_from_env: true }).then((listener) => {
        // Push url onto database
        active_url = listener.url()
        logger.info("Ngrok started at %s at port %s", active_url, SERVER_PORT)
    }).catch((e) => {
        failed = true
        logger.error(`Ngrok setup failed with error: ${e}`)
    });

    return !failed
}

startup_process.add_action("server_start", server_start)
startup_process.add_action("senser_setup", sensor_setup)
startup_process.add_action("gpio_setup", gpio_setup)
startup_process.add_action("ngrok_setup", ngrok_setup)

function write_device_success()
{
    const device_data = {
        active_url: active_url,
        device_id: env.DEVICE_ID,
        server_up_time: Timestamp.now(),
        last_activity: Timestamp.now()
    }
    return setDoc(device_doc, device_data)
}

function startup_fail(failed_actions)
{
     // Will have already logged the failure just sending an email now
     let email_block = ""
     email_block += `These actions failed: ${failed_actions.join()}<br><br>`
     email_block += `Logs<br><br>`
     email_block += startup_memory.getBuffer().replace("\n", "<br>")

     send_email(`FAILED startup of device ${env.DEVICE_ID}`, email_block)
     process.exitCode = 1;
}

async function start_device() {
    logger.info("Begining Startup Process")
    const [startup_success, failed_actions] = await startup_process.start()

    if (!startup_success)
        return startup_fail(failed_actions)

    try {
        await write_device_success()
    } catch(e) {
        startup_fail(["write_device_opening_to_firebase"])
    }
}

start_device();

process.stdin.resume();