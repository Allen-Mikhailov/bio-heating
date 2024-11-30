import path from "path";
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from "fs";

import { parse, config } from 'dotenv';
const env_path = path.dirname(fileURLToPath(import.meta.url))+"/.env"
config({path: env_path})

let current_env = {}
const env_updates = {}

function get_env()
{
    return parse(readFileSync(env_path).toString())
}

function connect_to_env_update(name, callback)
{
    env_updates[name] = callback
}

function env_update()
{
    Object.keys(env_updates).map(update_name => {
        env_updates[update_name](current_env)
    })
}

function write_env(env_object)
{
    const envContent = Object.entries(env_object).map(([key, value]) => `${key}=${value}`).join('\n');
    writeFileSync(env_path, envContent)
    env_update()
}

current_env = get_env()

export { get_env, write_env, connect_to_env_update }