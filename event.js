"use strict";

const events = require("./models/events");
const users = require("./models/users");
const ApiError = require("./ApiError");
const { matchedData } = require("express-validator");

const dynamoLock = require("./dynamo-lock").dynamoLock;

exports.list = async function (req, res) {
  console.log("list: " + JSON.stringify(req.query));

  const eventList = matchedData(req);
  const data = await events.list(
    eventList.start,
    eventList.end,
    global.docClient
  );
  res.send(data);
};

exports.create = async function (req, res) {
  console.log("create: " + JSON.stringify(req.body));

  const event = matchedData(req);
  if (req.user.role == "admin") {
    try {
      await users.get(event.title, global.docClient);
    } catch (err) {
      throw new ApiError(
        global.httpStatus.BAD_REQUEST,
        "event-012",
        "Event title is not a known user"
      );
    }
  }

  // authorization
  if (req.user.role === "user" && event.title !== req.user.name) {
    throw new ApiError(
      global.httpStatus.FORBIDDEN,
      "api-020",
      "Not authorized"
    );
  }

  await events.create(event, global.docClient);
  res.send(event);
};

exports.delete = async function (req, res) {
  console.log("delete: " + JSON.stringify(req.params));

  const event = matchedData(req);
  // throws ApiError if event does not exist
  const eventFromDB = await events.get(event.id, global.docClient);

  // Users can only delete their own events
  if (req.user.role == "user" && eventFromDB.title !== req.user.name) {
    throw new ApiError(
      global.httpStatus.FORBIDDEN,
      "api-020",
      "Not authorized"
    );
  }

  await events.remove(event.id, global.docClient);
  res.send(event);
};
