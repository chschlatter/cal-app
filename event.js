"use strict";

const Events = require("./models/events");
const ApiError = require("./ApiError");

const { matchedData } = require("express-validator");

const dynamoLock = require("./dynamo-lock").dynamoLock;

exports.list = async function (req, res) {
  console.log("list: " + JSON.stringify(req.query));

  const eventList = matchedData(req);
  const events = new Events(global.docClient);
  const data = await events.list(eventList.start, eventList.end);
  res.send(data);
};

exports.create = async function (req, res) {
  console.log("create: " + JSON.stringify(req.body));

  // authorization
  const event = matchedData(req);
  if (event.title !== req.user.name) {
    throw new ApiError(
      global.httpStatus.FORBIDDEN,
      "api-020",
      "Not authorized"
    );
  }

  const events = new Events(global.docClient);
  await events.create(event);
  res.send(event);
};
