"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(filterOptions) {
    // get the filter options if there are any
    const {name, minEmployees, maxEmployees} = filterOptions || {};

    // throw error when the min employee filter is greater than the max
    if ((minEmployees && maxEmployees) && +minEmployees > +maxEmployees)
      throw new BadRequestError("Min employees can't be greater than max.");

    let whereCondition = ``;
    const values = [];
    let index = 1;

    /**
     * Adds on a "where" or "and" to the whereCondition
     * Adds a new value to values
     * @param {String | Number} val filter value
     * @param {Boolean} isNumber is val a number?
     * @returns true if the filter value is valid
     */
    function handleWhereOrAnd(val, isNumber = true) {
      if (val === undefined) return;
      whereCondition += whereCondition ? " AND ": "WHERE ";
      values.push(isNumber ? +val: `%${val}%`);
      return true;
    }

    // build the whereCondition & values string & array out with the filter options
    if (handleWhereOrAnd(name, false)) whereCondition += `name ILIKE $${index++}`;
    if (handleWhereOrAnd(minEmployees)) whereCondition += `num_employees >= $${index++}`;
    if (handleWhereOrAnd(maxEmployees)) whereCondition += `num_employees <= $${index++}`;

    const companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ${whereCondition}
           ORDER BY name`, values
          );
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    // https://dba.stackexchange.com/questions/69655/select-columns-inside-json-agg
    // help taken from ^ on October 5th, 2021
    // "json_build_object" inside of "json_agg" to create a nice data scructure
    const companyRes = await db.query(
          `SELECT c.handle,
                  c.name,
                  c.description,
                  c.num_employees AS "numEmployees",
                  c.logo_url AS "logoUrl",
                  JSON_AGG(
                    JSON_BUILD_OBJECT(
                      'id', j.id,
                      'title', j.title,
                      'salary', j.salary,
                      'equity', j.equity
                    )
                  ) AS jobs
           FROM companies c
           LEFT JOIN jobs j ON j.company_handle = c.handle
           WHERE c.handle = $1
           GROUP BY handle`,
        [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
