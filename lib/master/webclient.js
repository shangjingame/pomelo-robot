const __ = require("underscore");

class WebClient {
  // WebClient is an end-user using a browser
  constructor(socket, server) {
    this.log_server = server;
    this.socket = socket;
    this.id = socket.id;
    var wc = this;

    // Join web_clients room
    socket.join("web_clients");

    // Remove WebClient
    socket.on("disconnect", () => {
      __(wc.watching_logs).each((log_file) => {
        log_file.remove_web_client(wc);
      });
      socket.leave("web_clients");
    });
  }

  // Tell WebClient to add new Node
  add_node(node) {
    this.socket.emit("add_node", {
      nodeId: node.nodeId,
      iport: node.iport,
    });
  }

  // Tell WebClient to remove Node
  remove_node(node) {
    this.socket.emit("remove_node", {
      node: node.nodeId,
    });
  }
  error_node(node, error) {
    this.socket.emit("error", {
      node: node.iport,
      error: error,
    });
  }
}

module.exports = {
  WebClient: WebClient,
};
