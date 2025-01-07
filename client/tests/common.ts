import { Logger, LogLevel, ConsoleLogAttachment, JSONLogAttachment } from "../ts/logger.js";
const isBrowser = typeof window !== "undefined";

const globalLoggerTags: { [key: string]: string } = {};

export function setGlobalLoggerTag(key: string, value: string) {
    if (value === undefined || value === null) {
        delete globalLoggerTags[key];
    } else {
        globalLoggerTags[key] = value;
    }
}

export function getLogger(name: string = "default", tags: string[] = [], level?: string) {
    let httpEndpoint = "http://127.0.0.1:7068/write";
    let env = "production";

    // load environment variables when possible
    if (typeof process !== "undefined") {
        env = process.env.NODE_ENV || env;
        httpEndpoint = process.env.SN_LOG_HTTP_ENDPOINT || httpEndpoint;
        level = level ?? process.env.SN_LOG_LEVEL;
    }

    level = level ?? (env === "development" ? "TRACE" : "INFO");

    if (!isBrowser) {
        tags.push("backend");
    } else {
        tags.push("frontend");
    }

    console.log("Create logger with level", level, "env", env, "tags", tags, "global tags", globalLoggerTags);
    const logger = new Logger(name, LogLevel[level as keyof typeof LogLevel], tags, globalLoggerTags);

    if (env === "development") {
        logger.addAttachment(new ConsoleLogAttachment());
        console.log("use http endpoint", httpEndpoint);
        logger.addAttachment(new JSONLogAttachment(httpEndpoint));
    } else {
        logger.addAttachment(new ConsoleLogAttachment());
    }
    return logger;
}
