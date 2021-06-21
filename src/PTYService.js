// PTYService.js

const os = require("os");
const pty = require("node-pty");


class PTY {
  constructor(socket, user, ip) {
    // Setting default terminals based on user os
    this.shell = os.platform() === "win32" ? "powershell.exe" : "bash";
    this.ptyProcess = null;
    this.socket = socket;
    this.user = user;
    this.ip = ip;
    // Initialize PTY process.
    this.startPtyProcess(user, ip);
  }

  /**
   * Spawn an instance of pty with a selected shell.
   */
  startPtyProcess(user, ip) {
    this.ptyProcess = pty.spawn("ssh", [`${ip}`], {
      name: "xterm-color",
      cwd: process.env.HOME, // Which path should terminal start
      env: process.env, // Pass environment variables
    });

    // Add a "data" event listener.
    this.ptyProcess.on("data", (data) => {
      // Whenever terminal generates any data, send that output to socket.io client
      this.sendToClient(data);
    });
  }

  /**
   * Use this function to send in the input to Pseudo Terminal process.
   * @param {*} data Input from user like a command sent from terminal UI
   */

  write(data) {
    this.ptyProcess.write(data);
  }

  sendToClient(data) {
    // Emit data to socket.io client in an event "output"
    this.socket.emit("output", data);
  }
}

module.exports = PTY;