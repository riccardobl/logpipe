import { PostgresStash } from './stash/postgres.js';
import { SQLiteStash } from './stash/sqlite.js';
import { LogStash } from './logstash.js';
import Os from 'os';

/**
 * Parse request properties to something meaningful
 * @param searchParams 
 * @returns 
 */
export function getRequestProps(searchParams: any):{
    tags:string[],
    format:string,
    from:Date|undefined,
    to:Date|undefined,
    limit:number
}{
    try {
        const tags:string[] = []
        if(searchParams.tag){
            if(Array.isArray(searchParams.tag)){
                tags.push(...searchParams.tag.toString());
            } else {
                tags.push(searchParams.tag.toString());
            }
        }
        if(searchParams.filter){
            tags.push(...((searchParams.filter.toString()).split(',')));
        }

        const out = {} as any;
        if(searchParams.format ){
            out.format = searchParams.format.toString();
        }
        if(searchParams.from){
            out.from = new Date(!isNaN(searchParams.from as any) ? parseInt(String(searchParams.from)) : String(searchParams.from));
        }

        if(searchParams.to){
            out.to = new Date(!isNaN(searchParams.to as any) ? parseInt(String(searchParams.to)) : String(searchParams.to));
        }

        if(searchParams.limit){
            out.limit = parseInt(String(searchParams.limit));
        }
        
        if(tags.length){
            out.tags = tags;
        }
        
        return  out;
    } catch (err) {
        console.error(`Error parsing request properties: ${err}`);
        return {} as any;
    }
}


export class Notice {
    public message:string;
    constructor(message:string){
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

    if(!url){
        const tmpDir = Os.tmpdir();
        url = `sqlite://${tmpDir}/logpipe_rl1.sqlite`;
        console.log(`No database URL provided, using ${url}`);
    }


    if(url.startsWith('postgresql://')){
        const tableName = config?.tableName ?? 'logpipe_rl1';
        return new PostgresStash(url, tableName);
    }

    if(url.startsWith('sqlite://')){
        const tableName = config?.tableName ?? 'logpipe_rl1';
        return new SQLiteStash(url.substring('sqlite://'.length), tableName);
    }

    // TODO: Add support for other databases
    throw new Error('Unsupported database URL');
}
