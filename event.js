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
  await events.create(event, req.user, global.docClient);
  res.send(event);
};

exports.update = async function (req, res) {
  console.log("update: " + JSON.stringify(req.body));
  const event = matchedData(req);
  await events.update(event, req.user, global.docClient);
  res.send(event);
};

exports.delete = async function (req, res) {
  console.log("delete: " + JSON.stringify(req.params));
  const event = matchedData(req);
  await events.remove(event.id, req.user, global.docClient);
  res.send(event);
};
