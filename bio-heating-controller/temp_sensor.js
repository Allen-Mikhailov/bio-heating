import { readFileSync, readdirSync } from 'fs';

const DEVICES_PATH = "/sys/bus/w1/devices/w1_bus_master1/"
const ERROR_TEMPERATURES = [0, 85] // If sensor outputs this temperature it has failed

let valid_dirents = {}

function find_sensors(logger)
{
    const files = readdirSync(DEVICES_PATH, { withFileTypes: true })
    files.map(dirent => {
        if (dirent.isDirectory() && dirent.name.startsWith("28"))
        {
            valid_dirents[dirent.name] = dirent

            
            logger.info("Found Valid Sensor with ID: \"%s\"", dirent.name)
        }
    })
}

function is_error_temp(temp)
{
    return ERROR_TEMPERATURES.indexOf(temp) != -1
}

function default_start_failure(sensor)
{

}

function default_read_failure(sensor)
{

}

class TempSensor
{
    constructor(name, id)
    {
        this.name = name
        this.id = id
        this.offset_temp = 0

        this.temp = undefined

        this.on_start_failure = default_start_failure
        this.on_read_failure = default_read_failure
    }

    set_offset_temp(offset_temp)
    {
        this.offset_temp = offset_temp
    }

    set_on_start_failure(callback)
    {
        this.on_start_failure = callback
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
            this.on_start_failure(this, "not_found_error")
            return
        }
             

        logger.info("Found sensor \"%s\" with id \"%s\"", this.name, this.id)

        const raw_temperature = this.raw_read()

        if (is_error_temp(raw_temperature))
        {
            this.on_start_failure(this, "read_error")
            return
        }

        this.temp = raw_temperature + this.offset_temp
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

export { TempSensor, find_sensors}