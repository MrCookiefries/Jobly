"use strict";

// https://stackoverflow.com/questions/15666144/how-to-remove-module-after-require-in-node-js
// code refactored with inspiration from ^ on Ocotber 1st, 2021
describe("config can come from env", function () {
  beforeEach(() => {
    jest.resetModules();
  });
  afterEach(() => {
    delete process.env.SECRET_KEY;
    delete process.env.PORT;
    delete process.env.BCRYPT_WORK_FACTOR;
    delete process.env.DATABASE_URL;
  });
  test("works", function() {
    process.env.SECRET_KEY = "abc";
    process.env.PORT = "5000";
    process.env.DATABASE_URL = "other";
    process.env.NODE_ENV = "other";

    const config = require("./config");
    expect(config.SECRET_KEY).toEqual("abc");
    expect(config.PORT).toEqual(5000);
    expect(config.dbConfig.database).toEqual("other");
    expect(config.BCRYPT_WORK_FACTOR).toEqual(12);
  });
  test("default database", () => {
    const config = require("./config");
    expect(config.dbConfig.database).toEqual("jobly");
  });
  test("test database", () => {
    process.env.NODE_ENV = "test";
    const config = require("./config");
    expect(config.dbConfig.database).toEqual("jobly_test");
  });
});
