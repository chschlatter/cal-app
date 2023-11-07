"use strict";

const { unless } = require("express-unless");
const jwt = require("jsonwebtoken");
const ApiError = require("./ApiError");

exports.authorization = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) {
    const error = new ApiError(
      global.httpStatus.UNAUTHORIZED,
      "api-020",
      "Not authorized"
    );
    throw error;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);
    req.user = {
      name: decoded.name,
      role: decoded.role,
    };
    next();
  } catch (err) {
    console.error(err);
    throw new ApiError(
      global.httpStatus.UNAUTHORIZED,
      "api-020",
      "Not authorized"
    );
  }
};
exports.authorization.unless = unless;

exports.needsRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      throw new ApiError(
        global.httpStatus.FORBIDDEN,
        "api-020",
        "Not authorized"
      );
    }
    next();
  };
};
