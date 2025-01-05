import { TypeFormatter } from "../formatter.js";

export default function (debug: boolean): Array<TypeFormatter> {
    return [
        {
            name: "json error formatter",
            checker: (value) => typeof value === "object" && value instanceof Error,
            formatter: (value) => {
                return {
                    formattedValue: JSON.stringify({
                        error: String(value),
                        message: value instanceof Error ? value.message : undefined,
                        stacktrace: !debug ? undefined : value.stack,
                    }),
                    mimeType: "application/json",
                };
            },
        },
        {
            name: "json generic formatter",
            formatter: (value) => {
                return {
                    formattedValue: JSON.stringify(value),
                    mimeType: "application/json",
                };
            },
        },
    ];
}
