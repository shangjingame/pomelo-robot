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

    var self = this;
    self.on("start", function (action, reqId) {
      monitor.beginTime(action, self.id, reqId);
    });
    self.on("end", function (action, reqId) {
      monitor.endTime(action, self.id, reqId);
    });
    self.on("incr", function (action) {
      monitor.incr(action);
    });
    self.on("decr", function (action) {
      monitor.decr(action);
    });
  }

  run() {
    try {
      var initSandbox = {
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
      var context = vm.createContext(initSandbox);
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
    var fn = arguments[0];
    var self = this;
    switch (typeof time) {
      case "number":
        if (arguments[1] > 0) return setInterval(fn, arguments[1]);
        break;
      case "object":
        var start = time[0],
          end = time[1];
        var time = Math.round(Math.random() * (end - start) + start);
        return setTimeout(function () {
          fn(), self.interval(fn, time);
        }, time);
        break;
      default:
        self.log.error("wrong argument");
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
