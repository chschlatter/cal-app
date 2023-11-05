"use strict"; // Path: models/events.js

const ApiError = require("../ApiError");
const {
  GetCommand,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const dynamoLock = require("../dynamo-lock").dynamoLock;
const { v4: uuidv4 } = require("uuid");

const list = async (start, end, dynDocClient) => {
  if (!start || !end) {
    throw new Error("Please provide start and end query params");
  }

  console.log("start: " + start + ", end: " + end);
  const params = {
    TableName: "cal_data",
    IndexName: "Type-EndDate-index",
    KeyConditionExpression: "#Type = :type AND EndDate >= :start",
    FilterExpression: "StartDate <= :end",
    ExpressionAttributeValues: {
      ":type": "Event",
      ":start": start,
      ":end": end,
    },
    ExpressionAttributeNames: {
      "#Type": "Type",
    },
  };

  const data = await dynDocClient.send(new QueryCommand(params));
  const events = data.Items.map((item) => {
    return {
      id: item.PK,
      title: item.SK,
      start: item.StartDate,
      end: item.EndDate,
    };
  });
  return events;
};

const create = async (event, dynDocClient) => {
  console.log("create: " + JSON.stringify(event));
  event.id = uuidv4();

  // lock cal_data table
  const unlock = await dynamoLock(dynDocClient, "cal_data", "cal_data");

  try {
    // check if event overlaps with another
    await checkOverlaps(event, dynDocClient);

    const params = {
      TableName: "cal_data",
      Item: {
        PK: "Event#" + event.id,
        SK: event.title,
        Type: "Event",
        StartDate: event.start,
        EndDate: event.end,
      },
    };

    await dynDocClient.send(new PutCommand(params));
  } finally {
    // unlock cal_data table
    await unlock();
  }
};

const update = async (event, dynDocClient) => {
  console.log("update: " + JSON.stringify(event));
  const params = {
    TableName: "cal_data",
    Key: {
      PK: event.id,
      SK: event.title,
    },
    UpdateExpression: "set StartDate = :start, EndDate = :end",
    ExpressionAttributeValues: {
      ":start": event.start,
      ":end": event.end,
    },
  };

  await dynDocClient.send(new UpdateCommand(params));
};

const remove = async (event, dynDocClient) => {
  console.log("delete: " + JSON.stringify(event));
  const params = {
    TableName: "cal_data",
    Key: {
      PK: event.id,
      SK: event.title,
    },
  };

  await dynDocClient.send(new DeleteCommand(params));
};

const checkOverlaps = async (event, dynDocClient) => {
  const params = {
    TableName: "cal_data",
    IndexName: "Type-EndDate-index",
    KeyConditionExpression: "#Type = :type AND EndDate > :start",
    FilterExpression: "StartDate < :end",
    ExpressionAttributeValues: {
      ":type": "Event",
      //":start": dayjs(event.start).subtract(1, "day").format("YYYY-MM-DD"),
      ":start": event.start,
      ":end": event.end,
    },
    ExpressionAttributeNames: {
      "#Type": "Type",
    },
  };

  const data = await dynDocClient.send(new QueryCommand(params));

  // throw ApiError
  if (data.Count > 0) {
    let errorData = {
      overlap_start: false,
      overlap_end: false,
    };

    data.Items.forEach((item) => {
      event.start >= item.StartDate ?? (errorData.overlap_start = true);
      event.end <= item.EndDate ?? (errorData.overlap_end = true);
    });

    throw new ApiError(
      global.httpStatus.CONFLICT,
      "event-010",
      "Event overlaps with another",
      errorData
    );
  }
};

module.exports = {
  list,
  create,
  update,
  remove,
};
