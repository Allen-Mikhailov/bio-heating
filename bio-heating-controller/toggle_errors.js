const default_cooldown = 60 * 60 * 1000 // 1 hour

const default_on_error = (name) => {}

class ToggleError
{
    constructor(name)
    {
        this.name = name
        this.last_refresh = 0
        this.on_error = default_on_error
        this.on_error_always = default_on_error
    }

    set_on_error(on_error)
    {
        this.on_error = on_error
    }

    set_on_error_always(on_error_always)
    {
        this.on_error_always = on_error_always
    }

    refresh_error(...args)
    {
        if (Date.now() - this.last_refresh > default_cooldown)
        {
            this.last_refresh = Date.now()
            this.on_error(this.name, ...args)
        }
    }
}

export default ToggleError