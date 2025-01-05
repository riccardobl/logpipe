import { TypeFormatter } from "../formatter.js";
import { Log } from "../logstash.js";
import { Notice } from "../common.js";
import chalk from "chalk";

const colors: { [key: string]: (value: string) => string } = {
    info: (value: string) => chalk.blue(value),
    warn: (value: string) => chalk.yellow(value),
    error: (value: string) => chalk.red(value),
    trace: (value: string) => chalk.gray(value),
    debug: (value: string) => chalk.gray(value),
    log: (value: string) => chalk.white(value),

    boldinfo: (value: string) => chalk.blue.bold(value),
    boldwarn: (value: string) => chalk.yellow.bold(value),
    bolderror: (value: string) => chalk.red.bold(value),
    boldtrace: (value: string) => chalk.gray.bold(value),
    bolddebug: (value: string) => chalk.gray.bold(value),
    boldlog: (value: string) => chalk.white.bold(value),

    logger: (value: string) => chalk.blue.dim(value),
    notice: (value: string) => chalk.green.dim(value),
    noise: (value: string) => chalk.white.dim(value),
};

export default function (withColors: boolean, debug: boolean): Array<TypeFormatter> {
    const consolify = (value: string, tags: string[]) => {
        if (!withColors) return value;
        let colorizer: ((value: string) => string) | undefined = undefined;
        for (let tag of tags) {
            tag = tag.toLowerCase();
            if (colors[tag]) {
                colorizer = colors[tag];
                break;
            }
        }
        if (!colorizer) colorizer = colors.log;
        return colorizer(value);
    };
    return [
        {
            name: "console error formatter",
            checker: (value) => typeof value === "object" && value instanceof Error,
            formatter: (value) => {
                return {
                    formattedValue: consolify("Error: " + String(value.message || (debug ? value : "error")), ["error"]),
                    mimeType: "text/plain",
                };
            },
        },
        {
            name: "console log formatter",
            checker: (value) => {
                if (typeof value !== "object") return false;
                if (Array.isArray(value) && value.every((v) => typeof v === "object" && v instanceof Log)) return true;
                if (value instanceof Log) return true;
                return false;
            },
            formatter: (value) => {
                const logs: Array<Log> = !Array.isArray(value) ? [value] : value;
                let formattedValue = "";
                for (const log of logs) {
                    const colorTags = [...log.tags, log.level];

                    let line = "";
                    {
                        const year = log.createdAt.getFullYear();
                        const month = ("0" + (log.createdAt.getMonth() + 1)).slice(-2);
                        const day = ("0" + log.createdAt.getDate()).slice(-2);
                        const hour = ("0" + log.createdAt.getHours()).slice(-2);
                        const minute = ("0" + log.createdAt.getMinutes()).slice(-2);
                        const second = ("0" + log.createdAt.getSeconds()).slice(-2);
                        line += consolify(`[${year}-${month}-${day} ${hour}:${minute}:${second}] `, ["noise"]);
                    }
                    line += consolify(`[${log.logger}] `, ["logger"]);
                    line += consolify(`[${log.level.toUpperCase()}] `, ["bold" + log.level, log.level]);
                    line += consolify(`${log.message} `, colorTags);
                    line += consolify(log.tags.join(","), ["noise"]);

                    if (formattedValue) formattedValue += "\n";
                    formattedValue += line;
                }
                return {
                    formattedValue,
                    mimeType: "text/plain",
                };
            },
        },
        {
            name: "console notice formatter",
            checker: (value) => {
                if (typeof value !== "object") return false;
                if (value instanceof Notice) return true;
                return false;
            },
            formatter: (value) => {
                return {
                    formattedValue: consolify(value.message, ["notice"]),
                    mimeType: "text/plain",
                };
            },
        },
        {
            name: "console generic formatter",
            formatter: (value) => {
                return {
                    formattedValue: consolify(JSON.stringify(value), ["log"]),
                    mimeType: "text/plain",
                };
            },
        },
    ];
}
