'use strict';

angular.module('idiscover.me', ['ui.router', 'ui.router.state.events', 'ngResource', 'ng.deviceDetector', 'chart.js', 'tooltips', 'autoGrowInput', 'ngSanitize', 'FBAngular', 'cloudinary', 'ngFileUpload', 'dndLists'])

    //ng.deviceDetector - to grab browser details
    //chart.js - to build charts
    //tooltips - to show hover text
    //autoGrowInput - text input field will be adjust automatically
    //ngSanitize - to stop unsafe inputs from Client
    //FBAngular - for full screen

    .config(['$stateProvider', '$urlRouterProvider', '$locationProvider', function ($stateProvider, $urlRouterProvider, $locationProvider) {
        //Defining States
        $stateProvider
            .state('login', {
                url: '/',
                views: {
                    'content': {
                        templateUrl: './views/login.html',
                        controller: 'loginController'
                    }
                },
                addOn: { requiresLogin: false }
            })
            .state('register', {
                url: '/register',
                views: {
                    'content': {
                        templateUrl: './views/register.html',
                        controller: 'registerController'
                    }
                },
                addOn: { requiresLogin: false }
            })
            .state('resetpsw', {
                url: '/reset/:eid/:tkn',
                views: {
                    'content': {
                        templateUrl: './views/resetpsw.html',
                        controller: 'resetController'
                    }
                },
                addOn: { requiresLogin: false }
            })
            .state('oauth-google', {
                url: '/oauth/google/:tkn',
                views: {
                    'content': {
                        templateUrl: './views/oauth.html',
                        controller: 'oauthController'
                    }
                },
                addOn: { requiresLogin: false }
            })
            .state('personal-details', {
                url: '/edit-details',
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'content': {
                        templateUrl: './views/personal_details.html',
                        controller: 'myPersonalController'
                    }
                },
                addOn: { requiresLogin: true }
            })
            .state('details', {
                url: '/details',
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'content': {
                        templateUrl: './views/details.html',
                        controller: 'detailsController'
                    }
                },
                addOn: { requiresLogin: true }
            })
            .state('process-steps', {
                url: '/process-steps',
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'left_panel': {
                        templateUrl: './views/left_panel.html',
                        controller: 'leftController'
                    },
                    'content': {
                        templateUrl: './views/process_step.html',
                        controller: 'processController'
                    }
                },
                addOn: { requiresLogin: true }
            })
            .state('reflective-questions', {
                url: '/reflective-questions',
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'left_panel': {
                        templateUrl: './views/left_panel.html',
                        controller: 'leftController'
                    },
                    'content': {
                        templateUrl: './views/reflective.html',
                        controller: 'processController'
                    }
                },
                addOn: { requiresLogin: true }
            })
            .state('dragQ', {
                url: '/rank-your-strengths',
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'left_panel': {
                        templateUrl: './views/left_panel.html',
                        controller: 'leftController'
                    },
                    'content': {
                        templateUrl: './views/dragQuestionnaire.html',
                        controller: 'dragController'
                    }
                },
                addOn: { requiresLogin: true }
            })
            .state('questionnaire', {
                url: '/questionnaire',
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'left_panel': {
                        templateUrl: './views/left_panel.html',
                        controller: 'leftController'
                    },
                    'content': {
                        templateUrl: './views/questionnaire.html',
                        controller: 'questionnaireController'
                    }
                },
                addOn: { requiresLogin: true }
            })
            .state('open-questionnaire', {
                url: '/open-questionnaire',
                views: {
                    'content': {
                        templateUrl: './views/openQuestionnaire.html',
                        controller: 'openUserController'
                    }
                },
                addOn: { requiresLogin: false }
            })
            .state('open-list', {
                url: '/open-list',
                params: { page: 2 },
                views: {
                    'content': {
                        templateUrl: './views/openList.html',
                        controller: 'openUserController'
                    }
                },
                addOn: { requiresLogin: false }
            })
            .state('dashboard', {
                url: '/dashboard',
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'left_panel': {
                        templateUrl: './views/left_panel.html',
                        controller: 'leftController'
                    },
                    'content': {
                        templateUrl: './views/dashboard.html',
                        controller: 'dashboardController'
                    }
                },
                addOn: { requiresLogin: true }
            })
            .state('trueself-report', {
                url: '/trueself-report',
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'content': {
                        templateUrl: './views/trueself_report.html',
                        controller: 'userProfileController'
                    }
                },
                addOn: { requiresLogin: true }
            })
            .state('trueself-report-share', {
                url: '/trueself-report-share/:id',
                views: {
                    'content': {
                        templateUrl: './views/trueself_report_share.html',
                        controller: 'shareReportController'
                    }
                },
                addOn: { requiresLogin: false }
            })
            .state('select-profile', {
                url: '/select-profile',
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'content': {
                        templateUrl: './views/select_profile.html',
                        controller: 'selectController'
                    }
                },
                addOn: { requiresLogin: true }
            })
            .state('userProfile', {
                url: '/Profile',
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'content': {
                        templateUrl: './views/userProfile.html',
                        controller: 'userProfileController'
                    }
                },
                addOn: { requiresLogin: true }
            })
            .state('anyPeer', {
                url: '/peer-review/:id',
                views: {
                    'content': {
                        templateUrl: './views/anyPeer.html',
                        controller: 'anyPeerController'
                    }
                },
                addOn: { requiresLogin: false }
            })
            .state('peerAnalysis', {
                url: '/peer-analysis/:id',
                views: {
                    'content': {
                        templateUrl: './views/peerAnalysis.html',
                        controller: 'peerAnalysisController'
                    }
                },
                addOn: { requiresLogin: false }
            })
            .state('pdp', {
                url: '/pdp',
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'left_panel': {
                        templateUrl: './views/left_panel.html',
                        controller: 'leftController'
                    },
                    'content': {
                        templateUrl: './views/pdp.html',
                        controller: 'pdpController'
                    }
                },
                addOn: { requiresLogin: true }
            })
            .state('anyUser', {
                url: '/user/:id',
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'content': {
                        templateUrl: './views/anyUser.html',
                        controller: 'anyController'
                    }
                },
                addOn: { requiresLogin: true }
            })
            .state('openAssessorReport', {
                url: '/open-assessor-report/:id',
                views: {
                    'content': {
                        templateUrl: './views/openReport.html',
                        controller: 'openReportController'
                    }
                },
                addOn: { requiresLogin: false }
            })
            .state('facPanel', {
                url: '/Panel',
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'content': {
                        templateUrl: './views/facPanel.html',
                        controller: 'facController'
                    }
                },
                addOn: { requiresLogin: true }
            })
            .state('manPanel', {
                url: '/manager-panel',
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'content': {
                        templateUrl: './views/managerPanel.html',
                        controller: 'managerController'
                    }
                },
                addOn: { requiresLogin: true }
            })
            .state('sadbms', {
                url: '/SADBMS',
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'content': {
                        templateUrl: './views/sadbms.html',
                        controller: 'sadbmsController'
                    }
                },
                addOn: { requiresLogin: true }
            })
            .state('feedback', {
                url: '/feedback',
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'content': {
                        templateUrl: './views/feedback.html',
                        controller: 'feedbackController'
                    }
                },
                addOn: { requiresLogin: true }
            })
            .state('open-mcq', {
                url: '/open-mcq/aptitude-javascript',
                views: {
                    'content': {
                        templateUrl: './views/openMCQ.html',
                        controller: 'openMCQController'
                    }
                },
                addOn: { requiresLogin: false }
            })
            .state('open-mcq-list', {
                url: '/open-mcq-list',
                params: { page: 2 },
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'content': {
                        templateUrl: './views/openMCQList.html',
                        controller: 'openMCQController'
                    }
                },
                addOn: { requiresLogin: true }
            })
            .state('upload', {
                url: '/upload',
                views: {
                    'header': {
                        templateUrl: './views/header.html',
                        controller: 'headerController'
                    },
                    'content': {
                        templateUrl: './views/upload.html',
                        controller: 'uploadController'
                    }
                },
                addOn: { requiresLogin: false }
            });
        $urlRouterProvider.otherwise('/');

        // $locationProvider.html5Mode(true);
        $locationProvider.hashPrefix('');
    }]);