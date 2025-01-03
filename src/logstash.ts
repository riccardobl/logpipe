/**
 * Stores and retrieves logs
 */

export interface LogStash {
    /**
     * Add a log to the store
     * @param log - The log to add
     */
    addLog(log: Log): Promise<void>;
    /**
     * Get stored logs based on the filter
     * @param filter - The filter to apply
     */
    get(filter: LogFilter): Promise<Log[]>;
    /**
     * Get stored logs as a stream
     * @param filter - The filter to apply
     */
    getAsStream(filter: LogFilter): Promise<{ stream: AsyncGenerator<Log>, close: () => void }>;
    /**
     * Set the maximum number of logs to store
     * @param maxLogs - The maximum number of logs to store
     */
    setMaxLogs(maxLogs: number): void;
}


export type LogFilter = { 
    tags?: string[], 
    from?: Date, 
    to?: Date, 
    limit?: number, 
    afterId?:number
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
            id: this.id
        }
    }

    static from(data: any) {
        const logger = String(data.logger);
        const level = String(data.level);
        const message = String(data.message);
        const createdAt = new Date(data.createdAt || 0);
        const tags = Array.isArray(data.tags) ? data.tags.map((tag: any) => String(tag)) : [String(data.tags)];
        const id = data.id;
        if(!logger) throw new Error('missing required field: logger');
        if(!level) throw new Error('missing required field: level');
        if(!message) throw new Error('missing required field: message');
        if(!createdAt) throw new Error('missing required field: createdAt');
        if(!tags) throw new Error('missing required field: tags');
        
        return new Log(logger, level, message, createdAt, tags, id);
    }

}

