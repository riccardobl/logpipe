import { Client, QueryResult } from "pg";
import { Log, LogFilter, LogStash } from "../logstash.js";
import { toLogValue } from "../LogLevels.js";
export class PostgresStash extends LogStash {
    private readonly client: Client;
    private readonly tableName: string;

    constructor(url: string, table: string, authWhitelist: string[]) {
        super(authWhitelist);
        this.tableName = table;
        this.client = new Client({
            connectionString: url,
        });
    }

    protected override async onInitialize(): Promise<void> {
        await this.client.connect();
        await this.client.query(`
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id SERIAL PRIMARY KEY,
                logger TEXT NOT NULL,
                level TEXT NOT NULL,
                levelValue INTEGER NOT NULL,
                message TEXT NOT NULL,
                authKey TEXT DEFAULT 'default',
                tags TEXT[],
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );             
        `);
    }

    protected override async onAdd(log: Log, maxLogs: number, authKey?: string): Promise<number> {
        if (maxLogs > 0) {
            const logCount = await this.client.query(`SELECT COUNT(*) FROM ${this.tableName} WHERE logger = $1 AND authKey = $2`, [log.logger, authKey || "public"]);
            const numLogsToDelete = logCount.rows[0].count + 1 - maxLogs;
            if (numLogsToDelete > 0) {
                await this.client.query(
                    `
                    DELETE FROM ${this.tableName}
                    WHERE id IN (
                        SELECT id
                        FROM ${this.tableName}
                        WHERE logger = $1
                        AND authKey = $2
                        ORDER BY createdAt ASC
                        LIMIT $3
                    )
                `,
                    [log.logger, authKey || "public", numLogsToDelete],
                );
            }
        }
        const result: QueryResult = await this.client.query(
            `
            INSERT INTO ${this.tableName} (logger, message, tags, createdAt, level, levelValue, authKey)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `,
            [log.logger, log.message, log.tags, log.createdAt.toISOString(), log.level.toUpperCase(), toLogValue(log.level), authKey || "public"],
        );
        return result.rows[0].id;
    }

    protected override async onGet({ tags, from, to, limit = 1000, afterId = 0, level = "" }: LogFilter, authKey?: string): Promise<Log[]> {
        const conditions = [];
        const values = [];

        if (tags?.length) {
            conditions.push(`tags && $${conditions.length + 1}`);
            values.push(tags);
        }

        if (from) {
            conditions.push(`createdAt >= $${conditions.length + 1}`);
            values.push(from);
        }

        if (to) {
            conditions.push(`createdAt <= $${conditions.length + 1}`);
            values.push(to);
        }

        if (afterId) {
            conditions.push(`id > $${conditions.length + 1}`);
            values.push(afterId);
        }

        if (level) {
            const levelNum = toLogValue(level);
            const levelName = level.toUpperCase();
            conditions.push(`(level = $${conditions.length + 1} OR levelValue <= $${conditions.length + 2})`);
            values.push(levelName);
            values.push(levelNum);
        }

        conditions.push(`authKey = $${conditions.length + 1}`);
        values.push(authKey || "public");

        const query = `
            SELECT * FROM ${this.tableName}
            ${conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : ""}
            ORDER BY createdAt DESC
            LIMIT $${conditions.length + 1}
        `;
        values.push(limit);

        const result = await this.client.query(query, values);

        return result.rows
            .map((row) => {
                return Log.from(row);
            })
            .reverse();
    }
}
