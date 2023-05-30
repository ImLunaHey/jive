import { resolve as resolvePath } from 'node:path';
import { readFileSync } from 'node:fs';
import baseLanguage from '@app/common/base-language';
import { Logger } from '@app/logger';

const defaultLanguage = 'en-GB' as const;

const logger = new Logger({ service: 'i18n' });

const knownLanguages = [
    'id', // Indonesian
    'en-US', // EnglishUS
    'en-GB', // EnglishGB
    'bg', // Bulgarian
    'zh-CN', // ChineseCN
    'zh-TW', // ChineseTW
    'hr', // Croatian
    'cs', // Czech
    'da', // Danish
    'nl', // Dutch
    'fi', // Finnish
    'fr', // French
    'de', // German
    'el', // Greek
    'hi', // Hindi
    'hu', // Hungarian
    'it', // Italian
    'ja', // Japanese
    'ko', // Korean
    'lt', // Lithuanian
    'no', // Norwegian
    'pl', // Polish
    'pt-BR', // PortugueseBR
    'ro', // Romanian
    'ru', // Russian
    'es-ES', // SpanishES
    'sv-SE', // Swedish
    'th', // Thai
    'tr', // Turkish
    'uk', // Ukrainian
    'vi' // Vietnamese
] as const;

type I18n = Record<typeof knownLanguages[number], Partial<typeof baseLanguage>>;

const i18n = {
    'en-GB': baseLanguage,
} as I18n;

const loadLanguage = (language: typeof knownLanguages[number] = defaultLanguage) => {
    const filePath = resolvePath('locales/', `${language}.json`);
    logger.info('Loading language from disk', { language, filePath });
    const file = readFileSync(filePath, 'utf8');
    const loadedLanguage = JSON.parse(file) as Partial<typeof baseLanguage>;
    i18n[language] = loadedLanguage;
    return loadedLanguage;
};

const getLanguage = (language: typeof knownLanguages[number] = defaultLanguage) => {
    try {
        const values = i18n[language];
        return {
            loadedLanguage: language,
            values: values ?? loadLanguage(language),
            source: values ? 'memory' as const : 'disk' as const,
        };
    } catch {}

    logger.info('Failed to load language falling back to default', { language });
    return {
        loadedLanguage: defaultLanguage,
        values: i18n[defaultLanguage],
        source: 'memory' as const,
    };
};

type ParserError<E extends string> = { error: true } & E;
type ParseParameters<T extends string, Parameters_ extends string = never> = string extends T ? ParserError<'T must be a literal type'> : T extends `${string}{${infer Parameter}}${infer Rest}` ? ParseParameters<Rest, Parameters_ | Parameter> : Parameters_;
type ToObject<P extends string> = { [k in P]: string };
type Placeholders = Record<string, string>;
const replacePlaceholders = <const T extends string>(string: T, placeholders: Placeholders): T => string.replaceAll(/{(.*?)}/g, (match: string, key: string) => placeholders[key.trim()] || match) as T;

export const t = <K extends keyof typeof baseLanguage>(key: K, parameters: ToObject<ParseParameters<typeof baseLanguage[K]>>, language: typeof knownLanguages[number] = defaultLanguage) => {
    // Check if the language is loaded
    // If not then load it
    const { loadedLanguage, values, source } = getLanguage(language);

    logger.info('Loaded language', { loadedLanguage, source });

    // Check if the key is in the language
    let value = values[key];

    // If the key is missing try and load the fall back
    if (value === undefined) {
        value = i18n[defaultLanguage][key];
        logger.info('Missing key', { loadedLanguage, key });
    }

    return typeof value === 'string' ? replacePlaceholders(value, parameters) : value;
};
