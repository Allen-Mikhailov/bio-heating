import { Timestamp } from "firebase/firestore"

interface SensorConfig {
    id: string,
    calibration: number,
    optional: boolean
}

interface DeviceState
{
    runningExperiment: boolean,
    runningExperimentId: string,
    runningExperimentType: string
}

interface DeviceData {
    active_url: string,
    device_id: string,
    ip_address: string,
    last_activity: Timestamp,
    server_up_time: Timestamp,
    is_active: boolean,
    version: string
}

interface DevicePacket {
    all_device_sensors: string[],
    sensor_config: {[key: string]: SensorConfig},
    simulation_sensor_configs: {[key: string]: string},
    env: {[key: string]: string},
    sensor_readings: {[key: string]: number},
    device_state: DeviceState
}

interface DeviceMark {
    deviceId: string,
    startTime: Timestamp
}

interface ExperimentData {
    creationDate: Timestamp,
    experimentType: string,
    marks: DeviceMark[]
} 

type ExperimentMap = { [key: string]: ExperimentData };

export type { SensorConfig, DeviceData, DevicePacket, DeviceMark, ExperimentData, ExperimentMap, DeviceState }