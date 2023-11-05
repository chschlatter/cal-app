"use strict";

const e = require("express");
const ApiError = require("../ApiError");
const {
  GetCommand,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { createHash } = require("crypto");

const login = async (user, dynDocClient) => {
  const params = {
    TableName: "cal_data",
    Key: {
      PK: "USER#" + user.name,
      SK: "USER",
    },
  };

  const data = await dynDocClient.send(new GetCommand(params));
  if (!data.Item) {
    throw new ApiError(
      global.httpStatus.UNAUTHORIZED,
      "api-020",
      "Not authorized"
    );
  }

  return {
    name: data.Item.PK.split("#")[1],
    role: data.Item.Role,
    password: data.Item.Password,
  };
};

const create = async (user, dynDocClient) => {
  if (!user.password && user.role == "admin") {
    throw new ApiError(
      global.httpStatus.BAD_REQUEST,
      "user-012",
      "Admin user must have a password"
    );
  }
  if (user.password) {
    const hash = createHash("sha256");
    hash.update(user.password);
    user.password = hash.digest("hex");
  }
  const params = {
    TableName: "cal_data",
    Item: {
      PK: "USER#" + user.name,
      SK: "USER",
      Role: user.role,
      Password: user.password ?? "",
      Type: "User",
    },
    ConditionExpression: "attribute_not_exists(PK)",
  };

  try {
    await dynDocClient.send(new PutCommand(params));
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      throw new ApiError(
        global.httpStatus.CONFLICT,
        "user-010",
        "User already exists"
      );
    } else {
      throw err;
    }
  }
};

module.exports = {
  login,
  create,
};
