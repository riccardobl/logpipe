import express from "express";
import { HttpService } from "./services/http-service.js";
import { ErrorHandlerService } from "./services/error-handler-service.js";
import { WsService } from "./services/ws-service.js";
import { Service } from "./service.js";
import { Formatter } from "./formatter.js";
import JSONFormatter from "./formats/json-format.js";
import ConsoleFormatter from "./formats/console-format.js";
import { getStashByUrl } from "./common.js";
import { LogStash } from "./logstash.js";
import cors from "cors";

// load config from env
const config = {
    databaseUrl: process.env.LOGPIPE_DATABASE_URL || process.env.DATABASE_URL,
    maxLogs: process.env.LOGPIPE_MAX_LOGS ? parseInt(process.env.LOGPIPE_MAX_LOGS) : 1000,
    defaultFormat: process.env.LOGPIPE_DEFAULT_FORMAT ? process.env.LOGPIPE_DEFAULT_FORMAT : "console",
    host: process.env.LOGPIPE_HOST ? process.env.LOGPIPE_HOST : "0.0.0.0",
    port: process.env.LOGPIPE_PORT ? parseInt(process.env.LOGPIPE_PORT) : 7068,
    tableName: process.env.LOGPIPE_TABLE ? process.env.LOGPIPE_TABLE : "logpipe_rl1",
};

// load db
const stash: LogStash = getStashByUrl(config.databaseUrl, config);
stash.setMaxLogs(config.maxLogs);

const formatter: Formatter = new Formatter();
{
    // load formatter
    formatter.register("json", JSONFormatter(), config.defaultFormat === "json");
    formatter.register("console", ConsoleFormatter(false), config.defaultFormat === "console");
    formatter.register("cconsole", ConsoleFormatter(true), config.defaultFormat === "cconsole");
}

const app = express();
app.use(cors());

{
    // load http service
    const httpService: Service = new HttpService(stash, formatter);
    httpService.attach(app);
}

{
    // load ws service
    const wsService: Service = new WsService(stash, formatter);
    wsService.attach(app);
}

{
    // load error handler service
    const errService: Service = new ErrorHandlerService(stash, formatter);
    errService.attach(app);
}

{
    // start server
    app.listen(config.port, config.host, () => {
        console.log(`LogPipe listening at http://${config.host}:${config.port}`);
    });
}
