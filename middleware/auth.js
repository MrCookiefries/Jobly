"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError, ForbiddenError } = require("../expressError");


/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      res.locals.user = jwt.verify(token, SECRET_KEY); // why not stored on request?
    }
    return next();
  } catch (err) {
    return next();
  }
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  try {
    if (!res.locals.user) throw new UnauthorizedError();
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware only to use after ensureLoggedIn
 * Checks if the logged in user is also an admin
 * If not, throws a Forbidden error.
 */
function ensureIsAdmin(req, res, next) {
  try {
    if (!res.locals.user.isAdmin) throw new ForbiddenError();
    return next();
  } catch (err) {
    return next(err);
  }
}

/**Middleware only to use after ensureLoggedIn
 * Checks if the logged in user is an admin or if they're
 * the same user in the request params. If they're not
 * throw a forbidden error.
 */
function ensureAdminOrRightUser(req, res, next) {
  try {
    const isAdmin = (res.locals.user.isAdmin);
    const isRightUser = (req.params.username === res.locals.user.username);
    if (!isAdmin && !isRightUser) throw new ForbiddenError();
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureIsAdmin,
  ensureAdminOrRightUser
};
