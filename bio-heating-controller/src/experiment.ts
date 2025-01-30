import { Logger } from "log4js"
import { sensors, TempSensor } from "./temp_sensor.js"
import { readFileSync }from "fs"
import path from "path";
import { fileURLToPath } from 'url';
import { arrayUnion, collection, doc, getDoc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { DeviceMark, ExperimentData } from "./shared/src/interfaces.js";
import { env } from "./env_handler.js";

interface ExperimentSensorConfig {
    [experiment_sensor_name: string]: string
}

class Experiment
{
    name: string;
    experiment_id: string;
    logger: Logger;
    sensor_config: ExperimentSensorConfig;
    sensors: {[key: string]: TempSensor}
    constructor(name: string, experiment_id: string, logger: Logger)
    {
        this.name = name
        this.experiment_id = experiment_id
        this.logger = logger

        // {sensor_name_for_experiment: sensor_name}
        this.sensor_config = {}
        this.sensors = {}
    }

    get_needed_sensors(): string[]
    {
        // [sensor_name_for_experiment_1, sensor_name_for_experiment_2]
        return []
    }

    get_sensors(): boolean
    {
        // Getting Sensor Config
        try {
            const config_string = readFileSync(this.get_config_path()).toString()
            this.sensor_config = JSON.parse(config_string)
        } catch(e) {
            this.logger.error(`Failed to get sensor config for experiment ${this.name} with error: ${e}`)
            return false
        }

        this.logger.info(`Able to get sensor config for experiment ${this.name} with config: ${this.sensor_config}`)

        this.sensors = {}

        let found_all_sensors: boolean = true
        const needed_sensors: string[] = this.get_needed_sensors()
        for (let i = 0; i < needed_sensors.length; i++)
        {
            const sensor_alias: string = needed_sensors[i]
            const config_name: string | undefined = this.sensor_config[sensor_alias]
            // Checking if it is in config
            if (config_name === undefined)
            {
                this.logger.info(`Sensor alias ${sensor_alias} is not present in the sensor_config`)
                found_all_sensors = false
            } else if (sensors[config_name] == undefined) {
                this.logger.info(`Sensor with alias ${sensor_alias} and name ${config_name} has not been found`)
                found_all_sensors = false
            } else {
                const sensor = sensors[config_name]
                this.logger.info(`Matched Sensor alias ${sensor_alias} with name ${config_name} and id ${sensor.id}`)
                this.sensors[sensor_alias] = sensor
            }
        }

        return found_all_sensors
    }

    start(): boolean
    {
        this.logger.info(`Attempting to start experiment ${this.name}`)

        const found_all_sensors: boolean = this.get_sensors()

        if (!found_all_sensors)
        {
            this.logger.error(`Not all sensors found needed for experiment ${this.name}. Will not continue`)
            return false
        }

        return true
    }

    async push_start(): Promise<boolean>
    {
        const doc_obj = doc(db, "experiments", this.experiment_id)
        const doc_snapshot = await getDoc(doc_obj)

        const mark: DeviceMark = {
            deviceId: env.DEVICE_ID,
            startTime: Timestamp.now()
        }

        if (doc_snapshot.exists())
        {
            // Is resuming
            updateDoc(doc_obj, {
                marks: arrayUnion(mark)
            })
        } else {
            // Is creating
            const experimentData: ExperimentData = {
                creationDate: Timestamp.now(),
                experimentType: this.name,
                marks: [mark]
            }
            setDoc(doc_obj, experimentData)
        }
        
        return true;
    }

    stop()
    {

    }

    get_config_path(): string
    {
        return path.dirname(fileURLToPath(import.meta.url))+`/../experiment_configs/${this.name}_sensor_config.json`
    }
}

interface sensor_config {
    [experiment_sensor_name: string]: string
}

export default Experiment
export { sensor_config }