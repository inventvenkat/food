const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const REGION = process.env.AWS_REGION || "localhost"; // Default to 'localhost' for local development
const DYNAMODB_ENDPOINT_OVERRIDE = process.env.DYNAMODB_ENDPOINT_OVERRIDE;

const clientConfig = {
  region: REGION,
};

// If DYNAMODB_ENDPOINT_OVERRIDE is set (for local development with DynamoDB Local),
// use it and provide dummy credentials as DynamoDB Local doesn't validate them.
if (DYNAMODB_ENDPOINT_OVERRIDE) {
  clientConfig.endpoint = DYNAMODB_ENDPOINT_OVERRIDE;
  clientConfig.credentials = {
    accessKeyId: "dummyKeyId", // Fixed dummy credentials for DynamoDB Local
    secretAccessKey: "dummySecretKey", // Fixed dummy credentials for DynamoDB Local
  };
  // Force the region for local development
  clientConfig.region = "us-east-1";
  console.log(`DynamoDB client configured for local endpoint: ${DYNAMODB_ENDPOINT_OVERRIDE} in region ${clientConfig.region}`);
} else {
  // For AWS deployment, credentials will be picked up from the environment (e.g., IAM role)
  // and region should be set via AWS_REGION environment variable.
  if (!process.env.AWS_REGION) {
    console.warn("AWS_REGION environment variable is not set. DynamoDB client might not connect correctly in AWS.");
  }
  console.log(`DynamoDB client configured for AWS region: ${REGION}`);
}

const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);

// Function to get the raw DynamoDB client for batch operations
function getDynamoClient() {
  return client;
}

module.exports = { 
  docClient, 
  dynamodbClient: client, 
  getDynamoClient 
}; // Export both document client and raw client
