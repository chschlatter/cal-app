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

const auth = require("./auth");

const event = require("./event");
const user = require("./user");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(cookieParser());
app.use("/api/*", auth.authorization.unless({ path: ["/api/users/login"] }));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/api/events", validator.validate("listEvents"), event.list);
app.post("/api/events", validator.validate("createEvent"), event.create);
app.delete("/api/events/:id", validator.validate("deleteEvent"), event.delete);
app.post("/api/users/login", validator.validate("userLogin"), user.login);
app.get("/api/users", auth.needsRole("admin"), user.list);
app.post(
  "/api/users",
  auth.needsRole("admin"),
  validator.validate("createUser"),
  user.create
);
app.delete(
  "/api/users/:name",
  auth.needsRole("admin"),
  validator.validate("deleteUser"),
  user.delete
);

app.get("/api/auth", (req, res) => {
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
