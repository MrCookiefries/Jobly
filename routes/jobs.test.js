"use strict";
process.env.NODE_ENV = "test";
const request = require("supertest");

const db = require("../db");
const app = require("../app");
const { BadRequestError } = require("../expressError");

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    u1Token,
    u2Token
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
    const newJob = {
        title: "new job",
        salary: 80000,
        equity: "0",
        companyHandle: "c3"
    };

    test("works for admins", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            job: expect.objectContaining({
                id: expect.any(Number),
                ...newJob
            }),
        });
    });

    test("forbidden for users", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(403);
    });

    test("unathorized for anon", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob);
        expect(resp.statusCode).toEqual(401);
    });

    test("bad request with missing data", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send({
                salary: 80000,
                equity: "0"
            })
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request with invalid data", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send({
                ...newJob,
                salary: "not-a-number"
            })
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(400);
    });
});

/************************************** GET /companies */

describe("GET /jobs", function () {
    test("ok for anon", async function () {
        const resp = await request(app).get("/jobs");
        expect(resp.body).toEqual({
            jobs: [
                expect.objectContaining({
                    id: expect.any(Number),
                    title: "j1",
                    salary: 80000,
                    equity: "0",
                    companyHandle: "c1"
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: "j2",
                    salary: 80000,
                    equity: "0",
                    companyHandle: "c1"
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    title: "j3",
                    salary: 80000,
                    equity: "0",
                    companyHandle: "c2"
                })
            ]
        });
    });

    test("works with title filter", async function () {
        const resp = await request(app).get(`/jobs?title=2`);
        expect(resp.body).toEqual({
            jobs: [
                expect.objectContaining({
                    id: expect.any(Number),
                    title: "j2",
                    salary: 80000,
                    equity: "0",
                    companyHandle: "c1"
                })
            ]
        });
    });

    test("works with minSalary filter", async function () {
        const resp = await request(app).get(`/jobs?minSalary=800000`);
        expect(resp.body).toEqual({
            jobs: []
        });
    });

    test("works with hasEquity filter", async function () {
        const resp = await request(app).get(`/jobs?hasEquity=true`);
        expect(resp.body).toEqual({
            jobs: []
        });
    });

    test("works with minSalary & title filters", async function () {
        const resp = await request(app).get(`/jobs?title=2&minSalary=60000`);
        expect(resp.body).toEqual({
            jobs: [
                expect.objectContaining({
                    id: expect.any(Number),
                    title: "j2",
                    salary: 80000,
                    equity: "0",
                    companyHandle: "c1"
                })
            ]
        });
    });

    test("fails: test next() handler", async function () {
        // there's no normal failure event which will cause this route to fail ---
        // thus making it hard to test that the error-handler works with it. This
        // should cause an error, all right :)
        await db.query("DROP TABLE jobs CASCADE");
        const resp = await request(app)
            .get("/jobs")
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(500);
    });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
    let testJob;
    beforeEach(async () => {
        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle AS "companyHandle"
            FROM jobs LIMIT 1`
        );
        testJob = result.rows[0];
    });
    test("works for anon", async function () {
        const resp = await request(app).get(`/jobs/${testJob.id}`);
        expect(resp.body).toEqual({
            job: expect.objectContaining({
                ...testJob
            })
        });
    });

    test("not found for no such job", async function () {
        const resp = await request(app).get(`/jobs/0`);
        expect(resp.statusCode).toEqual(404);
    });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
    let testJob;
    beforeEach(async () => {
        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle AS "companyHandle"
            FROM jobs LIMIT 1`
        );
        testJob = result.rows[0];
    });

    test("works for admins", async function () {
        const updateData = {
            salary: 100000,
            title: "updated title"
        };
        const resp = await request(app)
            .patch(`/jobs/${testJob.id}`)
            .send(updateData)
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.body).toEqual({
            job: expect.objectContaining({
                ...testJob,
                ...updateData
            })
        });
    });

    test("forbidden for users", async function () {
        const resp = await request(app)
            .patch(`/jobs/${testJob.id}`)
            .send({
                title: "something"
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toBe(403);
    });

    test("unauth for anon", async function () {
        const resp = await request(app)
            .patch(`/jobs/${testJob.id}`)
            .send({
                title: "cosita",
            });
        expect(resp.statusCode).toEqual(401);
    });

    test("not found on no such job", async function () {
        const resp = await request(app)
            .patch(`/jobs/0`)
            .send({
                title: "new title"
            })
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(404);
    });

    test("bad request on handle change attempt", async function () {
        const resp = await request(app)
            .patch(`/jobs/${testJob.id}`)
            .send({
                id: 26
            })
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request on invalid data", async function () {
        const resp = await request(app)
            .patch(`/jobs/${testJob.id}`)
            .send({
                salary: "not-a-number",
            })
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(400);
    });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
    let testJob;
    beforeEach(async () => {
        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle AS "companyHandle"
            FROM jobs LIMIT 1`
        );
        testJob = result.rows[0];
    });

    test("works for admins", async function () {
        const resp = await request(app)
            .delete(`/jobs/${testJob.id}`)
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.body).toEqual(expect.objectContaining({ deleted: `${testJob.id}` }));
    });

    test("forbidden for users", async function () {
        const resp = await request(app)
            .delete(`/jobs/${testJob.id}`)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toBe(403);
    });

    test("unauth for anon", async function () {
        const resp = await request(app)
            .delete(`/jobs/${testJob.id}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("not found for no such company", async function () {
        const resp = await request(app)
            .delete(`/jobs/0`)
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(404);
    });
});
