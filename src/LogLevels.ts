export enum LogLevels {
    TRACE = 600,
    DEBUG = 500,
    INFO = 400,
    WARN = 300,
    ERROR = 200,
    FATAL = 100,
    OFF = 0,
}

export function toLogValue(level: string): number {
    if (typeof level === "number") return level;
    if (typeof level !== "string") return LogLevels.DEBUG;
    level = level.toUpperCase();
    if (!(level in LogLevels)) return LogLevels.DEBUG;
    return LogLevels[level as keyof typeof LogLevels];
}

export default LogLevels;
