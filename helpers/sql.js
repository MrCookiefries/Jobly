const { BadRequestError } = require("../expressError");

/**
 * Transforms a set of key values to be updated into a SQL statement
 * with an array of values to update them with.
 * @param {Object} dataToUpdate column names & values
 * @param {Object} jsToSql mapping of JS naming to SQL naming
 * @returns {Object} of {String} SQL statement & {Array} of values
 */
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  // get the columns to update
  const keys = Object.keys(dataToUpdate);
  // if there is none, get out of this function
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  ); // map the keys to SQL names & index based values

  return {
    setCols: cols.join(", "), // SQL statement with variables
    values: Object.values(dataToUpdate), // Array of values
  };
}

module.exports = { sqlForPartialUpdate };
