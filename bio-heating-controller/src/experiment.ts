import { Logger } from "log4js"

interface ExperimentSensorConfig {
    [experiment_sensor_name: string]: string
}

class Experiment
{
    name: string;
    logger: Logger;
    sensor_config: any;
    constructor(name: string, logger: Logger, sensor_config: ExperimentSensorConfig)
    {
        this.name = name
        this.logger = logger

        // {sensor_name_for_experiment: sensor_name}
        this.sensor_config = sensor_config
    }

    get_needed_sensors(): string[]
    {
        // [sensor_name_for_experiment_1, sensor_name_for_experiment_2]
        return []
    }

    start()
    {
        this.logger.info(`Stared Experiment ${this.name}`)
    }

    stop()
    {
        
    }
}

interface sensor_config {
    [experiment_sensor_name: string]: string
}

export default Experiment
export { sensor_config }