import { Client, QueryResult } from 'pg';
import {Log, LogFilter, LogStash} from '../logstash.js'


export class PostgresStash extends LogStash {
    private readonly client: Client;
    private readonly tableName: string;
    private initialized?: Promise<boolean>;
   
    constructor( 
        url: string, 
        table: string,
    ) {
        super();
        this.tableName = table;
        this.client = new Client({
            connectionString: url,
        });
    }


    private async initialize(): Promise<void> {
        if(this.initialized && await this.initialized) return;
        this.initialized = new Promise(async (resolve, reject) => {
            try {
                await this.client.connect();
                console.log('Connected to PostgreSQL database.');

                await this.client.query(`
                    CREATE TABLE IF NOT EXISTS ${this.tableName} (
                        id SERIAL PRIMARY KEY,
                        logger TEXT NOT NULL,
                        level TEXT NOT NULL,
                        message TEXT NOT NULL,
                        tags TEXT[],
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );             
                `);

                console.log('Database schema initialized.');
                this.client.query(`LISTEN ${this.tableName}`);
                resolve(true);
            } catch (err) {
                console.error(`Error initializing database: ${err}`);
                resolve(false);
            }
        });
        await this.initialized;       
    }

  
    public async addLog(log: Log): Promise<void> {
        await this.initialize();
        try {
            if(this.getMaxLogs() > 0){
                const logCount = await this.client.query(`SELECT COUNT(*) FROM ${this.tableName} WHERE logger = $1`, [log.logger]);
                const numLogsToDelete = (logCount.rows[0].count + 1) - this.getMaxLogs();
                if(numLogsToDelete > 0) {
                    console.log(`Deleting ${numLogsToDelete} logs for logger ${log.logger}`);
                    await this.client.query(`
                        DELETE FROM ${this.tableName}
                        WHERE id IN (
                            SELECT id
                            FROM ${this.tableName}
                            WHERE logger = $1
                            ORDER BY created_at ASC
                            LIMIT $2
                        )
                    `, [log.logger, numLogsToDelete]);
                }
            }
     
            const result: QueryResult = await this.client.query( `
                INSERT INTO ${this.tableName} (logger, message, tags, created_at, level)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `, [
                log.logger,
                log.message,
                log.tags,
                log.createdAt,
                log.level
            ]);

            this.onLog(Log.from({...log.toJSON(), id: result.rows[0].id}));
        } catch (err) {
            console.error(`Error inserting log: ${err}`, log);
            throw err;
        }

        
    }

    public async get({ tags, from, to, limit = 1000, afterId = 0 }: LogFilter): Promise<Log[]> {
        await this.initialize();
        const conditions = [];
        const values = [];

        if (tags?.length) {
            conditions.push(`tags && $${conditions.length + 1}`);
            values.push(tags);
        }

        if (from) {
            conditions.push(`created_at >= $${conditions.length + 1}`);
            values.push(from);
        }

        if (to) {
            conditions.push(`created_at <= $${conditions.length + 1}`);
            values.push(to);
        }

        if(afterId){
            conditions.push(`id > $${conditions.length + 1}`);
            values.push(afterId);
        }


         const query = `
            SELECT * FROM ${this.tableName}
            ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}
            ORDER BY created_at DESC
            LIMIT $${conditions.length + 1}
        `;
        values.push(limit);

        const result = await this.client.query(query, values);
        
        return result.rows.map((row) => {
            return Log.from(row);
        }).reverse();
    }

    async getAsStream(filter: LogFilter): Promise<{stream: AsyncGenerator<Log>, close : () => void}> {
        await this.initialize();
        return super.getAsStream(filter);
    }
 
}
