"use strict";

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

module.exports = ApiError;

// exports.ApiError = ApiError;
