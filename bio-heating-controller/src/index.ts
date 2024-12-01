import { env, write_env } from './env_handler.js';

import { db } from './firebase.js';
import { addDoc, collection, setDoc, doc, Timestamp } from 'firebase/firestore';
import {send_email} from './email.js';
import { exec } from "child_process";
import { logger, server_logger, startup_logger, startup_memory} from './logger.js';
import ActionServer from './action_server.js';
import { start_service as start_sensor_service, sensors } from './temp_sensor.js';
import { forward as ngforward } from "@ngrok/ngrok";
import { gpio_setup } from './gpio_handler.js';
import ToggleError from "./toggle_errors.js";
import CustomProcess from "./custom_process.js";
import { TempSensor } from './temp_sensor.js';

const startup_process = new CustomProcess("Startup")
startup_process.set_logger(startup_logger)

const sensor_read_error = new ToggleError("sensor_read_error")

let active_url: string | undefined
let device_ip: string | undefined

// State
let running_experiment: string | undefined

function update_env_property(property: string, value: string)
{
    env[property] = value
    write_env(env)
}

const service_update = () => exec("git pull origin master ; sudo systemctl restart bioheating-app")
const service_restart = () => exec("sudo systemctl restart bioheating-app")
const server_restart = () => exec("sudo shutdown now -r")
const server_shutdown = () => exec("sudo shutdown now")

const change_experiment_name = ({name}: {name:string}) => update_env_property("EXPERIMENT_NAME", name)

function update_sensor_calibration({name, temp}:{name:string, temp:number})
{
    sensors[name].calibrate(temp)
}

const start_experiment = ({experiment}: {experiment: string}) => {
    experiment_running = true; 
    logger.info("Experiment Started")
}
const stop_experiment = () => {
    experiment_running = false; 
    logger.info("Experiment Stopped")
}

// Server Setup
const server = new ActionServer(server_logger, parseInt(env.SERVER_PORT))

server.add_action("POST", "service_update", service_update)
server.add_action("POST", "service_update", service_update)
server.add_action("POST", "service_restart", service_restart)
server.add_action("POST", "server_restart", server_restart)
server.add_action("POST", "server_shutdown", server_shutdown)
server.add_action("POST", "change_experiment_name", change_experiment_name)
server.add_action("POST", "update_sensor_calibration", update_sensor_calibration)
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

const sensor_failure = (sensor: TempSensor) => sensor_read_error.refresh_error(sensor)
async function sensor_setup()
{
    const success = await start_sensor_service()
    if (!success) {return false}

    Object.keys(sensors).map(sensor_name => {
        const sensor = sensors[sensor_name]
        sensor.on_read_failure = sensor_failure
    })
    logger.info("Sensor setup Completed")
    return true
}



async function ngrok_setup()
{
    // Establish connectivity
    let failed = false
    await ngforward({ addr: env.SERVER_PORT, authtoken_from_env: true }).then((listener) => {
        // Push url onto database
        active_url = listener.url() || undefined
        logger.info("Ngrok started at %s at port %s", active_url, env.SERVER_PORT)
    }).catch((e) => {
        failed = true
        logger.error(`Ngrok setup failed with error: ${e}`)
    });

    return !failed
}

async function get_ip_address() {
    const promise = new Promise<string>((resolve, reject) => {
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

// errors
const sensor_error_str = (s: TempSensor) => `Sensor ${s.name} with id ${s.id} is unable to read temperature`
sensor_read_error.set_on_error_always((sensor: TempSensor) => {
    logger.error(sensor_error_str(sensor))
})

sensor_read_error.set_on_error((sensor: TempSensor) => {
    send_email(`Critical Error with Device ${env.DEVICE_ID}`, sensor_error_str(sensor))
})

function write_device_success()
{
    const device_doc = doc(db, "experiments", env.DEVICE_ID)
    const device_data = {
        active_url: active_url,
        ip_address: device_ip,
        device_id: env.DEVICE_ID,
        server_up_time: Timestamp.now(),
        last_activity: Timestamp.now()
    }
    return setDoc(device_doc, device_data)
}

function startup_fail(failed_actions: string[])
{
     // Will have already logged the failure just sending an email now
     let email_block = ""
     email_block += `These actions failed: ${failed_actions.join()}<br><br>`
     email_block += `Logs<br><br>`
     email_block += startup_memory.join("<br>")

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

    send_email("Device Online", `The Device "${env.DEVICE_ID}" is online and running smoothly`)
}

start_device();

process.stdin.resume();