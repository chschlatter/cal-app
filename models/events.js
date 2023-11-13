"use strict"; // Path: models/events.js

const ApiError = require("../ApiError");
const {
  GetCommand,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const dayjs = require("dayjs");
const dynamoLock = require("../dynamo-lock").dynamoLock;
const { v4: uuidv4 } = require("uuid");
const users = require("./users");

/**
 * List events
 * @param {String} start
 * @param {String} end
 * @param {Object} dynDocClient
 * @returns {Array} events
 * @throws ApiError if start or end is not provided
 */
const list = async (start, end, dynDocClient) => {
  if (!start || !end) {
    throw new Error("Please provide start and end query params");
  }

  const params = {
    TableName: "cal_events",
    IndexName: "type-end-index",
    KeyConditionExpression: "#type = :type AND #end >= :start",
    FilterExpression: "#start <= :end",
    ExpressionAttributeValues: {
      ":type": "event",
      ":start": start,
      ":end": end,
    },
    ExpressionAttributeNames: {
      "#type": "type",
      "#start": "start",
      "#end": "end",
    },
  };
  const data = await dynDocClient.send(new QueryCommand(params));
  return data.Items;
};

/**
 * Create event
 * @param {Object} event
 * @param {Object} dynDocClient
 * @throws ApiError if event overlaps with another
 * @throws ApiError if event title is not a known user
 */
const create = async (event, user, dynDocClient) => {
  console.log("create: " + JSON.stringify(event));
  event.id = uuidv4();

  // Non-admin users can only create events for themselves
  if (user.role == "user") {
    event.title = user.name;
  }

  // lock cal_data table
  const unlock = await dynamoLock(dynDocClient, "cal_events");

  try {
    // check if event title is a known user
    await users.get(event.title, dynDocClient);
    // check if event overlaps with another
    await checkOverlaps(event, dynDocClient);

    event.type = "event";
    const params = {
      TableName: "cal_events",
      Item: event,
    };
    await dynDocClient.send(new PutCommand(params));
  } finally {
    // unlock cal_data table
    await unlock();
  }
};

/**
 * Update event
 * @param {Object} event
 * @param {Object} user
 * @param {Object} dynDocClient
 * @throws ApiError if event overlaps with another
 * @throws ApiError if event title is not a known user
 * @throws ApiError if user is not admin and event title is not the user name
 */
const update = async (event, user, dynDocClient) => {
  const params = {
    TableName: "cal_events",
    Key: {
      id: event.id,
    },
    UpdateExpression: "set #start = :start, #end = :end, title = :title",
    ExpressionAttributeValues: {
      ":start": event.start,
      ":end": event.end,
      ":title": event.title,
    },
    ExpressionAttributeNames: {
      "#start": "start",
      "#end": "end",
    },
  };

  // Non-admin users can only update their own events
  if (user.role == "user") {
    const existingEvent = await get(event.id, dynDocClient);
    if (existingEvent.title !== user.name) {
      throw new ApiError(
        global.httpStatus.FORBIDDEN,
        "api-020",
        "Not authorized"
      );
    }
  }

  // lock cal_data table
  const unlock = await dynamoLock(dynDocClient, "cal_events");
  try {
    // check if event title is a known user
    await users.get(event.title, dynDocClient);
    // check if event overlaps with another
    await checkOverlaps(event, dynDocClient);
    // update event
    try {
      await dynDocClient.send(new UpdateCommand(params));
    } catch (err) {
      if (err.code === "ResourceNotFoundException") {
        throw new ApiError(
          global.httpStatus.NOT_FOUND,
          "event-011",
          "Event not found"
        );
      } else {
        throw err;
      }
    }
  } finally {
    // unlock cal_data table
    await unlock();
  }
};

/**
 * Delete event
 * @param {String} eventId
 * @param {Object} user
 * @param {Object} dynDocClient
 * @throws ApiError if event not found
 * @throws ApiError if user is not admin and event title is not the user name
 */
const remove = async (eventId, user, dynDocClient) => {
  console.log("delete eventId: " + eventId + " from cal_events");
  const params = {
    TableName: "cal_events",
    Key: {
      id: eventId,
    },
  };

  // Non-admin users can only delete their own events
  if (user.role == "user") {
    const event = await get(eventId, dynDocClient);
    if (event.title !== user.name) {
      throw new ApiError(
        global.httpStatus.FORBIDDEN,
        "api-020",
        "Not authorized"
      );
    }
  }

  try {
    await dynDocClient.send(new DeleteCommand(params));
  } catch (err) {
    if (err.code === "ResourceNotFoundException") {
      throw new ApiError(
        global.httpStatus.NOT_FOUND,
        "event-011",
        "Event not found"
      );
    } else {
      throw err;
    }
  }
};

/**
 * Get event by id
 * @param {String} eventId
 * @param {Object} dynDocClient
 * @returns {Object} event
 * @throws ApiError if event not found
 */
const get = async (eventId, dynDocClient) => {
  const params = {
    TableName: "cal_events",
    Key: {
      id: eventId,
    },
  };

  const data = await dynDocClient.send(new GetCommand(params));
  if (!data.Item) {
    throw new ApiError(
      global.httpStatus.NOT_FOUND,
      "event-011",
      "Event not found"
    );
  }
  return data.Item;
};

/**
 * Check if event overlaps with another
 * @param {Object} event
 * @param {Object} dynDocClient
 * @throws ApiError if event overlaps with another
 */
const checkOverlaps = async (event, dynDocClient) => {
  const params = {
    TableName: "cal_events",
    IndexName: "type-end-index",
    KeyConditionExpression: "#type = :type AND #end > :start",
    FilterExpression: "#start < :end",
    ExpressionAttributeValues: {
      ":type": "event",
      ":start": dayjs(event.start).add(1, "day").format("YYYY-MM-DD"),
      ":end": dayjs(event.end).add(-1, "day").format("YYYY-MM-DD"),
    },
    ExpressionAttributeNames: {
      "#type": "type",
      "#start": "start",
      "#end": "end",
    },
  };

  const data = await dynDocClient.send(new QueryCommand(params));

  // throw ApiError if event overlaps with another
  if (data.Count > 0) {
    let errorData = {
      overlap_start: false,
      overlap_end: false,
    };

    data.Items.forEach((item) => {
      if (item.id === event.id) {
        return;
      }
      if (event.start >= item.start) {
        errorData.overlap_start = true;
      }
      if (event.end <= item.end) {
        errorData.overlap_end = true;
      }
    });

    if (errorData.overlap_start || errorData.overlap_end) {
      throw new ApiError(
        global.httpStatus.CONFLICT,
        "event-010",
        "Event overlaps with another",
        errorData
      );
    }
  }
};

module.exports = {
  list,
  create,
  update,
  get,
  remove,
};
