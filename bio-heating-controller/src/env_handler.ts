import path from "path";
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from "fs";

import { parse, config } from 'dotenv';
const main_dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const env_path = path.resolve(main_dir, ".env")
config({path: env_path})

function get_env()
{
    return parse(readFileSync(env_path).toString())
}

let env = get_env()
const env_updates: {[key: string]: (new_env: {}) => void} = {}

type string_dict = {[key: string]: any}


function connect_to_env_update(name: string, callback: (new_env: string_dict) => void)
{
    env_updates[name] = callback
    callback(env)
}

function env_update()
{
    Object.keys(env_updates).map(update_name => {
        env_updates[update_name](env)
    })
}

function shallow_overwrite(obj: string_dict, properties: string_dict)
{
    Object.keys(obj).map(property => {
        if (!(property in properties))
            delete obj[property]
    })
}

function write_env(env_object: {})
{
    const envContent = Object.entries(env_object).map(([key, value]) => `${key}=${value}`).join('\n');
    writeFileSync(env_path, envContent)
    shallow_overwrite(env, env_object)
    env_update()
}

env = get_env()

export { env, write_env, connect_to_env_update, env_update, get_env, main_dir }