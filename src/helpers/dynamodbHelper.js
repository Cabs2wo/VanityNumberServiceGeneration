const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client)

const VANITY_TABLE_NAME = process.env.VANITY_TABLE_NAME

const saveVanityNumbers = async ({ callerNumber, vanityNumbers }) => {
    
    const item = {
        callerNumber,
        vanityNumbers,
        topThree: vanityNumbers.slice(0, 3),
        createdAt: new Date().toISOString()
    }
    
    const command = new PutCommand({
        TableName: VANITY_TABLE_NAME,
        Item: item
    })

    await docClient.send(command);

    return item;
};

module.exports = {
    saveVanityNumbers
}