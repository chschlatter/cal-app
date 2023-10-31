"use strict";

require("dotenv").config();

const path = require("path");
const bodyParser = require("body-parser");

const express = require("express");
const app = express();
const port = 3000;

const DynamoDBClient = require("@aws-sdk/client-dynamodb").DynamoDBClient;
const DynamoDBDocumentClient =
  require("@aws-sdk/lib-dynamodb").DynamoDBDocumentClient;
const GetCommand = require("@aws-sdk/lib-dynamodb").GetCommand;
global.QueryCommand = require("@aws-sdk/lib-dynamodb").QueryCommand;
global.PutCommand = require("@aws-sdk/lib-dynamodb").PutCommand;
global.DeleteCommand = require("@aws-sdk/lib-dynamodb").DeleteCommand;
global.UpdateCommand = require("@aws-sdk/lib-dynamodb").UpdateCommand;

const client = new DynamoDBClient({});
global.docClient = DynamoDBDocumentClient.from(client);

global.httpStatus = require("http-status");

const validator = require("./validator");

class ApiError extends Error {
  constructor(status, code, msg, data) {
    super(msg);
    this.status = status;
    this.code = code;
    this.data = data;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }
}
global.ApiError = ApiError;

const event = require("./event");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/events", event.list);
app.post("/api/events", validator.eventCreate, event.create);

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
