"use strict";

const ApiError = require("../ApiError");
const {
  GetCommand,
  QueryCommand,
  PutCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { createHash } = require("crypto");

const login = async (user, dynDocClient) => {
  const params = {
    TableName: "cal_users",
    Key: {
      name: user.name,
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

  return data.Item;
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
    TableName: "cal_users",
    Item: {
      name: user.name,
      role: user.role,
      password: user.password ?? "",
    },
    ConditionExpression: "attribute_not_exists(#name)",
    ExpressionAttributeNames: {
      "#name": "name",
    },
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

const get = async (userName, dynDocClient) => {
  const params = {
    TableName: "cal_users",
    Key: {
      name: userName,
    },
  };

  const data = await dynDocClient.send(new GetCommand(params));
  if (!data.Item) {
    throw new ApiError(
      global.httpStatus.NOT_FOUND,
      "user-011",
      "User not found"
    );
  }

  return data.Item;
};

const list = async (dynDocClient) => {
  // scan cal_users table
  // return all users
  const params = {
    TableName: "cal_users",
  };

  const data = await dynDocClient.send(new ScanCommand(params));
  return data.Items.map((item) => {
    return {
      name: item.name,
      role: item.role,
    };
  });
};

const remove = async (user, dynDocClient) => {
  const params = {
    TableName: "cal_users",
    Key: {
      name: user.name,
    },
  };

  await dynDocClient.send(new DeleteCommand(params));
};

module.exports = {
  login,
  create,
  get,
  list,
  remove,
};
