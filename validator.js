"use strict";

const { checkSchema } = require("express-validator");

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

exports.eventCreate = checkSchema(eventSchema);
