"use strict";

const e = require("express");
require("express-async-errors");
const { v4: uuidv4 } = require("uuid");
const dayjs = require("dayjs");

const dynamoLock = require("./dynamo-lock").dynamoLock;

exports.list = async function (req, res) {
  if (!req.query.start || !req.query.end) {
    res.send("Please provide start and end query params");
    return;
  }
  console.log("start: " + req.query.start + ", end: " + req.query.end);

  const params = {
    TableName: "cal_data",
    IndexName: "Type-EndDate-index",
    KeyConditionExpression: "#Type = :type AND EndDate >= :start",
    FilterExpression: "StartDate <= :end",
    ExpressionAttributeValues: {
      ":type": "Event",
      ":start": req.query.start,
      ":end": req.query.end,
    },
    ExpressionAttributeNames: {
      "#Type": "Type",
    },
  };

  try {
    const data = await global.docClient.send(new global.QueryCommand(params));
    const events = data.Items.map((item) => {
      return {
        id: item.PK,
        title: item.SK,
        start: item.StartDate,
        end: item.EndDate,
      };
    });
    res.send(events);
  } catch (err) {
    console.log(err);
  }
};

exports.create = async function (req, res) {
  console.log("create: " + JSON.stringify(req.body));

  const errors = global.validationResult(req);
  if (!errors.isEmpty()) {
    throw new global.ApiError(
      global.httpStatus.BAD_REQUEST,
      "api-030",
      "Validation error",
      errors.array()
    );
  }

  const event = global.matchedData(req);
  event.id = uuidv4();
  console.log("event: " + JSON.stringify(event));

  const unlock = await dynamoLock(global.docClient, "cal_data", "ALL");

  try {
    // check if event overlaps with another
    await checkOverlaps(event);

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

    const data = await global.docClient.send(new global.PutCommand(params));
    console.log(data);
    res.send(event);
  } finally {
    await unlock();
  }
};

async function checkOverlaps(event) {
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

  const data = await global.docClient.send(new global.QueryCommand(params));

  // throw ApiError
  if (data.Count > 0) {
    let errorData = {
      overlap_start: false,
      overlap_end: false,
    };

    data.Items.forEach((item) => {
      if (event.start >= item.StartDate) {
        errorData.overlap_start = true;
      }
      if (event.end <= item.EndDate) {
        errorData.overlap_end = true;
      }
    });

    throw new global.ApiError(
      global.httpStatus.CONFLICT,
      "event-010",
      "Event overlaps with another",
      errorData
    );
  }
}
