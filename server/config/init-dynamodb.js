const { DynamoDBClient, CreateTableCommand, ListTablesCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { USERS_TABLE_NAME } = require('../models/User'); // Get the table name from User model
const { RECIPES_TABLE_NAME } = require('../models/Recipe'); // Get the table name from Recipe model
const { RECIPE_COLLECTIONS_TABLE_NAME } = require('../models/RecipeCollection'); // Get the table name from RecipeCollection model
const { MEAL_PLANS_TABLE_NAME } = require('../models/MealPlan'); // Get the table name from MealPlan model

const REGION = process.env.AWS_REGION || "localhost";
const DYNAMODB_ENDPOINT_OVERRIDE = process.env.DYNAMODB_ENDPOINT_OVERRIDE;

const clientConfig = {
  region: REGION,
};

if (DYNAMODB_ENDPOINT_OVERRIDE) {
  clientConfig.endpoint = DYNAMODB_ENDPOINT_OVERRIDE;
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummyKeyId",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dummySecretKey",
  };
}

const dynamodbClient = new DynamoDBClient(clientConfig);

const usersTableParams = {
  TableName: USERS_TABLE_NAME,
  KeySchema: [
    { AttributeName: "PK", KeyType: "HASH" }, // Partition key
    { AttributeName: "SK", KeyType: "RANGE" }  // Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: "PK", AttributeType: "S" },
    { AttributeName: "SK", AttributeType: "S" },
    { AttributeName: "GSI1PK", AttributeType: "S" }, // For email lookup
    { AttributeName: "GSI1SK", AttributeType: "S" },
    { AttributeName: "GSI2PK", AttributeType: "S" }, // For username lookup
    { AttributeName: "GSI2SK", AttributeType: "S" }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: "GSI1PK-GSI1SK-index",
      KeySchema: [
        { AttributeName: "GSI1PK", KeyType: "HASH" },
        { AttributeName: "GSI1SK", KeyType: "RANGE" }
      ],
      Projection: {
        ProjectionType: "ALL" // Or "KEYS_ONLY" or "INCLUDE"
      },
      ProvisionedThroughput: { // Required for DynamoDB Local, even if not strictly enforced for billing
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      }
    },
    {
      IndexName: "GSI2PK-GSI2SK-index",
      KeySchema: [
        { AttributeName: "GSI2PK", KeyType: "HASH" },
        { AttributeName: "GSI2SK", KeyType: "RANGE" }
      ],
      Projection: {
        ProjectionType: "ALL"
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      }
    }
  ],
  ProvisionedThroughput: { // Required for the main table as well
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1
  }
};

const recipesTableParams = {
  TableName: RECIPES_TABLE_NAME,
  KeySchema: [
    { AttributeName: "PK", KeyType: "HASH" }, // Partition key
    { AttributeName: "SK", KeyType: "RANGE" }  // Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: "PK", AttributeType: "S" },
    { AttributeName: "SK", AttributeType: "S" },
    { AttributeName: "GSI1PK", AttributeType: "S" },
    { AttributeName: "GSI1SK", AttributeType: "S" },
    { AttributeName: "GSI2PK", AttributeType: "S" },
    { AttributeName: "GSI2SK", AttributeType: "S" },
    { AttributeName: "GSI3PK", AttributeType: "S" },
    { AttributeName: "GSI3SK", AttributeType: "S" }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: "GSI1PK-GSI1SK-index",
      KeySchema: [
        { AttributeName: "GSI1PK", KeyType: "HASH" },
        { AttributeName: "GSI1SK", KeyType: "RANGE" }
      ],
      Projection: { ProjectionType: "ALL" },
      ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
    },
    {
      IndexName: "GSI2PK-GSI2SK-index",
      KeySchema: [
        { AttributeName: "GSI2PK", KeyType: "HASH" },
        { AttributeName: "GSI2SK", KeyType: "RANGE" }
      ],
      Projection: { ProjectionType: "ALL" },
      ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
    },
    {
      IndexName: "GSI3PK-GSI3SK-index", // Assuming this name based on usage in Recipe.js
      KeySchema: [
        { AttributeName: "GSI3PK", KeyType: "HASH" },
        { AttributeName: "GSI3SK", KeyType: "RANGE" }
      ],
      Projection: { ProjectionType: "ALL" },
      ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
    }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1
  }
};

