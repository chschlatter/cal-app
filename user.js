"use strict";

const { matchedData } = require("express-validator");
const Users = require("./models/users");

exports.login = async function (req, res) {
  console.log("login: " + JSON.stringify(req.body));
  const user = matchedData(req);
  const userFromDB = await Users.login(user, global.docClient);

  if (userFromDB.role === "admin") {
    if (!user.password) {
      res.status(global.httpStatus.BAD_REQUEST).send({
        code: "auth-012",
        message: "Admin user must have a password",
      });
      return;
    }
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256");
    hash.update(user.password);
    user.password = hash.digest("hex");
    if (user.password !== userFromDB.password) {
      res.status(global.httpStatus.UNAUTHORIZED).send({
        code: "api-020",
        message: "Not authorized",
      });
      return;
    }
  }

  const jwt = require("jsonwebtoken");
  const token = jwt.sign(
    {
      name: userFromDB.name,
      role: userFromDB.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );
  res.cookie("access_token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    encode: String,
  });
  res.json({
    name: userFromDB.name,
    role: userFromDB.role,
  });
};

exports.create = async function (req, res) {
  // authorization
  if (req.user.role !== "admin") {
    throw new ApiError(
      global.httpStatus.FORBIDDEN,
      "api-020",
      "Not authorized"
    );
  }

  const user = matchedData(req);
  await Users.create(user, global.docClient);
  res.json({
    name: user.name,
    role: user.role,
  });
};
