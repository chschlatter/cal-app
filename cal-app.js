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

const client = new DynamoDBClient({});
global.docClient = DynamoDBDocumentClient.from(client);

global.httpStatus = require("http-status");

const {
  body,
  checkSchema,
  validationResult,
  matchedData,
} = require("express-validator");
global.validationResult = validationResult;
global.matchedData = matchedData;

const eventSchema = {
  title: {
    in: ["body"],
    isString: true,
    notEmpty: true,
    escape: true,
    errorMessage: "Title is required",
  },
  start: {
    in: ["body"],
    isDate: {
      options: {
        format: "YYYY-MM-DD",
      },
      errorMessage: "Wrong date format",
    },
    errorMessage: "Start date is required",
  },
  end: {
    in: ["body"],
    isDate: {
      options: {
        format: "YYYY-MM-DD",
      },
      errorMessage: "Wrong date format",
    },
    errorMessage: "End date is required",
  },
};

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
app.post("/api/events", checkSchema(eventSchema), event.create);

// error handler for ApiError
app.use(function (err, req, res, next) {
  if (err instanceof ApiError) {
    res.status(err.status).json(err);
  } else {
    next(err);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
