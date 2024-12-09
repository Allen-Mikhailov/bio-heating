import { env } from "./env_handler.js";
import { valid_dirents as raw_sensors, sensors, SENSOR_CONFIG_PATH } from "./temp_sensor.js";
import { readFileSync } from 'fs';
import experiments from "./all_experiments.js";
import { get_env } from "./env_handler.js";
import Experiment from "./experiment.js";

const PROTECTED_ENV_VALUES = [
    "SENDGRID_API_KEY",
    "FIREBASE_API_KEY",
    "NGROK_AUTHTOKEN"
]

function generate_device_packet(): string
{
    const packet: any = {
        all_device_sensors: [],
        sensor_config: {},
        simulation_sensor_configs: {},
        env: {}
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
        const experiment_class = experiments[experiment_name] as Experiment
        const path = experiment_class.get_config_path()
        packet.simulation_sensor_configs[experiment_name] = JSON.parse(readFileSync(path).toString())
    })

    // Raw Sensors
    Object.keys(raw_sensors).map(sensor_id => {
        packet.all_device_sensors.push(sensor_id)
    })

    return JSON.stringify(packet)
}

export default generate_device_packet