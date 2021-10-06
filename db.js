"use strict";
/** Database setup for jobly. */
const { Client } = require("pg");
const { dbConfig } = require("./config");

let db;

if (process.env.NODE_ENV === "production") {
  db = new Client({
    ...dbConfig,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  db = new Client({
    ...dbConfig
  });
}

db.connect();

module.exports = db;
