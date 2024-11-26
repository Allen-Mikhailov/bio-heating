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
let device_ip

// State
let experiment_running = false

let packet
let packet_additions = 0
let total_packets_sent = 0

let heating_mode = "automatic"
let heating_on = "unknown"

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

function SetHeatingRaw(value)
{
    rpio.write(env.HEATING_CONTROL_PIN, value?rpio.HIGH:rpio.LOW);
}

function SetHeating(value)
{
    if (heating_on === value) {return;}
    try {
        SetHeatingRaw(value)
    } catch(e) {
        gpio_write_error.refresh_error()
    }
}

function update_heating_mode(new_mode)
{
    const old_mode = heating_mode
    heating_mode = new_mode

    if (heating_mode == "on")
    {
        SetHeating(true)
    } else if (heating_mode == "off") {
        SetHeating(false)
    }

    logger.info(`Heating mode changed from ${old_mode} to ${heating_mode}`)
}

function update_env_property(property, value)
{
    const env_object = JSON.parse(JSON.stringify(env))
    env_object[property] = value
    write_env()
}

const service_update = () => exec("git pull origin master ; sudo systemctl restart bioheating-app")
const service_restart = () => exec("sudo systemctl restart bioheating-app")
const server_restart = () => exec("sudo shutdown now -r")
const server_shutdown = () => exec("sudo shutdown now")

const change_heating_mode = ({mode}) => update_heating_mode(mode)
const change_experiment_name = ({name}) => update_env_property("EXPERIMENT_NAME", name)
const change_control_calibration = ({temp}) => control_sensor.calibrate(temp)
const change_experimental_calibration = ({temp}) => experimental_sensor.calibrate(temp)
const start_experiment = () => {experiment_running = true; logger.info("Experiment Started")}
const stop_experiment = () => {experiment_running = false; logger.info("Experiment Stopped")}

// Server Setup
const server = new ActionServer(logger, env.SERVER_PORT)

server.add_action("POST", "service_update", service_update)
server.add_action("POST", "service_update", service_update)
server.add_action("POST", "service_restart", service_restart)
server.add_action("POST", "server_restart", server_restart)
server.add_action("POST", "server_shutdown", server_shutdown)
server.add_action("POST", "change_heating_mode", change_heating_mode)
server.add_action("POST", "change_experiment_name", change_experiment_name)
server.add_action("POST", "change_control_calibration", change_control_calibration)
server.add_action("POST", "change_experimental_calibration", change_experimental_calibration)
server.add_action("POST", "start_experiment", start_experiment)
server.add_action("POST", "stop_experiment", stop_experiment)

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

async function gpio_setup()
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

async function get_ip_address() {
    const promise = new Promise((resolve, reject) => {
        exec("hostname -I", (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            resolve(stdout)
        })
    })
    try {
        device_ip = await promise
        logger.info(`Device IP Address found at ${device_ip}`)
        return true
    } catch(err) {
        logger.info(`Device IP Address was not able to be found. Error: ${err}`)
        return false
    }
}

startup_process.add_action("server_start", server_start)
startup_process.add_action("senser_setup", sensor_setup)
startup_process.add_action("gpio_setup", gpio_setup)
startup_process.add_action("ngrok_setup", ngrok_setup)
startup_process.add_action("get_ip_address", get_ip_address)

function generate_new_packet()
{
    return {
        "experiment_id": env.EXPERIMENT_NAME,
        "control_temp": [],
        "experimental_temp": [],
        "temperature_timestamps": []
    }
}

const experiment_packet_collection = collection(db, "experiment_data")
function device_tick()
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

        if (heating_mode == "automatic")
        {
            // Simple heating logic
            SetHeating(dif > 2.5)
        }

        // Logging
        logger.info("Control %s C, Expirment %s C, dif %s", 
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
    if (packet_additions >= env.PACKET_SIZE)
    {
        packet.upload_timestamp = Timestamp.now()
        addDoc(experiment_packet_collection, packet)
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
        device_tick()
        await sleep(env.READ_INTERVAL)
    }
}

function write_device_success()
{
    const device_data = {
        active_url: active_url,
        ip_address: device_ip,
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

    await main_loop()
}

start_device();

process.stdin.resume();