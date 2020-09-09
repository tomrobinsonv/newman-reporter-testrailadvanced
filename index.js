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
            
            /Get Plan Id if updating to test plan
            if(planName.length > 0) {
                let planId;
                testrail.getPlans(projectId)
                    .then(res => {
                        console.log("Looking for test plan to update...");
                        //Get plan To Update
                        let expectedPlanName = `${planName} - ${new Date().toISOString().slice(0, 10)}`;
                        let plansForProject = res.body;
                        for(let i = 0; i < plansForProject.length; i++) {
                            if(plansForProject[i].name === expectedPlanName) {
                                planId = plansForProject[i].id;
                                break;
                            }
                        }

                    if(!planId) {
                        //Create plan and add run if doesn't exist
                        const planDetails = {
                            name: `${planName} - ${new Date().toISOString().slice(0, 10)}`,
                            description: 'Test Runs For Automated Tests',
                            entries: []
                        };
                        testrail.addPlan(projectId, planDetails)
                        .then(res => {
                            //Create entry for newly created plan and test run
                            console.log("Adding plan to project...");
                            const createdPlan = res.body
                            const entryDetails = {
                                name: `Postman Automation Test - ${new Date().toISOString().slice(0, 19).split('T').join(' ')}`,
                                description: 'Postman Automation',
                                include_all: includeAll,
                                case_ids: allCaseIds,
                                suite_id: suiteId,
                                config_ids: [2],
                                runs: [
                                    {
                                        include_all: includeAll,
                                        case_ids: allCaseIds,
                                        config_ids: [2],
                                    }
                                ]
                            }
                            testrail.addPlanEntry(createdPlan.id, entryDetails)
                            .then(res => {
                                console.log("Adding new entry to newly created test plan...")
                                const createdEntry = res.body;
                                testrail.addResultsForCases(createdEntry.runs[0].id, results)
                                .then(result => console.log('adding results...', result.response.statusMessage));
                            })
                            .catch(err => console.log(err));
                        })
                        .catch(err => console.log("ADD PLAN ERROR: ", err));
                    } else {
                        //Update plan if does exist
                        console.log("Updating Automation Test Plan...")

                        //Create entry for new test run
                        const entryDetails = {
                            name: `Postman Automation Test - ${new Date().toISOString().slice(0, 19).split('T').join(' ')}`,
                            description: 'Postman Automation',
                            include_all: includeAll,
                            case_ids: allCaseIds,
                            suite_id: suiteId,
                            config_ids: [2],
                            runs: [
                                {
                                    include_all: includeAll,
                                    case_ids: allCaseIds,
                                    config_ids: [2],
                                }
                            ]
                        }
                        testrail.addPlanEntry(planId, entryDetails)
                        .then(res => {
                            console.log("Adding new entry to existing test plan...")
                            const createdEntry = res.body;
                            testrail.addResultsForCases(createdEntry.runs[0].id, results)
                            .then(result => console.log('adding results...', result.response.statusMessage));
                        })
                        .catch(err => console.log("ADD PLAN ENTRY ERROR: ", err));
                    }
                })
                .catch(err => console.log('ERROR: ', err));
            }
            
        });
    }
}

module.exports = TestRailReporter;
