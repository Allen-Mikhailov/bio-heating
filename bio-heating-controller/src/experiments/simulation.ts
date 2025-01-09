import { collection } from "firebase/firestore";
import Experiment, { sensor_config } from "../experiment.js";
import { env } from "../env_handler.js";
import { db } from "../firebase.js";
import { logger } from "../logger.js";
import { set_heating } from "../gpio_handler.js";
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

class SimulationExperiment extends Experiment
{
    packet: simulation_packet
    packet_additions: number = 0
    total_packets_sent: number = 0
    running = false;
    promise: Promise<void>|undefined;
    stop_resolve: (() => void) | null = null;
    constructor(experiment_id: string, logger: Logger)
    {
        super("simulation", experiment_id, logger)
        this.packet = generate_new_packet()
    }

    get_needed_sensors(): string[]
    {
        // [sensor_name_for_experiment_1, sensor_name_for_experiment_2]
        return ["control", "experimental"]
    }

    tick()
    {
        this.logger.info("Ticking")
        // Reading Sensors
        // TODO: Read async
        const control_temp = this.sensors["control"].read()
        const experimental_temp = this.sensors["experimental"].read()

        this.logger.info("Ticking")
        
        if (control_temp == -1 || experimental_temp == -1)
        {   
            // Errored read
            this.logger.info("Errored sensor read")
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
            const experiment_packet_collection = collection(db, "experiments", this.experiment_id, "packets")
            addDoc(experiment_packet_collection, this.packet)
            this.packet = generate_new_packet()

            this.packet_additions = 0

            this.total_packets_sent++;
            logger.info("Sent packet #%s to server", this.total_packets_sent)
        }
    }

    start(): boolean
    {
        const sim = this
        const start_success = super.start()
        if (!start_success)
            return false



        new Promise<void>(async (resolve, reject) => {
            sim.stop_resolve = resolve
            while (true)
            {
                sim.logger.info("Tick attempt")
                // if (!sim.running) {
                //     break;
                // }
                sim.tick()
                await sleep(parseFloat(env.READ_INTERVAL))
            }
        })

        this.running = true
        this.push_start()

        
        return true
    }

    stop()
    {
        if (this.stop_resolve != null)
        {
            this.running = false
            this.stop_resolve()
        }
            
    }
}


export default SimulationExperiment