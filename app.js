"use strict";

/** Express app for jobly. */

const express = require("express");
const cors = require("cors");
const { NotFoundError } = require("./expressError");
const { authenticateJWT } = require("./middleware/auth");
const morgan = require("morgan");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));
app.use(authenticateJWT);

const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

const companiesRoutes = require("./routes/companies");
app.use("/companies", companiesRoutes);

const usersRoutes = require("./routes/users");
app.use("/users", usersRoutes);

const jobsRoutes = require("./routes/jobs");
app.use("/jobs", jobsRoutes);

/** Handle 404 errors -- this matches everything */
app.use(function (req, res, next) {
  return next(new NotFoundError());
});

/** Generic error handler; anything unhandled goes here. */
app.use(function (err, req, res, next) {
  if (process.env.NODE_ENV !== "test") console.error(err.stack);
  const status = err.status || 500;
  const message = err.message;

  return res.status(status).json({
    error: { message, status },
  });
});

module.exports = app;
