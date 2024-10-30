import { db } from "./firebase.js";
import { generate_random_temp_example } from "./example.js";
import { collection, Timestamp } from "@firebase/firestore";
import { addDoc } from "@firebase/firestore";

const example_data = generate_random_temp_example()[0]

const experiment_id = "test"

const packet = {
    experiment_id: experiment_id,
    control_temp: example_data[0],
    experimental_temp: example_data[1],
    temperature_timestamps: example_data[2],
    upload_timestamp: Timestamp.fromMillis(Date.now())
}

await addDoc(collection(db, "experiment_data"), packet)