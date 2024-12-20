import { env, main_dir, write_env } from './env_handler.js';

import { db } from './firebase.js';
import { addDoc, collection, setDoc, doc, Timestamp } from 'firebase/firestore';
import {send_email, email_setup} from './email.js';
import { exec } from "child_process";
import { logger, server_logger, startup_logger, startup_memory} from './logger.js';
import ActionServer from './action_server.js';
import { start_service as start_sensor_service, sensors } from './temp_sensor.js';
import { forward as ngforward } from "@ngrok/ngrok";
import { gpio_setup, set_heating } from './gpio_handler.js';
import CustomProcess from "./custom_process.js";
import experiments from './all_experiments.js';
import Experiment from './experiment.js';
import generate_device_packet from './device_packet.js';
import path from "path";
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import log4js from 'log4js';

const VERSION_NAME = readFileSync(main_dir+"/version.txt").toString()

const startup_process = new CustomProcess("Startup")
startup_process.set_logger(startup_logger)

let active_url: string | undefined
let device_ip: string | undefined

// State
let running_experiment: boolean = false
let experiment_type: string = "undefined"
let experiment_obj: Experiment | null

function update_env_property(property: string, value: string)
{
    env[property] = value
    write_env(env)
}

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const options = { 
    cwd: dir // Change to your desired directory
  };

logger.info("maindir: "+main_dir) // test

const update_command = `sudo git pull origin master ;`
    + `/home/bioheating/.nvm/versions/node/v23.3.0/bin/npx tsc --build`
const service_update = () => exec(update_command, options, async (error, stdout, stderr) => {

    logger.info("Update stdout: "+stdout)
    logger.info("Update error: "+error)
    logger.info("Update stderr: "+stderr)

    // setTimeout(service_restart, 1000)
})
const service_restart = () => { log4js.shutdown() ; exec("sudo systemctl restart bioheating-app") }
const server_restart  = () => { log4js.shutdown() ; exec("sudo shutdown now -r") }
const server_shutdown = () => { log4js.shutdown() ; exec("sudo shutdown now") }

const change_env_property = ({property, value}: {property:string, value: string}) => update_env_property(property, value)

function update_sensor_calibration({name, temp}:{name:string, temp:number})
{
    logger.info(`Calibrating Sensor id: ${name}, temp: ${temp}`)
    sensors[name].calibrate(temp)
}

const start_experiment = ({new_experiment_type}: {new_experiment_type: string}) => {
    if (running_experiment) {return;}

    if (experiments[new_experiment_type] == null)
    {
        logger.error(`Failed to start Experiment ${new_experiment_type} as it is not a valid experiment type`)
        return
    }
    experiment_type = new_experiment_type
    experiment_obj = new experiments[new_experiment_type](logger)
    experiment_obj?.start()
    running_experiment = true
    
    logger.info("Experiment Started")
}
const stop_experiment = () => {
    if (running_experiment && experiment_obj != null)
    {
        logger.info("Stopping experiment stopped")
        experiment_obj.stop()
        set_heating(false)
        logger.info("Experiment Stopped")
        experiment_obj = null
        running_experiment = false
    }
    
}

// Server Setup
const server = new ActionServer(server_logger, parseInt(env.SERVER_PORT))

// POST actions
server.add_post_action("service_update", service_update)
server.add_post_action("service_restart", service_restart)
server.add_post_action("server_restart", server_restart)
server.add_post_action("server_shutdown", server_shutdown)
server.add_post_action("change_env_property", change_env_property)
server.add_post_action("update_sensor_calibration", update_sensor_calibration)
server.add_post_action("start_experiment", start_experiment)
server.add_post_action("stop_experiment", stop_experiment)

// GET actions
server.add_get_action("/device_packet", generate_device_packet)

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

async function sensor_setup()
{
    const success = await start_sensor_service(logger)
    if (!success) {return false}

    logger.info("Sensor setup Completed")
    return true
}



async function ngrok_setup()
{
    // Establish connectivity
    let failed = false
    const ngrok_config = { 
        addr: env.SERVER_PORT, 
        authtoken_from_env: true, 
        headers: { 'Access-Control-Allow-Origin': `*` } 
    }
    await ngforward(ngrok_config).then((listener) => {
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
startup_process.add_action("email_setup", email_setup)

function write_device_success()
{
    const device_doc = doc(db, "devices", env.DEVICE_ID)
    const device_data = {
        active_url: active_url,
        ip_address: device_ip,
        device_id: env.DEVICE_ID,
        server_up_time: Timestamp.now(),
        last_activity: Timestamp.now(),
        version: VERSION_NAME
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
    log4js.shutdown()
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

    send_email("Device Online", `The Device "${env.DEVICE_ID}" is online and running smoothly ${VERSION_NAME}`)
}

start_device();

process.stdin.resume();