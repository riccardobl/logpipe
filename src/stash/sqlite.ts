import sqlite3 from "sqlite3";
import { Log, LogFilter, LogStash } from "../logstash.js";
import { toLogValue } from "../LogLevels.js";
export class SQLiteStash extends LogStash {
    private readonly db: sqlite3.Database;
    private readonly tableName: string;

    constructor(filePath: string, table: string, authWhitelist: string[]) {
        super(authWhitelist);
        this.tableName = table;
        this.db = new sqlite3.Database(filePath, (err) => {
            if (err) {
                console.error(`Error opening SQLite database: ${err.message}`);
                throw err;
            }
        });
    }

    protected override async onInitialize(): Promise<void> {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                logger TEXT NOT NULL,
                level TEXT NOT NULL,
                levelValue INTEGER NOT NULL,
                message TEXT NOT NULL,
                authKey TEXT DEFAULT 'default',
                tags TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await new Promise<void>((resolve, reject) => {
            this.db.run(createTableQuery, (err) => {
                if (err) {
                    console.error(`Error initializing database schema: ${err.message}`);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    protected override async onAdd(log: Log, maxLogs: number, authKey?: string): Promise<number> {
        if (maxLogs > 0) {
            const deleteLogsQuery = `
                DELETE FROM ${this.tableName}
                WHERE id IN (
                    SELECT id FROM ${this.tableName}
                    WHERE logger = ? AND authKey = ?
                    ORDER BY createdAt ASC
                    LIMIT ?
                );
            `;

            const countQuery = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE logger = ? AND authKey = ?;`;

            const logCount: number = await new Promise((resolve, reject) => {
                this.db.get(countQuery, [log.logger, authKey || "public"], (err, row: { count: number }) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row?.count || 0);
                    }
                });
            });

            const numLogsToDelete = logCount + 1 - maxLogs;

            if (numLogsToDelete > 0) {
                await new Promise<void>((resolve, reject) => {
                    this.db.run(deleteLogsQuery, [log.logger, numLogsToDelete, authKey || "public"], (err) => {
                        if (err) {
                            console.error(`Error deleting logs: ${err.message}`);
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            }
        }

        const insertLogQuery = `
            INSERT INTO ${this.tableName} (logger, level, levelValue, message, tags, createdAt, authKey)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        `;

        const id: number = await new Promise<number>((resolve, reject) => {
            this.db.run(
                insertLogQuery,
                [log.logger, log.level.toUpperCase(), toLogValue(log.level), log.message, JSON.stringify(log.tags), log.createdAt.toISOString(), authKey || "public"],
                function (err) {
                    if (err) {
                        console.error(`Error inserting log: ${err.message}`);
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                },
            );
        });

        return id;
    }

    protected override async onGet(filter: LogFilter, authKey?: string): Promise<Log[]> {
        const conditions: string[] = [];
        const values: any[] = [];
        if (filter.tags?.length) {
            const tagConditions = [];
            for(const tag of filter.tags) {
                tagConditions.push(`EXISTS (SELECT 1 FROM json_each(tags) WHERE json_each.value = ?)`);
                values.push(tag);
            }
            conditions.push(`(${tagConditions.join(" OR ")})`);
        }

        if (filter.from) {
            conditions.push(`createdAt >= ?`);
            values.push(filter.from);
        }

        if (filter.to) {
            conditions.push(`createdAt <= ?`);
            values.push(filter.to);
        }

        if (filter.afterId) {
            conditions.push(`id > ?`);
            values.push(filter.afterId);
        }

        if (filter.level) {
            const levelNum = toLogValue(filter.level);
            const levelName = filter.level.toUpperCase();
            conditions.push(`(level = ? OR levelValue <= ?)`);
            values.push(levelName);
            values.push(levelNum);
        }

        conditions.push(`authKey = ?`);
        values.push(authKey || "public");

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const limitClause = `LIMIT ?`;
        const query = `
            SELECT * FROM ${this.tableName}
            ${whereClause}
            ORDER BY createdAt DESC
            ${limitClause};
        `;
        values.push(filter.limit || 1000);

        return new Promise<Log[]>((resolve, reject) => {
            this.db.all(query, values, (err, rows) => {
                if (err) {
                    console.error(`Error querying logs: ${err.message}`);
                    reject(err);
                } else {
                    const logs = rows.map((row: any) => Log.from({ ...row, tags: JSON.parse(row.tags || "[]") }));
                    resolve(logs.reverse());
                }
            });
        });
    }
}
