const Testrail = require('testrail-api');

class PostmanTestRailAdvancedReporter {
    constructor(emitter, reporterOptions) {
        // console.log("EMITTER ", emitter._events,"\n\n beforeDone",Object.keys(emitter), typeof emitter.on)
        // emitter._events.beforeDone.fn();
        if(!reporterOptions) reporterOptions = {};
        let host = process.env.TESTRAIL_DOMAIN || reporterOptions.host || '';
        const user = process.env.TESTRAIL_USERNAME || reporterOptions.username || '';
        const password = process.env.TESTRAIL_PASSWORD || process.env.TESTRAIL_APIKEY || reporterOptions.password || '';
        const projectId = process.env.TESTRAIL_PROJECTID || reporterOptions.projectId || '';
        let suiteId = process.env.TESTRAIL_SUITE_ID || reporterOptions.suiteId || 1;
        const planName = process.env.TESTRAIL_PLAN_NAME || reporterOptions.planName || 'Newman Automation Plan';
        const runName = process.env.TESTRAIL_RUN_NAME || reporterOptions.runName || `Postman Automation Test - ${new Date().toISOString().slice(0, 19).split('T').join(' ')}`;
        const includeAll = process.env.TESTRAIL_INCLUDEALL === true || reporterOptions.includeAll === true || false;
        const baseUrl =  `${host}/index.php?/api/v2/`;
        const allCaseIds = [];
        const results = [];
        let configIds = [];
    
        const requiredOptions = [host, user, password, projectId];

        let hasMissingOptions = false;
        requiredOptions.forEach((option) => {
          if (option === undefined || option.length === 0) {
            console.error(
              `\nnewman-reporter-testrailadvanced: A required environment variable ${option} was not found.`,
            );
            hasMissingOptions = true;

          }
        });

        if (hasMissingOptions) {
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
        
        emitter.on('done', (err, o) => {

            if(allCaseIds.length === 0) {
                console.error('\nnewman-reporter-testrailadvanced: No test cases were found.');
                return;
            }
            
            //Get Plan Id if updating to test plan
            console.log("plan name", planName)
            // if(planName.length < 0) {
                // console.log("No Plan name given")
                let planId;
                testrail.getSuites(projectId)
                .then(res => {
                    const suites = res.body;
                    if(suiteId && !(suites.find(suite => suite.id === suiteId))) suiteId = suites.find(suite => suite.is_master === true).id; 
                    testrail.getConfigs(56)
                    .then(res => {
                        const configGroups = res.body;
                        const apiCongfigGroup = configGroups.find(configGroup => configGroup.name.toLowerCase().includes('postman') || configGroup.name.toLowerCase().includes('api'));
                        if(!apiCongfigGroup) {
                            console.log('please add postman config to testrail'); 
                            return;
                        } else configIds.push(apiCongfigGroup.configs.find(config => config.name.toLowerCase().includes('postman')).id);
                        testrail.getPlans(projectId)
                        .then(res => {
                            console.log("Looking for test plan to update...");
                            //Get plan To Update
                            let expectedPlanName = planName || `${planName} - ${new Date().toISOString().slice(0, 10)}`;
                            let plansForProject = res.body;
                            const planToAddTo = plansForProject.plans.find(plan => plan.name === expectedPlanName);
                            if(planToAddTo) planId = planToAddTo.id;
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
                                        name: runName,
                                        description: 'Postman Automation',
                                        include_all: includeAll,
                                        case_ids: allCaseIds,
                                        suite_id: suiteId,
                                        // config_ids: configIds,
                                        runs: [
                                            {
                                                include_all: includeAll,
                                                case_ids: allCaseIds,
                                                // config_ids: configIds,
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
                                    name: runName,
                                    description: 'Postman Automation',
                                    include_all: includeAll,
                                    case_ids: allCaseIds,
                                    suite_id: suiteId,
                                    // config_ids: configIds,
                                    runs: [
                                        {
                                            include_all: includeAll,
                                            case_ids: allCaseIds,
                                            // config_ids: configIds,
                                        }
                                    ]
                                };
                                testrail.addPlanEntry(planId, entryDetails)
                                .then(res => {
                                    console.log("Adding new entry to existing test plan...")
                                    const createdEntry = res.body;
                                    testrail.addResultsForCases(createdEntry.runs[0].id, results)
                                    .then(result => console.log('adding results...', result.response.statusMessage))
                                    .catch(err => console.log(err))
                                })
                                .catch(err => console.log("ADD PLAN ENTRY ERROR: ", err));
                            }
                        })
                        .catch(err => console.log(err))
                    })
                    .catch(err => console.log('ERROR: ', err));
                })
                .catch(err => console.log(err))
            // }
        })    
        // });
    };
};
    // const runDetails = {
        //     name: runName,
        //     description: `${runName} - ${new Date().toISOString()}`,
        //     suiteId: suiteId,
        //     include_all: includeAll,
        //     case_ids: allCaseIds
        // };

        // testrail.addRun(projectId, runDetails)
        //     .then((result) => {
        //         console.log('creating run...', result.response.statusMessage)
        //         console.log(result.body.url);
        //         var run_id = result.body.id;
        //         testrail.addResultsForCases(run_id, results)
        //             .then((result) => {
        //                 console.log('adding results...', result.response.statusMessage)
        //                 testrail.closeRun(run_id)
        //                     .then((result) => {
        //                         console.log('closing run...', result.response.statusMessage)
        //                     }).catch((error) => {
        //                         console.log(error.message);
        //                     });
        //             }).catch((error) => {
        //                 console.log(error.message);
        //             });
        //     }).catch((error) => {
        //         console.log(error.message);
        //     });

module.exports = PostmanTestRailAdvancedReporter;
