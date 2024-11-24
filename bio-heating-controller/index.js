import {spawn} from "child_process"

const child = spawn('sudo /home/bioheating/.nvm/versions/node/v23.3.0/bin/node  /home/bioheating/bioheating/bio-heating-controller/rpio.js');

setInterval(() => {
    console.log("its probably doing something")
}, 3000)

child.stdout.on('data', (data) => {
    console.log(`child stdout:\n${data}`);
  });
  
child.stderr.on('data', (data) => {
console.error(`child stderr:\n${data}`);
});

child.on("error", (e) => {
    console.error(e)
})