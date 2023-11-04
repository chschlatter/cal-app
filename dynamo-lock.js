"use strict";

//import { setTimeout } from "node:timers/promises";
const setTimeout = require("timers/promises").setTimeout;
const dayjs = require("dayjs");
const { PutCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

exports.dynamoLock = async function (
  dynamodbDocumentClient,
  tableName,
  resource
) {
  const lockId = "lock-" + resource;
  const lock = {
    PK: lockId,
    SK: lockId,
    Expiry: dayjs().add(30, "seconds").toISOString(),
    Type: "Lock",
  };

  let unlock = false;
  while (!unlock) {
    try {
      const params = {
        TableName: tableName,
        Item: lock,
        ConditionExpression: "attribute_not_exists(PK) OR Expiry < :now",
        ExpressionAttributeValues: {
          ":now": dayjs().toISOString(),
        },
      };

      await dynamodbDocumentClient.send(new PutCommand(params));
      console.log("Lock acquired");
      unlock = async () => {
        await dynamoUnlock(dynamodbDocumentClient, tableName, resource);
      };
    } catch (err) {
      if (err.name === "ConditionalCheckFailedException") {
        console.log("Lock already acquired");
        await setTimeout(500);
      } else {
        throw err;
      }
    }
  }
  return unlock;
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
