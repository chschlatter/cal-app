"use strict";

const { checkSchema, validationResult } = require("express-validator");
const ApiError = require("./ApiError");
const e = require("express");

const schemas = {
  createEvent: {
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
  },
  listEvents: {
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
  },
  deleteEvent: {
    id: {
      in: ["params"],
      isString: true,
      notEmpty: true,
      escape: true,
      errorMessage: "Id is required",
    },
  },
  userLogin: {
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
  },
  createUser: {
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
      notEmpty: true,
      escape: true,
      errorMessage: "Password not valid",
    },
    role: {
      in: ["body"],
      isString: true,
      notEmpty: true,
      escape: true,
      errorMessage: "Role is required",
    },
  },
  deleteUser: {
    name: {
      in: ["params"],
      isString: true,
      notEmpty: true,
      escape: true,
      errorMessage: "Name is required",
    },
  },
};

exports.validate = (schema) => {
  return async (req, res, next) => {
    if (!schemas[schema]) throw new Error(`Schema ${schema} not found`);
    await checkSchema(schemas[schema]).run(req);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(
        global.httpStatus.BAD_REQUEST,
        "api-030",
        "Validation error",
        errors.array()
      );
    }
    next();
  };
};
