import rpio from "rpio";
rpio.open(11, rpio.OUTPUT, rpio.LOW);
setInterval(() => {
  rpio.write(11, rpio.HIGH);
  setTimeout(() => rpio.write(11, rpio.LOW), 500);
}, 1000);