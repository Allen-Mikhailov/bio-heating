import rpio from "rpio";
import { env } from "./env_handler.js";
import ToggleError from "./toggle_errors.js";
import { send_email } from "./email.js";
import { logger } from "./logger.js";

const gpio_write_error = new ToggleError("gpio_write_error")

let heating_on: boolean = false;

async function gpio_setup()
{
    try {
        rpio.init({ gpiomem: false, mapping: 'gpio' });
        rpio.open(parseInt(env.HEATING_CONTROL_PIN), rpio.OUTPUT);
        logger.info("GPIO Setup Completed")
        return true
    } catch(e) {
        logger.error(`GPIO error has occured ${e}`)
        return false
    }
}

gpio_write_error.set_on_error((name: string, pin: number, value: boolean, e: Error) => {
    
  let error = "GPIO has failed to set a pin."
  error += " Heaing is unable to be controlled"
  error += ` Last Known state ${heating_on?"on":"off"}`
  error += ` <span style="color: red">The raspberry pi has lost control</span>`
  error += `<br>Error Message:<br>${e}`
  send_email(`Critical Error with Device ${env.DEVICE_ID}`, error)
})

gpio_write_error.set_on_error_always((name: string, pin: number, value: boolean, e: Error) => {
  logger.error("GPIO Failed to write state %s on pin %s with error %s", pin, value, e)
})


function set_heating_raw(value: boolean)
{
    rpio.write(parseInt(env.HEATING_CONTROL_PIN), value?rpio.HIGH:rpio.LOW);
    heating_on = value
}

function set_heating(value: boolean)
{
    if (heating_on === value) {return;}
    try {
      set_heating_raw(value)
    } catch(e) {
        gpio_write_error.refresh_error()
    }
}

export { gpio_setup, set_heating, set_heating_raw, gpio_write_error }