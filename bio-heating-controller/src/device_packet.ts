import { env, get_env } from "./env_handler.js";
import { valid_dirents as raw_sensors, sensors, SENSOR_CONFIG_PATH } from "./temp_sensor.js";
import { readFileSync } from 'fs';
import experiments from "./all_experiments.js";
import path from "path"
import { main_dir } from "./env_handler.js";
import { DevicePacket, DeviceState } from "../../shared/src/interfaces"
import { exec } from "child_process";
import { Logger } from "log4js";
import { logger } from "./logger.js";

const PROTECTED_ENV_VALUES = [
    "SENDGRID_API_KEY",
    "FIREBASE_API_KEY",
    "NGROK_AUTHTOKEN"
]

async function get_memory_usage(logger: Logger): Promise<number>
{
    const promise = new Promise<string>((resolve, reject) => {
        exec(`free | awk '/Mem:/ {printf "%.2f\n", $3/$2 * 100.0}'`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            resolve(stdout)
        })
    })
    try {
        const memory_usage: number = parseFloat(await promise)
        logger.info(`Read device memory usage as ${memory_usage}%`)
        return memory_usage
    } catch(err) {
        logger.info(`Unable to read device memory usage. Error: ${err}`)
        return -1
    }
    
}

async function get_cpu_temperature(logger: Logger) {
    const promise = new Promise<string>((resolve, reject) => {
        exec(`cat /sys/class/thermal/thermal_zone0/temp`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            resolve(stdout)
        })
    })
    try {
        const cpu_temp: number = parseFloat(await promise) / 1000
        logger.info(`Read device cpu temp as ${cpu_temp}%`)
        return cpu_temp
    } catch(err) {
        logger.info(`Unable to read device cpu temp. Error: ${err}`)
        return -1
    }
}

async function generate_device_packet(deviceState: DeviceState): Promise<string>
{
    const packet: DevicePacket = {
        all_device_sensors: [],
        sensor_config: {},
        simulation_sensor_configs: {},
        env: {},
        sensor_readings: {},
        device_state: deviceState,
        memory_usage: 0,
        cpu_temperature: 0
    }

    // Sensors
    packet.sensor_config = JSON.parse(readFileSync(SENSOR_CONFIG_PATH).toString())

    // ENV
    const env = get_env()
    PROTECTED_ENV_VALUES.map(key => {
        if (env[key] != undefined)
            delete env[key]
    })
    packet.env = env

    // Experiments
    Object.keys(experiments).map(experiment_name => {
        const p = path.resolve(main_dir, `experiment_configs`, `${experiment_name}_sensor_config.json`)
        packet.simulation_sensor_configs[experiment_name] = JSON.parse(readFileSync(p).toString())
    })

    // Raw Sensors
    Object.keys(raw_sensors).map(sensor_id => {
        packet.all_device_sensors.push(sensor_id)
    })

    Object.keys(sensors).map(sensor_id => {
        packet.sensor_readings[sensor_id] = sensors[sensor_id].temp
    })

    // Memory usage
    packet.memory_usage = await get_memory_usage(logger)
    packet.cpu_temperature = await get_cpu_temperature(logger)

    return JSON.stringify(packet)
}

export default generate_device_packet