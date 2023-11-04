"use strict";

const { matchedData } = require("express-validator");
const { Users } = require("./models/users");

exports.login = async function (req, res) {
  console.log("login: " + JSON.stringify(req.body));
  const user = matchedData(req);
  const users = new Users(global.docClient);
  const userFromDB = await users.login(user);

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
  res.send(userFromDB);
};
