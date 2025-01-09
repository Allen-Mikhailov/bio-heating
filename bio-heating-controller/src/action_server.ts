import http from "http"
import { Logger } from "log4js"
import { format } from "util"

const ERROR_HEADING = "ACTION_SERVER_ERROR: "

const POST_JSON_PARSE_ERROR = ERROR_HEADING+"Failed to parse data from post request. body:\n%s"
const POST_NO_ACTION_ERROR = ERROR_HEADING+"Post request made with no action. body:\n%s"
const POST_NO_VALID_ACTION_ERROR = ERROR_HEADING+"Post request no action found for \"%s\". body:\n%s"

const GET_NO_VALID_ACTION_ERROR = ERROR_HEADING+"Get request no action found for \"%s\"."

class ActionServer
{
    port: number;
    logger: Logger;
    get_actions: {[key: string]: () => Promise<string>}
    post_actions: {[key: string]:  (data: any) => void}

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
            let data: any = null

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

            this.logger.info(`Began action ${data.action} on request`)
            this.post_actions[data.action](data)

            res.writeHead(200, {"Content-Type": "application/json"}); // to lazy to search up the thing for plain text
            res.end(`{"message": "it worked"}`)
        })
    }

    async get_request(req: http.IncomingMessage, res: http.ServerResponse)
    {
        const name: string = req.url || ""
        if (!this.get_actions[name])
        {
            this.logger.warn(format(GET_NO_VALID_ACTION_ERROR, req.url))
            res.writeHead(200);
            res.end(`No command given for "${req.url}"`)
            return
        }
            
        try {
            const response_data: string = await this.get_actions[name]()
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(response_data)
        } catch(e) {
            res.writeHead(403);
            res.end(`Error with "${req.url}" error: ${e}`)
        }
        
    }

    async start()
    {   
        const server = http.createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', `*`); // Allow your frontend
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Allow specific methods
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Allow specific headers
            this.logger.info(`Recieved a request with method ${req.method}`)

            if (req.method === 'OPTIONS') {
                // CORS headers
                res.writeHead(204); // No content
                res.end();
                return;
              }

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

    add_post_action(name: string, callback: (data: any) => void )
    {
        this.post_actions[name] = callback
    }

    add_get_action(name: string, callback: () => Promise<string> )
    {
        this.get_actions[name] = callback 
    }
}

export default ActionServer