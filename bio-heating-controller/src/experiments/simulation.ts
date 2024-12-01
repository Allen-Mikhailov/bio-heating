import { collection } from "firebase/firestore";
import Experiment, { sensor_config } from "../experiment";
import { env } from "../env_handler";
import { db } from "../firebase";
import { logger } from "../logger";
import { set_heating } from "../gpio_handler";
import { Logger } from "log4js";
import { Timestamp, addDoc } from "firebase/firestore";

interface simulation_packet {
    experiment_id: string;
    control_temp: number[];
    experimental_temp: number[];
    temperature_timestamps: Timestamp[];
    upload_timestamp: Timestamp;
}

function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function generate_new_packet(): simulation_packet
{
    return {
        "experiment_id": env.EXPERIMENT_NAME,
        "control_temp": [],
        "experimental_temp": [],
        "temperature_timestamps": [],
        "upload_timestamp": Timestamp.now()
    }
}

const experiment_packet_collection = collection(db, "experiment_data")


class SimulationExperiment extends Experiment
{
    packet: simulation_packet
    packet_additions: number = 0
    total_packets_sent: number = 0
    promise: Promise<void>|undefined;
    constructor(logger: Logger, sensor_config: sensor_config)
    {
        super("simulation", logger, sensor_config)
        this.packet = generate_new_packet()
    }

    tick()
    {
        // Reading Sensors
        const control_temp = control_sensor.read()
        const experimental_temp = experimental_sensor.read()
        
        if (control_temp == -1 || experimental_temp == -1)
        {   
            // Errored read
            set_heating(false)
        } else {
            // Successful read
            const dif = experimental_temp - control_temp

            // Simple heating logic
            set_heating(dif < 2.5)

            // Logging
            logger.info("Control %s C, Expirment %s C, dif %s", 
                control_temp, 
                experimental_temp, 
                dif
            )
        }

        // Writing to packet
        this.packet.control_temp.push(control_temp)
        this.packet.experimental_temp.push(experimental_temp)
        this.packet.temperature_timestamps.push(Timestamp.now())

        this.packet_additions++;

        // Sending Data to server
        if (this.packet_additions >= parseFloat(env.PACKET_SIZE))
        {
            this.packet.upload_timestamp = Timestamp.now()
            addDoc(experiment_packet_collection,this. packet)
            this.packet = generate_new_packet()

            this.packet_additions = 0

            this.total_packets_sent++;
            logger.info("Sent packet #%s to server", this.total_packets_sent)
        }
    }

    start_experiment()
    {
        const thread = new Promise(async (resolve, reject) => {
            while (true)
            {
                this.tick()
                await sleep(parseFloat(env.READ_INTERVAL))
            }
        })

        
        
    }

    async stop_experiment()
    {

    }
}


export default SimulationExperiment