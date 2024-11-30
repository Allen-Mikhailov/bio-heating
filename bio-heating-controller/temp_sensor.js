import { readFileSync, readdirSync } from 'fs';
import path from "path";
import { fileURLToPath } from 'url';

const DEVICES_PATH = "/sys/bus/w1/devices/w1_bus_master1/"
const SENSOR_CONFIG_PATH = path.dirname(fileURLToPath(import.meta.url))+"/config.json"

const ERROR_TEMPERATURES = [0, 85] // If sensor outputs this temperature it has failed

let valid_dirents = {}
let sensor_config = {}
let sensors = {}

function is_error_temp(temp)
{
    return ERROR_TEMPERATURES.indexOf(temp) != -1
}

const default_start_failure = (sensor) => {}
const default_read_failure = (sensor) => {}

class TempSensor
{
    constructor(name, id)
    {
        this.name = name
        this.id = id
        this.offset_temp = 0

        this.temp = undefined

        this.on_read_failure = default_read_failure
    }

    set_offset_temp(offset_temp)
    {
        this.offset_temp = offset_temp
    }

    set_on_read_failure(callback)
    {
        this.on_read_failure = callback
    }

    calibrate(actual_temp)
    {
        this.offset_temp = actual_temp - this.raw_read()
    }

    start(logger)
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

async function start_service(logger)
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
        const sensor = new TempSensor(name, config_setting.is)
        sensor.offset_temp(config_setting.calibration)
        
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

    return true
}


export { TempSensor, start_service, sensors }