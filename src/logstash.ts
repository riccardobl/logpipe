/**
 * Stores and retrieves logs
 */

import { toLogValue } from "./LogLevels";

export abstract class LogStash {
    private maxLogs: number = -1;
    private logListeners: Array<(log: Log, authKey?: string) => void> = [];
    private initialized?: Promise<boolean>;
    private readonly authWhitelist: string[];

    constructor(authWhitelist: string[]) {
        this.authWhitelist = authWhitelist;
    }

    private checkAuth(authKey?: string): boolean {
        if (this.authWhitelist.length === 0) return true;
        if (this.authWhitelist.includes("*")) return true;
        if (authKey && this.authWhitelist.includes(authKey)) return true;
        throw new Error("Unauthorized");
    }

    /**
     * Called when the stash is initialized
     */
    protected abstract onInitialize(): Promise<void>;

    /**
     * Called when logs are requested
     * @param filter
     */
    protected abstract onGet(filter: LogFilter, authKey?: string): Promise<Log[]>;

    /**
     * Called when a log is added
     * @param log - The log to add
     * @param maxLogs - The maximum number of logs to store
     * @returns The id of the added log
     */
    protected abstract onAdd(log: Log, maxLogs: number, authKey?: string): Promise<number>;

    /**
     * Set the maximum number of logs to store
     * @param maxLogs - The maximum number of logs to store
     */
    public setMaxLogs(maxLogs: number): void {
        this.maxLogs = maxLogs;
    }

    private async initialize() {
        if (this.initialized && (await this.initialized)) return;
        this.initialized = new Promise((resolve) => {
            this.onInitialize()
                .then(() => {
                    resolve(true);
                })
                .catch((err) => {
                    console.error(`Error initializing logstash: ${err}`);
                    resolve(false);
                });
        });
        await this.initialized;
    }

    /**
     * Add a log to the store
     * @param log - The log to add
     */
    public async addLog(log: Log, authKey?: string): Promise<Log> {
        await this.checkAuth(authKey);
        await this.initialize();
        const id = await this.onAdd(log, this.maxLogs, authKey);
        const newLog = Log.from({ ...log.toJSON(), id });
        this.logListeners.forEach((listener) => listener(newLog, authKey));
        return newLog;
    }

    /**
     * Get stored logs based on the filter
     * @param filter - The filter to apply
     */
    public async get(filter: LogFilter, authKey?: string): Promise<Log[]> {
        await this.checkAuth(authKey);
        await this.initialize();
        return this.onGet(filter, authKey);
    }

    private addLogListener(listener: (log: Log, authKey?: string) => void): void {
        this.logListeners.push(listener);
    }

    private removeLogListener(listener: (log: Log, authKey?: string) => void): void {
        this.logListeners = this.logListeners.filter((l) => l !== listener);
    }

    /**
     * Get stored logs as a stream
     * @param filter - The filter to apply
     */
    public async getAsStream(filter: LogFilter, authKey?: string): Promise<{ stream: AsyncGenerator<Log>; close: () => void }> {
        await this.checkAuth(authKey);
        await this.initialize();
        let closed = false;
        const queue: Log[] = [];
        let monitor: any = () => {};

        const listener = (log: Log, _authKey?: string) => {
            if (closed) return;
            if (authKey !== _authKey) return;
            queue.push(log);
            monitor();
        };

        this.addLogListener(listener);

        const close = () => {
            this.removeLogListener(listener);
            closed = true;
        };

        const isFilterMatch = (log: Log, filter: LogFilter): boolean => {
            if (filter.tags?.length && !filter.tags.some((tag) => log.tags.includes(tag))) {
                return false;
            }
            if (filter.from && log.createdAt < filter.from) {
                return false;
            }
            if (filter.to && log.createdAt > filter.to) {
                return false;
            }
            if (filter.afterId && (log.id == null || log.id <= filter.afterId)) {
                return false;
            }
            if (filter.level && toLogValue(log.level) > toLogValue(filter.level)) {
                return false;
            }
            return true;
        };

        const history = await this.get(filter, authKey);

        const stream = async function* () {
            for (const log of history) {
                yield log;
            }

            while (!closed) {
                if (!queue.length) {
                    await new Promise((resolve) => (monitor = resolve));
                }
                const log = queue.shift();
                if (log && isFilterMatch(log, filter)) {
                    yield log;
                }
            }
        };

        return { stream: stream(), close };
    }
}

export type LogFilter = {
    tags?: string[];
    from?: Date;
    to?: Date;
    limit?: number;
    afterId?: number;
    level?: string;
};

export class Log {
    public readonly logger: string;
    public readonly level: string;
    public readonly message: string;
    public readonly createdAt: Date;
    public readonly tags: string[];
    public readonly id?: number;

    constructor(logger: string, level: string, message: string, createdAt: Date, tags: string[], id?: number) {
        this.logger = logger;
        this.level = level;
        this.message = message;
        this.createdAt = createdAt;
        this.tags = tags;
        this.id = id;
    }

    toJSON() {
        return {
            logger: this.logger,
            level: this.level,
            message: this.message,
            createdAt: this.createdAt,
            tags: this.tags,
            id: this.id,
        };
    }

    static from(data: any) {
        const logger = String(data.logger);
        const level = String(data.level);
        const message = String(data.message);

        let createdAt = data.createdAt;
        if (typeof createdAt === "number") {
            if (createdAt > 10000000000) {
                createdAt = new Date(createdAt);
            } else {
                createdAt = new Date(createdAt * 1000);
            }
        } else {
            createdAt = new Date(createdAt || 0);
        }

        const tags = Array.isArray(data.tags) ? data.tags.map((tag: any) => String(tag)) : [String(data.tags)];
        const id = data.id;
        if (!logger) throw new Error("missing required field: logger");
        if (!level) throw new Error("missing required field: level");
        if (!message) throw new Error("missing required field: message");
        if (!createdAt) throw new Error("missing required field: createdAt");
        if (!tags) throw new Error("missing required field: tags");

        return new Log(logger, level, message, createdAt, tags, id);
    }
}
