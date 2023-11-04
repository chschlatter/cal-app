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

class Users {
  constructor(dynamodbDocumentClient) {
    this.dynamodbDocumentClient = dynamodbDocumentClient;
  }

  async login(user) {
    const params = {
      TableName: "cal_data",
      Key: {
        PK: "USER#" + user.name,
        SK: "USER",
      },
    };

    const data = await this.dynamodbDocumentClient.send(new GetCommand(params));
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
    };
  }
}

exports.Users = Users;
