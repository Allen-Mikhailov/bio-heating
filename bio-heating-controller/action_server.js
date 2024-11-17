import http from "http"
import { format } from "util"

const ERROR_HEADING = "ACTION_SERVER_ERROR: "

const POST_JSON_PARSE_ERROR = ERROR_HEADING+"Failed to parse data from post request. body:\n%s"
const POST_NO_ACTION_ERROR = ERROR_HEADING+"Post request made with no action. body:\n%s"
const POST_NO_VALID_ACTION_ERROR = ERROR_HEADING+"Post request no action found for \"%s\". body:\n%s"

class ActionServer
{
    constructor(logger, port)
    {
        this.port = port
        this.logger = logger
        this.get_actions = {}
        this.post_actions = {}
    }

    post_request(req, res)
    {
        let body = ""
        req.on("data", (chunk) => {
            body += chunk
        })

        req.on("end", () => {
            let data

            try {
                data = JSON.parse(body)
            } catch(e) {

            }

            // Guard Clauses
            if (data == null)
                return this.logger.warn(format(POST_JSON_PARSE_ERROR, body))

            if (data.action == null)
                return this.logger.warn(format(POST_NO_ACTION_ERROR, body))

            if (this.post_actions[data.action] == undefined)
                return this.logger.warn(format(POST_NO_VALID_ACTION_ERROR, data.action, body))

            this.post_actions[data.action](data)
        })
    }

    get_request(req, res)
    {
        // Will do this later
    }

    async start()
    {   
        const server = http.createServer((req, res) => {
            if (req.method == "POST")
                return this.post_request(req, res)
            else if (req.method == "GET")
                return this.get_request(req, res)
            
        })

        const promise = new Promise((resolve, reject) => {
            server.listen(this.port, () => {
                resolve()
            })
        })

        await promise
        
    }

    add_action(type, name, callback)
    {
        if (type == "GET")
        {
            this.get_actions[name] = callback 
        } else if (type == "POST") {
            this.post_actions[name] = callback 
        }
    }
}

export default ActionServer