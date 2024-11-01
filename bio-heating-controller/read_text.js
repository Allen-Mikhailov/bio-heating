import { readFileSync, readdirSync } from 'fs';
// import { db } from './firebase.js';

// Getting File path
const devices_path = "/sys/bus/w1/devices/w1_bus_master1/"

const files = readdirSync(devices_path, { withFileTypes: true })
const valid_dirents = []
files.map(dirent => {
    dirent.p
    if (dirent.isDirectory() && dirent.name.startsWith("28"))
        valid_dirents.push(dirent)
})

console.log(valid_dirents)

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

while (true)
{
    console.log("Reading Files:")
    valid_dirents.map((dirent) => {
        const data = readFileSync(devices_path+dirent.name+"/temperature", "utf-8")
        console.log("Temperature:")
        console.log(data)
    })
    await sleep(1000)
}