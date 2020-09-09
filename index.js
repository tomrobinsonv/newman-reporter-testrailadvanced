const Testrail = require('testrail-api');
const axios = require('axios');

class TestRailReporter {
    constructor(emitter, reporterOptions) {
        if(!reporterOptions) reporterOptions = {};
        const host = process.env.TESTRAIL_HOST || reporterOptions.host || '';
        const user = process.env.TESTRAIL_USERNAME || reporterOptions.username || '';
        const password = process.env.TESTRAIL_PASSWORD || process.env.TESTRAIL_API_KEY || reporterOptions.password || '';
        const projectId = process.env.TESTRAIL_PROJECT_ID || reporterOptions.projectId || '';
        const suiteId = process.env.TESTRAIL_SUITE_ID || reporterOptions.suiteId || 1;
        const planName = process.env.TESTRAIL_PLAN_NAME || reporterOptions.planName || '';
        const runName = process.env.TESTRAIL_RUN_NAME || reporterOptions.runName || 'Automation Run';
        const includeAll = ((process.env.TESTRAIL_INCLUDE_ALL === true) || (process.env.TESTRAIL_INCLUDE_ALL === undefined))
        && ((reporterOptions.includeAll === true) || (reporterOptions.includeAll === undefined));
        const baseUrl =  `${host}/index.php?/api/v2/`;
        const allCaseIds = [];
        const results = [];

        if (!(host && user && password && projectId)) {
            console.log('please provide testrail details');
            return;
        }

        if(host.length > 0 && !host.startsWith('https://')) host = 'https://' + host;

        let testrail = new Testrail({
            host: host,
            user: user,
            password: password
        });
        emitter.on('assertion', (err, o) => {
            const re = /\bC(\d+)\b/;
            const str = o.assertion.split(' ');
            const caseIds = str.filter(i => i.match(re)).map(i => i.substr(1));
            const assertionName = str.filter(i => !i.match(re)).join(' ');
            caseIds.forEach((caseId) => {
                results.push({
                    case_id: caseId,
                    status_id: (err) ? 5 : 1,
                    comment: (err) ? `${assertionName} Test failed: ${err.message}` : `${assertionName} Test passed`
                });
                allCaseIds.push(caseId);
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
