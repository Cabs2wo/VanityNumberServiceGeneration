// Importing BatchGetCommand and QueryCommand (No more ScanCommand!)
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchGetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const DIGIT_MAPPING_TABLE = process.env.DIGIT_MAPPING_TABLE;
const PREFERRED_WORDS_TABLE = process.env.PREFERRED_WORDS_TABLE;

const CACHE_TTL_ms = Number(process.env.CONFIG_CACHE_TTL_MS || 300000);

let cachedConfig = null;
let cacheExpiresAt = 0;

const getDigitMappings = async () => {
    const digitsToFetch = ['2', '3', '4', '5', '6', '7', '8', '9'];
    const keysRequest = digitsToFetch.map(d => ({ digit: d })); 

    const command = new BatchGetCommand({
        RequestItems: {
            [DIGIT_MAPPING_TABLE]: {
                Keys: keysRequest
            }
        }
    });

    const response = await docClient.send(command);
    const items = response.Responses[DIGIT_MAPPING_TABLE] || [];

    const digitToLetters = {};
    items.forEach((item) => {
        if (!item.digit || !item.letters) return;
        digitToLetters[String(item.digit)] = item.letters.map(letter => String(letter).trim().toUpperCase());
    });

    return digitToLetters;
};

const getPreferredWords = async () => {
    const command = new QueryCommand({
        TableName: PREFERRED_WORDS_TABLE,
        KeyConditionExpression: "configType = :pk",
        ExpressionAttributeValues: {
            ":pk": "PREFERRED_WORD" 
        }
    });

    const response = await docClient.send(command);
    const items = response.Items || [];

    // Pass the items to the word cleaner and sorter
    return normalizePreferredWords(items);
};


const buildLetterToDigit = (digitToLetters = {}) => {
    const letterToDigit = {};
    Object.entries(digitToLetters).forEach(([digit, letters]) => {
        letters.forEach((letter) => {
            letterToDigit[String(letter).toUpperCase()] = String(digit);
        });
    });
    return letterToDigit;
};

const normalizePreferredWords = (items = []) => {
    const uniqueWords = new Set();
    items.forEach((item) => {
        if (!item.word) return;
        const normalizedWord = String(item.word).trim().toUpperCase().replace(/[^A-Z]/g, '');
        if (normalizedWord) {
            uniqueWords.add(normalizedWord);
        }
    });

    return Array.from(uniqueWords).sort((a, b) => {
        if (b.length !== a.length) {
            return b.length - a.length;
        }
        return a.localeCompare(b);
    });
};

const configFromDynamoDb = async () => {
    const [digitToLetters, preferredWords] = await Promise.all([
        getDigitMappings(),
        getPreferredWords()
    ]);

    return {
        digitToLetters,
        letterToDigit: buildLetterToDigit(digitToLetters),
        preferredWords
    };
};

const getConfig = async ({ forceRefresh = false } = {}) => {
    const now = Date.now();

    if (!forceRefresh && cachedConfig && now < cacheExpiresAt) {
        console.log('using cached vanity config');
        return cachedConfig;
    }
    
    console.log('loading config via BatchGet and Query');

    cachedConfig = await configFromDynamoDb();
    cacheExpiresAt = now + CACHE_TTL_ms;

    return cachedConfig;
};

module.exports = {
    getConfig
};