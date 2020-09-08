const Testrail = require('testrail-api');


class TestRailReporter {
    constructor(emitter, reporterOptions) {

        const host = process.env.TESTRAIL_HOST || reporterOptions.host || '';
        const user = process.env.TESTRAIL_USERNAME || reporterOptions.username || '';
        const password = process.env.TESTRAIL_PASSWORD || process.env.TESTRAIL_API_KEY || reporterOptions.password || '';
        const project_id = process.env.TESTRAIL_PROJECT_ID || reporterOptions.projectId || '';
        const suite_id = process.env.TESTRAIL_SUITE_ID || reporterOptions.suiteId || '';
        const plan_name = process.env.TETSRAIL_PLAN_NAME || reporterOptions.planName || '';
        const run_name = process.env.TESTRAIL_RUN_NAME || reporterOptions.runName || 'Automation Run';
        const include_all = ((process.env.TESTRAIL_INCLUDE_ALL === true) || (process.env.TESTRAIL_INCLUDE_ALL === undefined))
        && ((reporterOptions.includeAll === true) || (reporterOptions.includeAll === undefined))
        const allCaseIds = [];
        const results = {};

        if (!(host && user && password && project_id)) {
            console.log('please provide testrail details');
            return;
        }

        let testrail = new Testrail({
            host: host,
            user: user,
            password: password
        });

        emitter.on('assertion', (err, o) => {
            const re = /\bC(\d+)\b/;
            const str = o.assertion.split(' ');
            const case_ids = str.filter(i => i.match(re)).map(i => i.substr(1));
            case_ids.forEach((case_id) => {
                results.push({
                    case_id: case_id,
                    status_id: (err) ? 5 : 1,
                    comment: (err) ? `Test failed: ${err.message}` : 'Test passed'
                });
                allCaseIds.push(case_id);
            });
        });

        emitter.on('beforeDone', (err) => {
            if (err) {
                return;
            }
        });
    }
}

module.exports = TestRailReporter;
