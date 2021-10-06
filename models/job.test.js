"use strict";
process.env.NODE_ENV = "test";

const db = require("../db.js");
const { NotFoundError, BadRequestError } = require("../expressError");
const Job = require("./job");
const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
    const newJob = {
        title: "new",
        salary: 80000,
        equity: "0", // PGSQL Numeric type too large for JS nums, so it's a string
        companyHandle: "c3"
    };

    test("works", async function () {
        let job = await Job.create(newJob);
        expect(job).toEqual(
            expect.objectContaining({
                id: expect.any(Number),
                ...newJob
            })
        );

        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle AS "companyHandle"
            FROM jobs WHERE id = $1`, [job.id]
        );

        expect(result.rows).toEqual([
            expect.objectContaining({
                id: expect.any(Number),
                ...newJob
            })
        ]);
    });
});

/************************************** findAll */

describe("findAll", function () {
    let filters;
    beforeEach(() => {
        filters = {
            title: "2",
            minSalary: 60000,
            hasEquity: "true"
        };
    });

    test("works: no filter", async function () {
        let jobs = await Job.findAll();
        expect(jobs).toEqual([
            expect.objectContaining({
                companyHandle: "c1",
                equity: "0",
                id: expect.any(Number),
                salary: 80000,
                title: "j1"
            }),
            expect.objectContaining({
                companyHandle: "c1",
                equity: "0",
                id: expect.any(Number),
                salary: 80000,
                title: "j2"
            }),
            expect.objectContaining({
                companyHandle: "c2",
                equity: "0",
                id: expect.any(Number),
                salary: 80000,
                title: "j3"
            })
        ]);
    });

    test("works: title filter", async function () {
        const { title } = filters;
        let jobs = await Job.findAll({ title });
        expect(jobs).toEqual([
            expect.objectContaining({
                companyHandle: "c1",
                equity: "0",
                id: expect.any(Number),
                salary: 80000,
                title: "j2"
            })
        ]);
    });

    test("works: minSalary filter", async function () {
        const { minSalary } = filters;
        let jobs = await Job.findAll({ minSalary });
        expect(jobs).toEqual([
            expect.objectContaining({
                companyHandle: "c1",
                equity: "0",
                id: expect.any(Number),
                salary: 80000,
                title: "j1"
            }),
            expect.objectContaining({
                companyHandle: "c1",
                equity: "0",
                id: expect.any(Number),
                salary: 80000,
                title: "j2"
            }),
            expect.objectContaining({
                companyHandle: "c2",
                equity: "0",
                id: expect.any(Number),
                salary: 80000,
                title: "j3"
            })
        ]);
    });

    test("works: hasEquity filter", async function () {
        const { hasEquity } = filters;
        let jobs = await Job.findAll({ hasEquity });
        expect(jobs).toEqual([]);
    });

    test("works: title & minSalary filters", async function () {
        delete filters.hasEquity;
        let jobs = await Job.findAll(filters);
        expect(jobs).toEqual([
            expect.objectContaining({
                companyHandle: "c1",
                equity: "0",
                id: expect.any(Number),
                salary: 80000,
                title: "j2"
            })
        ]);
    });

    test("fails: error with filters", async function () {
        filters.minSalary = "not a number";
        await expect(() => Job.findAll(filters))
            .rejects
            .toThrow(BadRequestError);
    });

    test("works: filters don't match any", async () => {
        const title = "ajsghjakghkagss";
        const minSalary = 800000;
        expect(await Job.findAll({ title })).toEqual([]);
        expect(await Job.findAll({ minSalary })).toEqual([]);
    });
});

/************************************** get */

describe("get", function () {
    let testJob;

    beforeEach(async () => {
        const result = await db.query(
            `SELECT id, company_handle AS "companyHandle", equity, salary, title
            FROM jobs LIMIT 1`
        );
        testJob = result.rows[0];
    });

    test("works", async function () {
        let job = await Job.get(testJob.id);
        expect(job).toEqual(expect.objectContaining({
            ...testJob
        }));
    });

    test("not found if no such job", async function () {
        try {
            await Job.get(0);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/************************************** update */

describe("update", function () {
    const updateData = {
        equity: "0.20002456",
        title: "New Title",
        salary: 100000
    };
    let testJob;

    beforeEach(async () => {
        const result = await db.query(
            `SELECT id, company_handle AS "companyHandle"
            FROM jobs LIMIT 1`
        );
        testJob = result.rows[0];
    });

    test("works", async function () {
        let job = await Job.update(testJob.id, updateData);
        expect(job).toEqual({
            id: testJob.id,
            companyHandle: testJob.companyHandle,
            ...updateData,
        });

        const result = await db.query(
            `SELECT id, company_handle AS "companyHandle", salary, equity, title
            FROM jobs WHERE id = $1`, [testJob.id]
        );
        expect(result.rows).toEqual([expect.objectContaining({
            id: testJob.id,
            companyHandle: testJob.companyHandle,
            ...updateData
        })]);
    });

    test("works: null fields", async function () {
        const updateDataSetNulls = {
            equity: null,
            title: "New Title",
            salary: null
        };

        let job = await Job.update(testJob.id, updateDataSetNulls);
        expect(job).toEqual(expect.objectContaining({
            id: testJob.id,
            companyHandle: testJob.companyHandle,
            ...updateDataSetNulls
        }));

        const result = await db.query(
            `SELECT id, company_handle AS "companyHandle", salary, equity, title
            FROM jobs WHERE id = $1`, [testJob.id]
        );
        expect(result.rows).toEqual([expect.objectContaining({
            id: testJob.id,
            companyHandle: testJob.companyHandle,
            ...updateDataSetNulls
        })]);
    });

    test("not found if no such job", async function () {
        try {
            await Job.update(0, updateData);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

    test("bad request with no data", async function () {
        try {
            await Job.update(testJob.id, {});
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/************************************** remove */

describe("remove", function () {
    let testId;

    beforeEach(async () => {
        const result = await db.query(
            `SELECT id FROM jobs LIMIT 1`
        );
        testId = result.rows[0].id;
    });

    test("works", async function () {
        await Job.remove(testId);
        const res = await db.query(
            "SELECT id FROM jobs WHERE id = $1", [testId]
        );
        expect(res.rows.length).toEqual(0);
    });

    test("not found if no such job", async function () {
        try {
            await Job.remove(0);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});