const recipeCollectionsTableParams = {
  TableName: RECIPE_COLLECTIONS_TABLE_NAME,
  KeySchema: [
    { AttributeName: "PK", KeyType: "HASH" },
    { AttributeName: "SK", KeyType: "RANGE" }
  ],
  AttributeDefinitions: [
    { AttributeName: "PK", AttributeType: "S" },
    { AttributeName: "SK", AttributeType: "S" },
    { AttributeName: "GSI1PK", AttributeType: "S" },
    { AttributeName: "GSI1SK", AttributeType: "S" },
    { AttributeName: "GSI2PK", AttributeType: "S" },
    { AttributeName: "GSI2SK", AttributeType: "S" }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: "GSI1PK-GSI1SK-index",
      KeySchema: [
        { AttributeName: "GSI1PK", KeyType: "HASH" },
        { AttributeName: "GSI1SK", KeyType: "RANGE" }
      ],
      Projection: { ProjectionType: "ALL" },
      ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
    },
    {
      IndexName: "GSI2PK-GSI2SK-index",
      KeySchema: [
        { AttributeName: "GSI2PK", KeyType: "HASH" },
        { AttributeName: "GSI2SK", KeyType: "RANGE" }
      ],
      Projection: { ProjectionType: "ALL" },
      ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
    }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1
  }
};

const mealPlansTableParams = {
  TableName: MEAL_PLANS_TABLE_NAME,
  KeySchema: [
    { AttributeName: "PK", KeyType: "HASH" },
    { AttributeName: "SK", KeyType: "RANGE" }
  ],
  AttributeDefinitions: [
    { AttributeName: "PK", AttributeType: "S" },
    { AttributeName: "SK", AttributeType: "S" },
    { AttributeName: "GSI1PK", AttributeType: "S" },
    { AttributeName: "GSI1SK", AttributeType: "S" },
    { AttributeName: "GSI2PK", AttributeType: "S" },
    { AttributeName: "GSI2SK", AttributeType: "S" }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: "GSI1PK-GSI1SK-index",
      KeySchema: [
        { AttributeName: "GSI1PK", KeyType: "HASH" },
        { AttributeName: "GSI1SK", KeyType: "RANGE" }
      ],
      Projection: { ProjectionType: "ALL" },
      ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
    },
    {
      IndexName: "GSI2PK-GSI2SK-index",
      KeySchema: [
        { AttributeName: "GSI2PK", KeyType: "HASH" },
        { AttributeName: "GSI2SK", KeyType: "RANGE" }
      ],
      Projection: { ProjectionType: "ALL" },
      ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
    }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1
  }
};

async function tableExists(tableName) {
  try {
    await dynamodbClient.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error; // Re-throw other errors
  }
}

async function createTableIfNotExists(tableParams) {
  const tableName = tableParams.TableName;
  if (await tableExists(tableName)) {
    console.log(`Table "${tableName}" already exists. Skipping creation.`);
    // Optionally, check and update GSI status here if needed
    return;
  }

  try {
    console.log(`Creating table "${tableName}"...`);
    const command = new CreateTableCommand(tableParams);
    await dynamodbClient.send(command);
    // Wait for table to become active
    let tableStatus = null;
    do {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      const { Table } = await dynamodbClient.send(new DescribeTableCommand({ TableName: tableName }));
      tableStatus = Table.TableStatus;
      console.log(`Table "${tableName}" status: ${tableStatus}`);
    } while (tableStatus !== 'ACTIVE');

    console.log(`Table "${tableName}" created successfully and is active.`);
  } catch (error) {
    console.error(`Error creating table "${tableName}":`, error);
    // If it's a ResourceInUseException, it might mean it was created by a concurrent process
    if (error.name !== 'ResourceInUseException') {
        throw error;
    } else {
        console.log(`Table "${tableName}" is already being created or exists (ResourceInUseException).`);
    }
  }
}

async function initializeDatabase() {
  if (!DYNAMODB_ENDPOINT_OVERRIDE) {
    console.log("Not a local DynamoDB setup (DYNAMODB_ENDPOINT_OVERRIDE not set). Skipping local table initialization.");
    return;
  }
  console.log("Initializing DynamoDB tables for local development...");
  await createTableIfNotExists(usersTableParams);
  await createTableIfNotExists(recipesTableParams);
  await createTableIfNotExists(recipeCollectionsTableParams);
  await createTableIfNotExists(mealPlansTableParams);
  console.log("DynamoDB local initialization complete.");
}

module.exports = { initializeDatabase };

// If run directly (e.g. node config/init-dynamodb.js)
if (require.main === module) {
  initializeDatabase()
    .then(() => console.log("Manual DynamoDB initialization successful."))
    .catch(err => {
      console.error("Manual DynamoDB initialization failed:", err);
      process.exit(1);
    });
}
