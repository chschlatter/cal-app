"use strict";

//import { setTimeout } from "node:timers/promises";
const setTimeout = require("timers/promises").setTimeout;

exports.dynamoLock = async function (
  dynamodbDocumentClient,
  tableName,
  resource
) {
  const lockId = "lock-" + resource;
  const lock = {
    PK: lockId,
    SK: lockId,
    Type: "Lock",
  };

  const params = {
    TableName: tableName,
    Item: lock,
    ConditionExpression: "attribute_not_exists(PK)",
  };

  let unlock = async () => {
    await dynamoUnlock(dynamodbDocumentClient, tableName, resource);
  };

  try {
    await dynamodbDocumentClient.send(new PutCommand(params));
    console.log("Lock acquired");
    return unlock;
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      console.log("Lock already acquired");
      await setTimeout(200);
      return await exports.dynamoLock(dynamodbDocumentClient, tableName, pk);
    } else {
      throw err;
    }
  }
};

async function dynamoUnlock(dynamodbDocumentClient, tableName, pk) {
  const lockId = "lock-" + pk;
  const params = {
    TableName: tableName,
    Key: {
      PK: lockId,
      SK: lockId,
    },
  };

  try {
    await dynamodbDocumentClient.send(new DeleteCommand(params));
    console.log("Lock released");
  } catch (err) {
    console.log("Lock not released");
    throw err;
  }
}
