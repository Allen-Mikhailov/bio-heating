class CustomProcess
{
    constructor(process_name)
    {
        this.process_name = process_name
        this.error = () => {}
        this.final_error = () => {}
        this.actions = {}
        this.logger = undefined
    }

    set_logger(logger)
    {
        this.logger = logger
    }

    add_action(action_name, action)
    {
        // returns success true/false
        this.actions[action_name] = action
    }

    on_error(error)
    {
        this.error = error
    }

    on_final_error(final_error)
    {
        this.final_error = final_error
    }

    async start()
    {
        // Setting up all actions
        const calls = []
        const action_keys = Object.keys(this.actions)
        for (let i = 0; i < action_keys.length; i++)
        {
            const action_name = action_keys[i]
            const action = this.actions[action_name]
            calls.push(action)
        }

        // Running all Actions
        const results = await Promise.all(calls)

        // Looking at results
        let success = true
        let failed_actions = []
        results.map(i => {
            const action_name = action_keys[i]
            if (results[action_name] !== true)
            {
                success = false
                failed_actions.push(action_name)
            }
        })

        

        if (success)
        {
            if (this.logger)
                this.logger.info(`Process ${this.process_name} completed successfully`)
            return [true, []]
        } else {
            if (this.logger)
            {
                const failed_string = failed_actions.toString().substring(1, -1)
                this.logger.error(`Process ${this.process_name} failed with actions ${failed_string} failing`)
            }
                
            return [false, failed_actions]
        }
    }


}

export default CustomProcess