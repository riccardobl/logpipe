
import { Request } from 'express';
import {Log, LogStash} from '../logstash.js';

import express  from 'express';
import {  getRequestProps } from '../common.js';
import expressWs,{Application as WsApplication}  from 'express-ws';
import {WebSocket} from 'ws';
import {Formatter} from '../formatter.js';
import {Notice} from '../common.js';

export class WsService {
    private readonly logs: LogStash;
    private readonly formatter: Formatter;

    constructor(logs: LogStash, formatter: Formatter){
        this.logs = logs;      
        this.formatter = formatter;
    }

    public attach(app:  express.Express): void {
        const wsApp = app as any as WsApplication;
        expressWs(wsApp);
        wsApp.ws('/stream', this.stream.bind(this));
    }

    private async stream(ws: WebSocket, req: Request) {
        let reqProps = getRequestProps(req.query);

        const pipeLogs = async (logs:Log[], reqProps: any) => {
            const lastId = logs[logs?.length-1]?.id
            if(lastId) reqProps.afterId = lastId;
            const{formattedValue} = this.formatter.format(logs,reqProps.format)
            await ws.send(formattedValue);
        }

      
        ws.on('message', async (filter: string) => {
            try{
                let newReqProps = {
                    ...reqProps,
                }
                try {
                    if(filter){
                        let filterProps;
                        try {
                            filterProps = getRequestProps(JSON.parse(filter));
                        } catch (err) {
                            const rules = filter.split(' ');
                            const json: any = {};
                            for(const rule of rules){
                                const [key,value] = rule.split('=');
                                if(!key || !value) throw new Error(`Invalid rule: ${rule}`);
                                json[key] = value; 
                            }
                            filterProps = getRequestProps(json);
                        }
                        newReqProps = {
                            ...newReqProps,
                            ...filterProps
                        }
                        const{formattedValue} = this.formatter.format(new Notice('Filter applied'),reqProps.format)
                        ws.send(formattedValue);
                    }
                } catch (err) {
                    console.error(`Error parsing WebSocket filter: ${err}`);
                    const{formattedValue} = this.formatter.format(err,reqProps.format)
                    ws.send(formattedValue);
                }
                Object.assign(reqProps,newReqProps);

                let logs:Log[] = await this.logs.get(reqProps);
                if(logs.length) await pipeLogs(logs,reqProps);
            } catch (err) {
                console.error(`Error handling WebSocket message: ${err}`);
            }
        });

        const {stream, close} = await this.logs.getAsStream(reqProps);
        ws.on('close', () => {
            console.log('WebSocket connection closed');
            close();
        });

        for await (const log of stream) {
            await pipeLogs([log],reqProps);
        }

    }
}
