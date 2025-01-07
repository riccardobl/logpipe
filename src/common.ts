import { PostgresStash } from "./stash/postgres.js";
import { SQLiteStash } from "./stash/sqlite.js";
import { LogFilter, LogStash } from "./logstash.js";
import Os from "os";

/**
 * Parse request properties to something meaningful
 * @param searchParams
 * @returns
 */
export function getRequestProps(searchParams: any): LogFilter & {
    format: string;
    authKey?: string;
} {
    try {
        const out = {} as any;

        const tags: string[] = [];
        if (searchParams.filter) {
            if (searchParams.filter !== "*") {
                tags.push(...searchParams.filter.toString().split(","));
            }
        }
        out.tags = tags;

        if (searchParams.format) {
            out.format = searchParams.format.toString();
        }
        if (searchParams.from) {
            out.from = new Date(!isNaN(searchParams.from as any) ? parseInt(String(searchParams.from)) : String(searchParams.from));
        }

        if (searchParams.to) {
            out.to = new Date(!isNaN(searchParams.to as any) ? parseInt(String(searchParams.to)) : String(searchParams.to));
        }

        if (searchParams.limit) {
            out.limit = parseInt(String(searchParams.limit));
        }

        if (searchParams.authKey) {
            out.authKey = searchParams.authKey;
        }

        if (searchParams.afterId) {
            out.afterId = parseInt(String(searchParams.afterId));
        }

        if (searchParams.level) {
            out.level = searchParams.level.toUpperCase();
        }

        return out;
    } catch (err) {
        console.error(`Error parsing request properties: ${err}`);
        return {} as any;
    }
}

export class Notice {
    public message: string;
    constructor(message: string) {
        this.message = message;
    }

    toJSON() {
        return {
            message: this.message,
        };
    }
}

/**
 * Return a configured LogStash for the given url
 * @param url
 * @returns
 */
export function getStashByUrl(url?: string, config?: any): LogStash {
    if (!url) {
        const tmpDir = Os.tmpdir();
        url = `sqlite://${tmpDir}/logpipe_rl2.sqlite`;
        console.log(`No database URL provided, using ${url}`);
    }

    if (url.startsWith("postgresql://")) {
        const tableName = config?.tableName ?? "logpipe_rl2";
        return new PostgresStash(url, tableName, config.authWhitelist || []);
    }

    if (url.startsWith("sqlite://")) {
        const tableName = config?.tableName ?? "logpipe_rl2";
        return new SQLiteStash(url.substring("sqlite://".length), tableName, config.authWhitelist || []);
    }

    // TODO: Add support for other databases
    throw new Error("Unsupported database URL");
}
