const Agent = require("./agent/agent").Agent;
const Server = require("./master/server").Server;
const HTTP_SERVER = require("./console/http").HTTP_SERVER;
const util = require("./common/util").createPath();

class Robot {
  /**
   * export to developer prototype
   *
   * @param {Object} config
   * include deal with master and agent mode
   *
   * param include mode
   *
   */
  constructor(config) {
    this.conf = config;
    this.master = null;
    this.agent = null;
  }

  /*
   * run master server
   *
   * @param {String} start up file
   *
   */
  runMaster(mainFile) {
    let conf = {}, master;
    conf.clients = this.conf.clients;
    conf.mainFile = mainFile;
    this.master = new Server(conf);
    this.master.listen(this.conf.master.port);
    HTTP_SERVER.start(this.conf.master.webport);
  }

  /**
   * run agent client
   *
   * @param {String} script
   *
   */
  runAgent(scriptFile, debuggable) {
    const conf = {};
    conf.master = this.conf.master;
    conf.apps = this.conf.apps;
    conf.debuggable = debuggable;
    conf.scriptFile = scriptFile;
    this.agent = new Agent(conf);
    this.agent.start();
  }

  restart() {
    if (this.agent != null) {
      this.agent.reconnect(true);
    }
  }
}

exports.Robot = Robot;
