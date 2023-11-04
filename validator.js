"use strict";

const { checkSchema, validationResult } = require("express-validator");
const ApiError = require("./ApiError");

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
    isISO8601: {
      errorMessage: "Wrong date format",
    },
    errorMessage: "Start date is required",
  },
  end: {
    in: ["body"],
    isISO8601: {
      errorMessage: "Wrong date format",
    },
    errorMessage: "End date is required",
  },
};

const listEventsSchema = {
  start: {
    in: ["query"],
    isISO8601: {
      errorMessage: "Wrong date format",
    },
    errorMessage: "Start date is required",
  },
  end: {
    in: ["query"],
    isISO8601: {
      errorMessage: "Wrong date format",
    },
    errorMessage: "End date is required",
  },
};

const userLoginSchema = {
  name: {
    in: ["body"],
    isString: true,
    notEmpty: true,
    escape: true,
    errorMessage: "Name is required",
  },
  password: {
    in: ["body"],
    optional: true,
    isString: true,
    notEmpty: false,
    escape: true,
    errorMessage: "Password not valid",
  },
};

exports.checkValidationResult = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "api-030",
      "Validation error",
      errors.array()
    );
  }
  next();
};

exports.listEvents = checkSchema(listEventsSchema);
exports.eventCreate = checkSchema(eventSchema);
exports.userLogin = checkSchema(userLoginSchema);
