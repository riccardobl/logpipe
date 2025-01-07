import { getLogger } from "./common.js";
function trace() {
    process.env.NODE_ENV = "development";
    const logger = getLogger("traceLogger", ["test", "trace"], "TRACE");
    logger.trace("visible");
    logger.debug("visible");
    logger.info("visible");
    logger.warn("visible");
    logger.error("visible");
    logger.fatal("visible");
    logger.traceLazy(() => "lazy visible");
    logger.debugLazy(() => "lazy visible");
    logger.infoLazy(() => "lazy visible");
    logger.warnLazy(() => "lazy visible");
    logger.errorLazy(() => "lazy visible");
    logger.fatalLazy(() => "lazy visible");
}

function debug() {
    process.env.NODE_ENV = "development";
    const logger = getLogger("debugLogger", ["test", "debug"], "DEBUG");
    logger.trace("invisible");
    logger.debug("visible");
    logger.info("visible");
    logger.warn("visible");
    logger.error("visible");
    logger.fatal("visible");
    logger.traceLazy(() => "lazy invisible");
    logger.debugLazy(() => "lazy visible");
    logger.infoLazy(() => "lazy visible");
    logger.warnLazy(() => "lazy visible");
    logger.errorLazy(() => "lazy visible");
    logger.fatalLazy(() => "lazy visible");
}

function info() {
    process.env.NODE_ENV = "development";
    const logger = getLogger("infoLogger", ["test", "info"], "INFO");
    logger.trace("invisible");
    logger.debug("invisible");
    logger.info("visible");
    logger.warn("visible");
    logger.error("visible");
    logger.fatal("visible");
    logger.traceLazy(() => "lazy invisible");
    logger.debugLazy(() => "lazy invisible");
    logger.infoLazy(() => "lazy visible");
    logger.warnLazy(() => "lazy visible");
    logger.errorLazy(() => "lazy visible");
    logger.fatalLazy(() => "lazy visible");
}

function warn() {
    process.env.NODE_ENV = "development";
    const logger = getLogger("warnLogger", ["test", "warn"], "WARN");
    logger.trace("invisible");
    logger.debug("invisible");
    logger.info("invisible");
    logger.warn("visible");
    logger.error("visible");
    logger.fatal("visible");
    logger.traceLazy(() => "lazy invisible");
    logger.debugLazy(() => "lazy invisible");
    logger.infoLazy(() => "lazy invisible");
    logger.warnLazy(() => "lazy visible");
    logger.errorLazy(() => "lazy visible");
    logger.fatalLazy(() => "lazy visible");
}

function error() {
    process.env.NODE_ENV = "development";
    const logger = getLogger("errorLogger", ["test", "error"], "ERROR");
    logger.trace("invisible");
    logger.debug("invisible");
    logger.info("invisible");
    logger.warn("invisible");
    logger.error("visible");
    logger.fatal("visible");
    logger.traceLazy(() => "lazy invisible");
    logger.debugLazy(() => "lazy invisible");
    logger.infoLazy(() => "lazy invisible");
    logger.warnLazy(() => "lazy invisible");
    logger.errorLazy(() => "lazy visible");
    logger.fatalLazy(() => "lazy visible");
}

function fatal() {
    process.env.NODE_ENV = "development";
    const logger = getLogger("fatalLogger", ["test", "fatal"], "FATAL");
    logger.trace("invisible");
    logger.debug("invisible");
    logger.info("invisible");
    logger.warn("invisible");
    logger.error("invisible");
    logger.fatal("visible");
    logger.traceLazy(() => "lazy invisible");
    logger.debugLazy(() => "lazy invisible");
    logger.infoLazy(() => "lazy invisible");
    logger.warnLazy(() => "lazy invisible");
    logger.errorLazy(() => "lazy invisible");
    logger.fatalLazy(() => "lazy visible");
}

function veryLazy() {
    process.env.NODE_ENV = "development";
    const logger = getLogger("veryLazyLogger", ["test", "veryLazy"], "TRACE");
    logger.traceLazy(async () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve("very lazy visible");
            }, 1000);
        });
    });
}

function inspectObject() {
    process.env.NODE_ENV = "development";
    const logger = getLogger("inspectLogger", ["test", "inspectObject"], "TRACE");
    logger.trace({ a: 1, b: 2 });
}

function group() {
    process.env.NODE_ENV = "development";
    const logger = getLogger("groupLogger", ["test"], "TRACE");
    logger.group("group1");
    logger.trace("a1");
    logger.debug("b2");
    logger.groupEnd();
    logger.trace("a2");
}

function fork() {
    process.env.NODE_ENV = "development";
    const logger = getLogger("forkLogger", ["test"], "TRACE");
    const fork = logger.fork("fork1");
    fork.trace("a1");
    fork.debug("b2");
    fork.trace("a2");
    logger.trace("a3");
}

trace();
debug();
info();
warn();
error();
fatal();
veryLazy();
inspectObject();
group();
fork();
