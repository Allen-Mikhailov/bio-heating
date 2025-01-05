import { env, get_env } from "./env_handler.js";
import { valid_dirents as raw_sensors, sensors, SENSOR_CONFIG_PATH } from "./temp_sensor.js";
import { readFileSync } from 'fs';
import experiments from "./all_experiments.js";
import path from "path"
import { main_dir } from "./env_handler.js";
import { DevicePacket, DeviceState } from "../../shared/src/interfaces"

const PROTECTED_ENV_VALUES = [
    "SENDGRID_API_KEY",
    "FIREBASE_API_KEY",
    "NGROK_AUTHTOKEN"
]

function generate_device_packet(deviceState: DeviceState): string
{
    const packet: DevicePacket = {
        all_device_sensors: [],
        sensor_config: {},
        simulation_sensor_configs: {},
        env: {},
        sensor_readings: {},
        device_state: deviceState
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

    return JSON.stringify(packet)
}

export default generate_device_packet