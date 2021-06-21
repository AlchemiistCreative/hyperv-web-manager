// index.js

import { TerminalUI } from "./TerminalUI";
import io from "socket.io-client";

// IMPORTANT: Make sure you replace this address with your server address.

const serverAddress = "http://10.0.0.113:8080";

function connectToSocket(serverAddress) {
  return new Promise((res) => {
    const socket = io(serverAddress);
    res(socket);
  });
}

function startTerminal(container, socket) {
  // Create an xterm.js instance.
  const terminal = new TerminalUI(socket);

  // Attach created terminal to a DOM element.
  terminal.attachTo(container);

  // When terminal attached to DOM, start listening for input, output events.
  // Check TerminalUI startListening() function for details.
  terminal.startListening();
}

function start() {
  const container = document.getElementById("terminal-container");
  // Connect to socket and when it is available, start terminal.
  connectToSocket(serverAddress).then((socket) => {
    startTerminal(container, socket);
  });
}

// Better to start on DOMContentLoaded. So, we know terminal-container is loaded
start();