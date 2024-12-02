import Experiment from "./experiment.js"
import SimulationExperiment from "./experiments/simulation.js"

const experiments: {[key: string]: any} = {
    "simulation": SimulationExperiment,
}

export default experiments