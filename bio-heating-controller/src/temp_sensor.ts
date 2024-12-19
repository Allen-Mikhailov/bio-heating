import { Dirent, readFileSync, readdirSync, writeFileSync } from 'fs';
import { Logger } from 'log4js';
import path from "path";
import { fileURLToPath } from 'url';
import { send_email } from './email.js';
import ToggleError from './toggle_errors.js';
import { logger } from './logger.js';
import { env } from './env_handler.js';

const DEVICES_PATH = "/sys/bus/w1/devices/w1_bus_master1/"
const SENSOR_CONFIG_PATH = path.dirname(fileURLToPath(import.meta.url))+"/../sensor_config.json"

const ERROR_TEMPERATURES = [0, 85] // If sensor outputs this temperature it has failed

const sensor_read_error = new ToggleError("sensor_read_error")

interface SensorConfig {
    [name: string]: {
        id: string,
        calibration: number,
        optional: boolean
    }
}


let valid_dirents: {[key: string]: Dirent} = {}
let sensor_config: SensorConfig = {}
let sensors: {[key: string]: TempSensor} = {}

function is_error_temp(temp: number)
{
    return ERROR_TEMPERATURES.indexOf(temp) != -1
}

const default_start_failure = (sensor: TempSensor) => {}
const default_read_failure = (sensor: TempSensor) => sensor_read_error.refresh_error(sensor)

// errors
const sensor_error_str = (s: TempSensor) => `Sensor ${s.name} with id ${s.id} is unable to read temperature`
sensor_read_error.set_on_error_always((name: string, sensor: TempSensor) => {
    logger.error(sensor_error_str(sensor))
})

sensor_read_error.set_on_error((name: string, sensor: TempSensor) => {
    send_email(`Critical Error with Device ${env.DEVICE_ID}`, sensor_error_str(sensor))
})



class TempSensor
{
    name: string;
    id: string;
    offset_temp: number;
    temp: number;
    on_read_failure: (sensor: TempSensor) => void
    constructor(name: string, id: string)
    {
        this.name = name
        this.id = id
        this.offset_temp = 0

        this.temp = 0

        this.on_read_failure = default_read_failure
    }

    // Edits config
    set_offset_temp(offset_temp: number)
    {
        this.offset_temp = offset_temp
        const sensor_config_str = readFileSync(SENSOR_CONFIG_PATH).toString()
        const sensor_config = JSON.parse(sensor_config_str)
        sensor_config[this.name].calibration = offset_temp
        writeFileSync(SENSOR_CONFIG_PATH, JSON.stringify(sensor_config, null, 4))
    }

    set_on_read_failure(callback: (sensor: TempSensor) => void)
    {
        this.on_read_failure = callback
    }

    calibrate(actual_temp: number)
    {
        this.set_offset_temp(actual_temp - this.raw_read())
    }

    start(logger: Logger)
    {
        if (valid_dirents[this.id] == undefined)
        {
            return [false, "not_found_error"]
        }
             

        logger.info("Found sensor \"%s\" with id \"%s\"", this.name, this.id)

        const raw_temperature = this.raw_read()

        if (is_error_temp(raw_temperature))
        {
            return [false, "read_error"]
        }

        this.temp = raw_temperature + this.offset_temp
        return [true]
    }

    raw_read()
    {
        const raw_data = readFileSync(DEVICES_PATH+this.id+"/temperature", "utf-8")
        return parseFloat(raw_data)/1000
    }

    read()
    {
        const raw_temperature = this.raw_read()

        let temperature = raw_temperature + this.offset_temp
        if (is_error_temp(raw_temperature))
        {
            this.on_read_failure(this)
            // The -1 can be paresed out
            return -1
        }
            
        this.temp = temperature
        
        return temperature 
    }
}

async function start_service(logger: Logger)
{
    logger.info("Finding Sensors")
    const files = readdirSync(DEVICES_PATH, { withFileTypes: true })
    files.map(dirent => {
        if (dirent.isDirectory() && dirent.name.startsWith("28"))
        {
            valid_dirents[dirent.name] = dirent

            
            logger.info("Found Valid Sensor with ID: \"%s\"", dirent.name)
        }
    })

    logger.info("Reading Sensor Config")
    let config_string
    try {
        config_string = readFileSync(SENSOR_CONFIG_PATH).toString()
    } catch(e) {
        logger.error(`Failed to read sensor config file at path${SENSOR_CONFIG_PATH} with error: ${e}`);
        return false;
    }

    try {
        sensor_config = JSON.parse(config_string)
    } catch(e) {
        logger.error(`Failed to parse sensor config JSON file with error: ${e}\nContent: ${config_string}`)
        return false
    }

    // Verifying Sensor Integrity
    const sensor_names = Object.keys(sensor_config)
    for (let i = 0; i < sensor_names.length; i++)
    {
        const name = sensor_names[i]
        const config_setting = sensor_config[name]
        const sensor = new TempSensor(name, config_setting.id)
        sensor.offset_temp = config_setting.calibration
        
        try {
            const [success, error] = sensor.start(logger)
            if (!success)
            {
                logger.error(`Sensor ${name} failed to start with controlled error: ${error}`)
                return false
            }
            sensors[name] = sensor
            logger.info(`Sensor ${name} has started succesfully`)
        } catch(e) {
            logger.error(`Sensor ${name} failed to start with error: ${e}`)
            return false
        }
    }

    setInterval(() => {
        Object.keys(sensors).map(sensor_name => {
            const sensor: TempSensor = sensors[sensor_name]
            sensor.read()
        })
    })

    return true
}


export { TempSensor, start_service, sensors, valid_dirents, SENSOR_CONFIG_PATH }