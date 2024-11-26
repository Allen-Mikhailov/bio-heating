import path from "path";
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from "fs";

import { parse, config } from 'dotenv';
const env_path = path.dirname(fileURLToPath(import.meta.url))+"/.env"
config({path: env_path})

function get_env()
{
    return parse(readFileSync(env_path).toString())
}

function write_env(env_object)
{
    const envContent = Object.entries(env_object).map(([key, value]) => `${key}=${value}`).join('\n');
    writeFileSync(env_path, envContent)
}

export { get_env, write_env }