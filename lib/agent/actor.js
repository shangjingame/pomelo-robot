const util = require("util");
const vm = require("vm");
const EventEmitter = require("events").EventEmitter;
const monitor = require("../monitor/monitor");
const envConfig = require(process.cwd() + "/app/config/env.json");
const fs = require("fs");

class Actor extends EventEmitter {
  constructor(conf, aid) {
    super();

    EventEmitter.call(this);
    this.id = aid;
    this.script = conf.script || envConfig.script;
    this.conf = conf;

    if (this.conf.debuggable)
      this.script = 'require(process.cwd()+"' + this.script + '").main(actor);';
    else
      this.script =
        fs.readFileSync(process.cwd() + this.script, "utf8") +
        "\nexports.main(actor);";

    this.on("start", (action, reqId) => {
      monitor.beginTime(action, this.id, reqId);
    });
    this.on("end", (action, reqId) => {
      monitor.endTime(action, this.id, reqId);
    });
    this.on("incr", (action) => {
      monitor.incr(action);
    });
    this.on("decr", (action) => {
      monitor.decr(action);
    });
  }

  run() {
    try {
      let initSandbox = {
        console: console,
        require: require,
        actor: this,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
        global: global,
        process: process,
      };

      if (!this.conf.debuggable) initSandbox.exports = {};
      let context = vm.createContext(initSandbox);
      vm.runInContext(this.script, context);
    } catch (ex) {
      this.emit("error", ex.stack);
    }
  }

  /**
   * clear data
   *
   */
  reset() {
    monitor.clear();
  }

  /**
   * wrap setTimeout
   *
   *@param {Function} fn
   *@param {Number} time
   */
  later(fn, time) {
    if (time > 0 && typeof fn == "function") {
      return setTimeout(fn, time);
    }
  }

  /**
   * wrap setInterval
   * when time is Array, the interval time is thd random number
   * between then
   *
   *@param {Function} fn
   *@param {Number} time
   */
  interval(fn, time) {
    switch (typeof time) {
      case "number":
        if (arguments[1] > 0) return setInterval(fn, arguments[1]);
        break;
      case "object":
        let start = time[0], end = time[1];
        let time = Math.round(Math.random() * (end - start) + start);
        return setTimeout(() => {
          fn();
          this.interval(fn, time);
        }, time);
        break;
      default:
        this.log.error("wrong argument");
        return;
    }
  }

  /**
   *wrap clearTimeout
   *
   * @param {Number} timerId
   *
   */
  clean(timerId) {
    clearTimeout(timerId);
  }

  /**
   *encode message
   *
   * @param {Number} id
   * @param {Object} msg
   *
   */
}

exports.Actor = Actor;
