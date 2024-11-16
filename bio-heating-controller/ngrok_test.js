import { config } from 'dotenv';
config()
import { forward } from "@ngrok/ngrok";
import { addDoc, collection, setDoc, Timestamp, doc } from 'firebase/firestore';
import { db } from './firebase';

import http from "http"
// Create webserver
http.createServer((req, res) => {
    let data_string = ""
    req.on("data", (chunk => {
        data_string += chunk
    }))
    req.on("end", (() => {
        const data = JSON.parse(data_string)

        if (req.method == "POST")
        {
            if (data.action == "test_action")
            {
                console.log("test action")
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('Action Success');
            }
        } else if (req.method == "GET") {
            if (data.action == "PING")
            {
                console.log("pinged")
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('Ping Success');
            }
        }
        
    }))
}).listen(8080, () => console.log('Node.js web server at 8080 is running...'));

const experiment_doc = new doc(db, "experiments", process.env.EXPERIMENT_NAME)


(async function() {
    // Establish connectivity
    const listener = await forward({ addr: 8080, authtoken_from_env: true });

    // Push url onto database
    const experiment_data = {
        active_url: listener.url(),
        is_active: true,
        last_activity: Timestamp.now(),
        server_start: Timestamp.now()
    }
    setDoc(experiment_doc, experiment_data)
  
})();

process.stdin.resume();