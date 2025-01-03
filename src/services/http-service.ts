
import { Request, Response } from 'express';
import express  from 'express';
import {Log, LogStash} from '../logstash.js';
import { getRequestProps, Notice} from '../common.js';
import {Service} from '../service.js';
import { Formatter } from '../formatter.js';
export class HttpService implements Service {
    private readonly logs: LogStash;
    private readonly formatter: Formatter;

    constructor(logs: LogStash, formatter: Formatter) {
        this.logs = logs;      
        this.formatter = formatter;
    }

    public attach(app:  express.Express): void {
        app.post('/write', express.json({
            limit: '10mb'
        }), this.write.bind(this));
        app.get('/read', this.read.bind(this));    
    }

    private async read(req: Request, res: Response) {
        try{
            const {tags,format,from,to,limit} = getRequestProps(req.query);
            try { 
                const logs = await this.logs.get({tags, from, to, limit})
                const {formattedValue, mimeType, statusCode} = this.formatter.format(logs,format);
                res.setHeader('Content-Type', mimeType);
                res.status(statusCode||200).send(formattedValue);
            } catch (err) {
                const {formattedValue, mimeType, statusCode} = this.formatter.format(err,format);
                res.setHeader('Content-Type', mimeType);
                res.status(statusCode||500).send(formattedValue);
            }
        } catch (err) {
            console.error(`Error handling /read request: ${err}`);
            res.status(500).send(`Internal server error`);
        }
    }

    private async write(req: Request, res: Response) {
        try{
            try {
                const body = req.body;
                const log: Log = Log.from(body);
                if(new Date().getTime()-log.createdAt.getTime()>3600000){
                    throw new Error(`Log is too old`);
                }        
                await this.logs.addLog(log);
                const reqProps = getRequestProps(req.query);

                const {formattedValue, mimeType, statusCode} = this.formatter.format(new Notice('Log saved successfully'),reqProps.format);
                res.setHeader('Content-Type', mimeType);
                res.status(statusCode||200).send(formattedValue);
            } catch (err) {
                console.error(`Error handling /write request: ${err}`);
                const {formattedValue, mimeType, statusCode} = this.formatter.format(err,'json');
                res.setHeader('Content-Type', mimeType);
                res.status(statusCode||500).send(formattedValue);
            }
        } catch (err) {
            console.error(`Error handling /write request: ${err}`);
            res.status(500).send(`Internal server error`);
        }
    }
}