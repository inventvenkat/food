const { docClient } = require('../config/db');
const {
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require('uuid');

const MEAL_PLANS_TABLE_NAME = process.env.MEAL_PLANS_TABLE_NAME || 'RecipeAppMealPlans';

// Helper to format date to YYYY-MM-DD string
const formatDateToYYYYMMDD = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

async function createMealPlanEntry({ userId, date, mealType, recipeId, plannedServings }) {
  const mealPlanId = uuidv4();
  const timestamp = new Date().toISOString();
  const formattedDate = formatDateToYYYYMMDD(date);

  const item = {
    PK: `USER#${userId}`,
    SK: `DATE#${formattedDate}#MP#${mealPlanId}`,
    mealPlanId,
    userId, // Storing plain userId for easier filtering if needed, though PK has it
    date: formattedDate, // Store as YYYY-MM-DD string
    mealType,
    recipeId, // Should be RECIPE#<uuid>
    plannedServings,
    createdAt: timestamp,
    updatedAt: timestamp,
    // GSI for recipe lookup
    GSI1PK: recipeId, // RECIPE#<uuid>
    GSI1SK: `USER#${userId}#DATE#${formattedDate}#MP#${mealPlanId}`,
    // GSI for direct mealPlanId lookup (optional but useful)
    GSI2PK: `MP#${mealPlanId}`,
    GSI2SK: `MP#${mealPlanId}`,
  };

  const params = {
    TableName: MEAL_PLANS_TABLE_NAME,
    Item: item,
    ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)" // Ensure entry doesn't exist
  };

  try {
    await docClient.send(new PutCommand(params));
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...entryForResponse } = item;
    return entryForResponse;
  } catch (error) {
    console.error("Error creating meal plan entry:", error);
    throw new Error('Could not create meal plan entry.');
  }
}

async function getMealPlanEntriesForUserAndDate(userId, date) {
  const formattedDate = formatDateToYYYYMMDD(date);
  const params = {
    TableName: MEAL_PLANS_TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk_prefix)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":sk_prefix": `DATE#${formattedDate}#MP#`,
    },
  };

  try {
    const { Items } = await docClient.send(new QueryCommand(params));
    return Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...entry } = item;
      return entry;
    });
  } catch (error) {
    console.error("Error fetching meal plan entries for date:", error);
    throw new Error('Could not retrieve meal plan entries.');
  }
}

async function getMealPlanEntriesForUserAndDateRange(userId, startDate, endDate, limit = 20, lastEvaluatedKey = null) {
  const formattedStartDate = formatDateToYYYYMMDD(startDate);
  const formattedEndDate = formatDateToYYYYMMDD(endDate);

  const params = {
    TableName: MEAL_PLANS_TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND SK BETWEEN :startSK AND :endSK",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":startSK": `DATE#${formattedStartDate}#MP#`, // Start of the day
      ":endSK": `DATE#${formattedEndDate}#MP#\uffff`, // End of the day (using \uffff for string range)
    },
    Limit: limit,
  };
  if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;

  try {
    const { Items, LastEvaluatedKey } = await docClient.send(new QueryCommand(params));
    const entries = Items.map(item => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...entry } = item;
      return entry;
    });
    return { entries, lastEvaluatedKey: LastEvaluatedKey };
  } catch (error) {
    console.error("Error fetching meal plan entries for date range:", error);
    throw new Error('Could not retrieve meal plan entries for date range.');
  }
}

// Requires GSI2: GSI2PK: MP#<mealPlanId>, GSI2SK: MP#<mealPlanId> (or USER#<userId>)
async function getMealPlanEntryById(mealPlanId) {
    const params = {
        TableName: MEAL_PLANS_TABLE_NAME,
        IndexName: 'GSI2PK-GSI2SK-index',
        KeyConditionExpression: "GSI2PK = :gsi2pk",
        ExpressionAttributeValues: {
          ":gsi2pk": `MP#${mealPlanId}`,
        },
    };
    try {
        const { Items } = await docClient.send(new QueryCommand(params));
        if (Items && Items.length > 0) {
            const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...entry } = Items[0];
            return entry;
        }
        return null;
    } catch (error) {
        console.error("Error fetching meal plan entry by ID:", error);
        throw new Error('Could not retrieve meal plan entry by ID.');
    }
}


