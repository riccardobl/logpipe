/**
 * Format objects to strings with mime types and status codes
 */
export type FormattedOutput = {
    formattedValue: string;
    mimeType: string;
    statusCode?: number;
};
export type FormatterFunction = (value: any) => FormattedOutput;
export type TypeChecker = (value: any) => boolean;

export type TypeFormatter = {
    name?: string; // used only for debugging
    checker?: TypeChecker;
    formatter: FormatterFunction;
};

export class Formatter {
    private readonly formats: Map<string, Array<TypeFormatter>> = new Map();
    private defaultFormat: string = "json";

    public register(format: string, newFormatters: TypeFormatter | TypeFormatter[], setAsDefault?: boolean): void {
        let registeredFormatters = this.formats.get(format);
        if (!registeredFormatters) {
            registeredFormatters = [];
            this.formats.set(format, registeredFormatters);
        }

        newFormatters = Array.isArray(newFormatters) ? newFormatters : [newFormatters];

        for (const formatter of newFormatters) {
            registeredFormatters.push(formatter);
        }

        if (setAsDefault) {
            this.defaultFormat = format;
        }

        registeredFormatters.sort((a, b) => {
            if (!a.checker && b.checker) {
                return 1;
            }
            if (a.checker && !b.checker) {
                return -1;
            }
            return 0;
        });
    }

    public format(value: any, format?: string): FormattedOutput {
        const formatters: Array<TypeFormatter> = this.formats.get(format || this.defaultFormat) || this.formats.get(this.defaultFormat) || [];
        if (!formatters?.length) {
            throw new Error(`Formatter ${name} not found and no default available`);
        }
        for (const formatter of formatters) {
            if (!formatter.checker || formatter.checker(value)) {
                return formatter.formatter(value);
            }
        }
        console.error(`No formatter found for`, value);
        throw new Error(`No formatter found for ${value}`);
    }
}
