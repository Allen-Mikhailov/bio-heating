import http from "http"
import { Logger } from "log4js"
import { format } from "util"

const ERROR_HEADING = "ACTION_SERVER_ERROR: "

const POST_JSON_PARSE_ERROR = ERROR_HEADING+"Failed to parse data from post request. body:\n%s"
const POST_NO_ACTION_ERROR = ERROR_HEADING+"Post request made with no action. body:\n%s"
const POST_NO_VALID_ACTION_ERROR = ERROR_HEADING+"Post request no action found for \"%s\". body:\n%s"

class ActionServer
{
    port: number;
    logger: Logger;
    get_actions: {[key: string]: (data: any) => void}
    post_actions: {[key: string]: (data: any) => void}

    constructor(logger: Logger, port: number)
    {
        this.port = port
        this.logger = logger
        this.get_actions = {}
        this.post_actions = {}
    }

    post_request(req: http.IncomingMessage, res: http.ServerResponse)
    {
        let body = ""
        req.on("data", (chunk) => {
            body += chunk
        })

        req.on("end", () => {
            let data: any

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

        const promise = new Promise<void>((resolve, reject) => {
            server.listen(this.port, () => {
                resolve()
            })
        })

        await promise
        
    }

    add_action(type: string, name: string, callback: (data: any) => void)
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