async function updateMealPlanEntryById(mealPlanId, userId, updateData) {
  // First, fetch the item to get its full PK and SK for the update
  const existingEntry = await getMealPlanEntryById(mealPlanId);
  if (!existingEntry || existingEntry.userId !== userId) {
    throw new Error("Meal plan entry not found or user not authorized.");
  }

  const timestamp = new Date().toISOString();
  let updateExpression = 'set ';
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};
  let nameCounter = 0;

  for (const key in updateData) {
    if (updateData.hasOwnProperty(key) && !['mealPlanId', 'userId', 'date', 'PK', 'SK', 'createdAt', 'GSI1PK', 'GSI1SK', 'GSI2PK', 'GSI2SK'].includes(key)) {
      nameCounter++;
      const namePlaceholder = `#attr${nameCounter}`;
      const valuePlaceholder = `:val${nameCounter}`;
      updateExpression += `${namePlaceholder} = ${valuePlaceholder}, `;
      expressionAttributeNames[namePlaceholder] = key;
      expressionAttributeValues[valuePlaceholder] = updateData[key];
    }
  }
  updateExpression += '#updatedAt = :updatedAtVal';
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAtVal'] = timestamp;

  if (updateExpression === 'set #updatedAt = :updatedAtVal') { // Only updatedAt is being set
    throw new Error("No valid fields provided for update.");
  }

  const params = {
    TableName: MEAL_PLANS_TABLE_NAME,
    Key: {
        PK: `USER#${existingEntry.userId}`,
        SK: `DATE#${existingEntry.date}#MP#${existingEntry.mealPlanId}`
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ConditionExpression: "attribute_exists(PK) AND userId = :userId", // Ensure it's the owner
    ReturnValues: "ALL_NEW",
  };
  expressionAttributeValues[':userId'] = userId;


  try {
    const { Attributes } = await docClient.send(new UpdateCommand(params));
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...entry } = Attributes;
    return entry;
  } catch (error) {
    console.error("Error updating meal plan entry:", error);
    if (error.name === 'ConditionalCheckFailedException') {
      throw new Error('Update failed: Entry not found or user not authorized.');
    }
    throw new Error('Could not update meal plan entry.');
  }
}

async function deleteMealPlanEntryById(mealPlanId, userId) {
  // First, fetch the item to get its full PK and SK for the delete
  const existingEntry = await getMealPlanEntryById(mealPlanId);
  if (!existingEntry || existingEntry.userId !== userId) {
    throw new Error("Meal plan entry not found or user not authorized to delete.");
  }

  const params = {
    TableName: MEAL_PLANS_TABLE_NAME,
    Key: {
        PK: `USER#${existingEntry.userId}`,
        SK: `DATE#${existingEntry.date}#MP#${existingEntry.mealPlanId}`
    },
    ConditionExpression: "attribute_exists(PK) AND userId = :userId",
    ExpressionAttributeValues: { ":userId": userId }
  };

  try {
    await docClient.send(new DeleteCommand(params));
    return { message: 'Meal plan entry deleted successfully' };
  } catch (error) {
    console.error("Error deleting meal plan entry:", error);
    if (error.name === 'ConditionalCheckFailedException') {
      throw new Error('Delete failed: Entry not found or user not authorized.');
    }
    throw new Error('Could not delete meal plan entry.');
  }
}

// Useful for cascade deletes if a recipe is deleted
async function getMealPlanEntriesByRecipe(recipeId, limit = 100, lastEvaluatedKey = null) {
    const params = {
        TableName: MEAL_PLANS_TABLE_NAME,
        IndexName: 'GSI1PK-GSI1SK-index', // Assumes GSI: GSI1PK = RECIPE#<id>, GSI1SK = USER#...
        KeyConditionExpression: "GSI1PK = :recipeId",
        ExpressionAttributeValues: {
          ":recipeId": recipeId, // e.g. RECIPE#<uuid>
        },
        Limit: limit,
      };
      if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;

      try {
        const { Items, LastEvaluatedKey } = await docClient.send(new QueryCommand(params));
        const entries = Items.map(item => {
          const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...entry } = item;
          return entry;
        });
        return { entries, lastEvaluatedKey: LastEvaluatedKey };
      } catch (error) {
        console.error("Error fetching meal plan entries by recipe:", error);
        throw new Error('Could not retrieve meal plan entries by recipe.');
      }
}


module.exports = {
  createMealPlanEntry,
  getMealPlanEntriesForUserAndDate,
  getMealPlanEntriesForUserAndDateRange,
  updateMealPlanEntryById,
  deleteMealPlanEntryById,
  getMealPlanEntryById,
  getMealPlanEntriesByRecipe,
  MEAL_PLANS_TABLE_NAME
};
