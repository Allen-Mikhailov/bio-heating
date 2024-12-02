import Experiment from "./experiment"
import SimulationExperiment from "./experiments/simulation/simulation.js"

const experiments: {[key: string]: any} = {
    "simulation": SimulationExperiment,
}

export default experiments