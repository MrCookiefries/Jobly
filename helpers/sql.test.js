process.env.NODE_ENV = "test";
const request = require("supertest");
const {sqlForPartialUpdate} = require("./sql");
const {BadRequestError} = require("../expressError");

describe("sqlForPartialUpdate()", () => {
    let dataToUpdate, jsToSql;
    beforeEach(() => {
        dataToUpdate = {
            firstName: "Bobby",
            age: 24
        };
        jsToSql = {
            firstName: "first_name"
        };
    });
    test("right return values", () => {
        const {setCols, values} = sqlForPartialUpdate(
            dataToUpdate, jsToSql
        );
        expect(setCols).toEqual(expect.any(String));
        expect(setCols).toEqual('"first_name"=$1, "age"=$2');
        expect(values).toEqual(expect.any(Array));
        expect(values).toEqual(["Bobby", 24]);
    });
    test("no data to update", () => {
        expect(() => sqlForPartialUpdate({}, {})).toThrow(BadRequestError);
    });
});
