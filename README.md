# VanityNumberServiceGeneration

## Please Download the draw.io file and open it if you have draw.io application. If no draw.io application kindly go to draw.io website and attach the file for better viewing of the Architecture diagrams.

## Setup Instructions:

## DynamoDB Tables
### 1. NumberVanityMapping
Stores the t9 keypad Mapping
Partition Key: digit
Example Item:  
```json
{
 "digit": "2",
 "letters": [
  "A",
  "B",
  "C"
 ]
}    
```
### 2. Dictionary_Vanity
Stores dictionary words uses for matching.
Partition Key: configType
Sort Key: word
Example Item: 
```json
{
 "configType": "PREFERRED_WORD",
 "word": "CLINIC"
}
```
### 3. vanityNumbers
Store generated vanity numbers.
Partition Key: callerNumber
Example Item: 
```json
{
 "callerNumber": "+18003563342",
 "createdAt": "2026-06-29T23:24:20.868Z",
 "topThree": [
  "1-800-35-MEDIA",
  "1-800-35-MEDIC",
  "1-800-356-DDGA"
 ],
 "vanityNumbers": [
  "1-800-35-MEDIA",
  "1-800-35-MEDIC",
  "1-800-356-DDGA",
  "1-800-356-DDGB",
  "1-800-356-DDGC"
 ]
}
```
TakeNote: Just create a PartitionKey: callerNumber and dont input any item in the table, because this is for saving purposes.


**Lambda**
1. Please download the zip file uploaded named (VanityNumberServiceLambda)
2. Go to AWS Lambda
3. Create a function named (VanityNumberGen3) (select node22 or higher for runtime)
4. After creating function click update
5. Select the zip file downloaded (VanityNumberServiceLambda) and check if the code structure are populated.
6. Go to Permission Tab in Configuration
7. Click the role associated with it.
8. Click Add Permission and select Attach inline policy 
9. Select a Service which is DynamoDB
10. In Actions allowed search BatchGetItem and click Add ARNS then input the ARN of the DynamoDB Table (NumberVanityMapping) and click next (create a policy name: vanitygen3) and save it.
11. Then click the created policy (vanitygen3) and click add more permissions and repeat step 9.
12. In Actions allowed search PutItem and click ADD ARNS then input the ARN of the DynamoDB Table (vanityNumbers) and click next and save.
13. Click Add more permissions and repeat step 9.
14. In actions allowed search QueryItem and click Add ARNS then input the ARN of the DynamoDB Table (Dictionary_Vanity) and click next and save.
15. This is the JSON Format if you just want to input it in json:
    ```json
    {
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "VisualEditor0",
			"Effect": "Allow",
			"Action": "dynamodb:PutItem",
			"Resource": "arn:aws:dynamodb:us-west-2:(Replace Account Number):table/vanityNumbers"
		},
		{
			"Sid": "VisualEditor1",
			"Effect": "Allow",
			"Action": "dynamodb:BatchGetItem",
			"Resource": "arn:aws:dynamodb:us-west-2:(Replace Account Number):table/NumberVanityMapping"
		},
		{
			"Sid": "VisualEditor2",
			"Effect": "Allow",
			"Action": "dynamodb:Query",
			"Resource": "arn:aws:dynamodb:us-west-2:(Replace Account Number):table/Dictionary_Vanity"
		}
	]
}
    ```
16. Set the following environment variables for the lambda. Go to Config and Environment Variables
CONFIG_CACHE_TTL_MS: 300000
DIGIT_MAPPING_TABLE: NumberVanityMapping
MAX_COMBINATIONS: 10000
MAX_RESULTS: 5
MAX_SUFFIX_LENGTH:10
PREFERRED_WORDS_TABLE: Dictionary_Vanity
VANITY_TABLE_NAME: vanityNumbers

## Amazon Connect
1. Go to Amazon Connect
2. Before Accessing the URL, click Flow at the lower left part of Account Overview.
3. Go to AWS Lambda and click +Add Lambda function and add the lambda (VanityNumberGen3)
4. Then access now the URL of the instance.
5. Click Flows and Create a Flow named (VanityService_Main)
6. Download the JSON File named (VanityService_Main.json) && (VanityNumber_CustomerQueueFlow.json)
7. At the upper left part, click the dragdown button and select Import(Beta)
8. Choose the file downloaded (VanityService_Main.json)
9. Click Import, save it and publish.
10. Go back to create flow
11. Click create customer queue flow.
12. Repeat step 7.
13. Choose the file downloaded(VanityNumber_CustomerQueueFlow.json) and repeat step 9.
