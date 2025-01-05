import express, { Request, Response } from "express";
import { LogStash } from "../logstash.js";
import { getRequestProps } from "../common.js";
import { Service } from "../service.js";
import { Formatter } from "../formatter.js";
export class ErrorHandlerService implements Service {
    private readonly formatter: Formatter;

    constructor(stash: LogStash, formatter: Formatter) {
        this.formatter = formatter;
    }

    public attach(app: express.Express): void {
        const formatter = this.formatter;
        const pipeError = (err: any, req: Request, res: Response) => {
            try {
                let format = "json";
                try {
                    format = getRequestProps(req.query)?.format || format;
                } catch (e) {
                    console.error(`Error parsing request properties: ${e}`);
                }
                const { formattedValue, mimeType, statusCode } = formatter.format(new Error(err.toString()), format);
                res.setHeader("Content-Type", mimeType);
                res.status(statusCode || 500).send(formattedValue);
            } catch (e2) {
                console.error(err, e2);
                res.setHeader("Content-Type", "text/plain");
                res.status(500).send(err.message || "Internal server error");
            }
        };

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        app.use((req: Request, res: Response, next: any) => {
            pipeError(new Error("Not found"), req, res);
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        app.use((err: any, req: Request, res: Response, next: any) => {
            pipeError(err, req, res);
        });
    }
}
