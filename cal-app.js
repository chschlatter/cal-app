"use strict";

require("dotenv").config();

const path = require("path");

const cookieParser = require("cookie-parser");

const express = require("express");
require("express-async-errors");
const app = express();
const port = 3000;

const DynamoDBClient = require("@aws-sdk/client-dynamodb").DynamoDBClient;
const DynamoDBDocumentClient =
  require("@aws-sdk/lib-dynamodb").DynamoDBDocumentClient;

const client = new DynamoDBClient({});
global.docClient = DynamoDBDocumentClient.from(client);

global.httpStatus = require("http-status");

const ApiError = require("./ApiError");
const validator = require("./validator");

const event = require("./event");
const user = require("./user");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const authorize = require("./auth").authorization;
app.use(cookieParser());
app.use(
  "/api/*",
  authorize.unless({ path: ["/api/users/login", "/api/users"] })
);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get(
  "/api/events",
  validator.listEvents,
  validator.checkValidationResult,
  event.list
);
app.post(
  "/api/events",
  validator.eventCreate,
  validator.checkValidationResult,
  event.create
);

app.post(
  "/api/users/login",
  validator.userLogin,
  validator.checkValidationResult,
  user.login
);

app.post(
  "/api/users",
  validator.createUser,
  validator.checkValidationResult,
  user.create
);

app.get("/api/auth", authorize, (req, res) => {
  console.log(req.user);
  res.json(req.user);
});

// error handler for ApiError
app.use(function (err, req, res, next) {
  if (err instanceof ApiError) {
    res.status(err.status).json(err);
  } else {
    next(err);
  }
});

// default error handler
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).json({
    code: "api-999",
    message: "Internal Server Error",
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
