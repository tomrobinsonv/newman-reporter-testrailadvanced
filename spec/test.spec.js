const assert = require('assert');
const TestRailReporter = require("../index");
const createTestData = require('./testData');

describe("TestRail Reporter Test", () => {
    describe("Returns error message", () => {
        it("should return an error message if required variables are missing", () => {
            const testAssertion = "C1 Verify a subscribed User can play the premium activity via the library";
            const reporter = new TestRailReporter({ on: (type, cb) => {
                cb(null, {
                    assertion: testAssertion
                })
            }});
        })
    })
})