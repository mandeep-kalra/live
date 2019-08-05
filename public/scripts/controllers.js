'use strict';

angular.module('idiscover.me')

	.run(function ($window, $rootScope, $state, $location, authFactory, $timeout) {
		// $rootScope.baseURL = $location.protocol() +"://"+ $location.host() +"/"+$location.port();
		// console.log($rootScope.baseURL);

		//buffer the requested URL and traverse to login, if unauthenticated user grants and unauthorized access to the page is there
		$rootScope.path = null;
		$rootScope.$on('$stateChangeStart', function (event, nextRoute, currentRoute) {
			if (nextRoute.addOn.requiresLogin && !authFactory.isAuthenticated()) {
				$rootScope.path = $location.path();
				$location.path('/').replace();
				$timeout(function () {
					$state.go($state.current, {}, { reload: true });
				}, 0);
			}
		});

		//check whether there is internet connection or not
		$rootScope.online = navigator.onLine;
		$window.addEventListener("offline", function () {
			$rootScope.$apply(function () {
				$rootScope.online = false;
			});
		}, false);
		$window.addEventListener("online", function () {
			$rootScope.$apply(function () {
				$rootScope.online = true;
			});
		}, false);
	})

	//coverts the break statement of Textarea into real break statements while showing them
	.filter('linebreaks', function () {
		return function (text) {
			return text.replace(/\n/g, "<br>");
		}
	})

	.directive("directive", function () {
		return {
			restrict: "A",
			require: "ngModel",
			link: function (scope, element, attrs, ngModel) {

				function read() {
					// view -> model
					var html = element.html();
					html = html.replace(/&nbsp;/g, "\u00a0");
					ngModel.$setViewValue(html);
				}
				// model -> view
				ngModel.$render = function () {
					element.html(ngModel.$viewValue || "");
				};

				element.bind("blur", function () {
					scope.$apply(read);
				});
				element.bind("keydown keypress", function (event) {
					if (event.which === 13) {
                        console.log((this).attr('class'));
                        if((this).attr('class').indexOf("contenteditable") != -1){

                        }else{
                            this.blur();
						    event.preventDefault();
                        }
					}
				});
			}
		};
	})

	//copy to clipboard on button click - for now bug of saving the last one, when used multiple time in same page
	.directive("copyToClipboard", function () {
		var clip;
		function link(scope, element) {
			function clipboardSimulator() {
				var self = this,
					textarea,
					container;
				function createTextarea() {
					if (!self.textarea) {
						container = document.createElement('div');
						container.id = 'simulate-clipboard-container';
						container.setAttribute('style', ['position: fixed;', 'left: 0px;', 'top: 0px;', 'width: 0px;', 'height: 0px;', 'z-index: 100;', 'opacity: 0;', 'display: block;'].join(''));
						document.body.appendChild(container);
						textarea = document.createElement('textarea');
						textarea.setAttribute('style', ['width: 1px;', 'height: 1px;', 'padding: 0px;'].join(''));
						textarea.id = 'simulate-clipboard';
						self.textarea = textarea;
						container.appendChild(textarea);
					}
				}
				createTextarea();
			}
			clipboardSimulator.prototype.copy = function () {
				this.textarea.innerHTML = '';
				this.textarea.appendChild(document.createTextNode(scope.textToCopy));
				this.textarea.focus();
				this.textarea.select();
				setTimeout(function () {
					document.execCommand('copy');
				}, 20);
			};
			clip = new clipboardSimulator();
			element[0].addEventListener('click', function () {
				clip.copy();
			});
		}
		return {
			restrict: 'A',
			link: link,
			scope: {
				textToCopy: '='
			}
		};
	})

	.controller('headerController', ['$scope', '$state', 'userFactory', 'authFactory', '$rootScope', 'notiFactory', function ($scope, $state, userFactory, authFactory, $rootScope, notiFactory) {
		$scope.user = {};
		$scope.show = false;

		//grab the authenticated user name, email
		userFactory.getName()
			.$promise
			.then(function (ud) {
				$scope.user = ud;

				$scope.show = true;
				$rootScope.$broadcast('header:Loaded', {});
			});


		//logout module
		$scope.doLogout = function () {
			authFactory.logout();
			$state.go('login', {});
		};

		//listening to each noti:Send broadcast
		$scope.$on('noti:Send', function (event, data) {
			notiFactory.saveNoti({ who: $scope.user.firstname + ' ' + $scope.user.lastname, statement: data.statement, facilitator_name: $scope.user.facilitator_name });
		});
	}])

	.controller('leftController', ['$scope', '$state', 'userFactory', '$rootScope', function ($scope, $state, userFactory, $rootScope) {
		$scope.show = false;

		//sync this panel with header, by showing only when header was loaded
		$scope.$on('header:Loaded', function (event, data) {
			$scope.show = true;
		});

		$scope.current_state = $state.current.name;

		//get the status of Profile filled and block/unblock tabs according to it
		$scope.percent = userFactory.getPercentage($scope.percent);
	}])

	.controller('loginController', ['$scope', '$rootScope', '$state', 'deviceDetector', 'userFactory', 'authFactory', '$timeout', '$location', function ($scope, $rootScope, $state, deviceDetector, userFactory, authFactory, $timeout, $location) {
		$scope.loginData = {};
		$scope.login_button = true;
		$scope.which_one = 1;

		//get browser details
		$scope.deviceDet = deviceDetector.browser;

		//login module
		$scope.doLogin = function () {
			$scope.message = "";
			$scope.login_button = false;
			authFactory.login($scope.loginData);	//call to login module with details of user
			$timeout(function () {
				$scope.login_button = true;
			}, 5000);	//enable login button every 5 seconds irrespective of any result
		};

		//forget password module
		$scope.doForget = function () {
			$scope.message = "";
			$scope.login_button = false;

			//sending details to server
			$scope.temp = authFactory.forget($scope.loginData);

			//runs when there is some resonse from server
			$scope.$watch('temp', function (n, o) {
				if (n != o)
					$scope.message = n.message;
			}, true);   //true for deep comparison

			$timeout(function () {
				if (!$scope.temp.success)
					$scope.login_button = true;
			}, 5000);	//enable login button every 5 seconds irrespective of any result
		};

		$scope.percent = {};

		//will run on successful login to check the status of user
		var rem = $scope.$watch('percent', function (n, o) {
			if (n != o) {
				if (n.you_are_fac)
					$state.go('facPanel', {});
				else if (n.reflective_filled) {
					if (!n.questionnaire_filled) {
						$state.go('questionnaire', {});
					}
					else
						$state.go('dashboard', {});
				}
				else
					$state.go('details', {});
				rem();
			}
		}, true);   //true for deep comparison

		//listening to successful login    
		$scope.$on('login:Successful', function (events, args) {

			$scope.browse = {
				device_details: deviceDetector,
				'important_date.last_login': new Date
			};
			userFactory.saveDetails($scope.browse);	//saving login and browser details

			//check whether there is redirection needed
			if ($rootScope.path != null && authFactory.isAuthenticated()) {
				$location.path($rootScope.path).replace();

				$timeout(function () {
					$state.go($state.current, {}, { reload: true });
					$rootScope.path = null;
				}, 0);
			}
			else
				$scope.percent = userFactory.getPercentage($scope.percent);
		});

		//listening to unsuccessful login
		$scope.$on('error:Failure', function (event, data) {
			$scope.login_button = true;
			$scope.message = data;
		});
	}])

	.controller('registerController', ['$scope', '$rootScope', '$state', '$timeout', 'deviceDetector', 'authFactory', 'userFactory', function ($scope, $rootScope, $state, $timeout, deviceDetector, authFactory, userFactory) {
		$scope.registration = {};
		$scope.register_button = true;

		$scope.match = true;

		//register module
		$scope.doRegister = function () {
			//password verification
			if ($scope.registration.password == $scope.registration.password2)
				$scope.match = true;
			else
				$scope.match = false;

			if ($scope.match == true) {
				$scope.register_button = false;
				authFactory.register($scope.registration);
			}
		};

		//listening to successful registration
		$scope.$on('registration:Successful', function () {
			$scope.browse = {
				device_details: deviceDetector,
				important_date: {
					last_login: new Date,
					registration: new Date
				}
			};
			var mailData = { to: '' };
			mailData.subject = "Welcome to iDiscover.me";
			mailData.html = 'Dear ' + $scope.registration.firstname + ' ' + $scope.registration.lastname + ',<br><br>Thanks so much for signing with iDiscover.me.<br>Your user account details are:<br> Email-ID: <b>' + $scope.registration.username + '</b><br> Password: <b>' + $scope.registration.password + '</b><br><br>For future reference link to iDiscover.me online application: app.idiscover.me<br><br>If you need help, please feel free to contact us at info@idiscover.me<br><br><br>Best Regards,<br>Team iDiscover.me';

			userFactory.sendMailToOwn(mailData);	//sending custom mail to user
			userFactory.saveDetails($scope.browse);     //saving details when succefully logged-in
			$state.go('details', {});
		});

		//listening to unsuccessful registration
		$scope.$on('error:Failure', function (event, data) {
			$scope.register_button = true;
			$scope.message = data;
			$timeout(function () {
				$scope.message = false;
			}, 3000);
		});
	}])

	.controller('resetController', ['$scope', '$stateParams', '$timeout', 'userFactory', '$state', function ($scope, $stateParams, $timeout, userFactory, $state) {
		$scope.email = $stateParams.eid;
		$scope.token = $stateParams.tkn;
		$scope.show_noti = false;

		//submitting new password
		$scope.submitPSW = function () {
			$scope.show_noti = false;
			var temp = {
				eid: $stateParams.eid,
				tkn: $stateParams.tkn,
				password: $scope.password
			};
			$scope.success = 0;
			$scope.success = userFactory.savePSW(temp);

			//waiting for server response
			$scope.$watch('success', function (n, o) {
				if (n != o) {
					//console.log(n);
					$scope.show_noti = true;
					$timeout(function () {
						$scope.show_noti = false;
						if (n.success)
							$state.go('login', {});
					}, 3000);
				}
			}, true);  //true for deep comparison
		};
	}])

	.controller('oauthController', ['$scope', '$stateParams', '$http', '$localStorage', '$timeout', 'userFactory', '$state', 'deviceDetector', function ($scope, $stateParams, $http, $localStorage, $timeout, userFactory, $state, deviceDetector) {
		$scope.loading = true;

		//saving token in request header
		//	console.log($stateParams.tkn);
		$http.defaults.headers.common['x-access-token'] = CryptoJS.AES.encrypt($stateParams.tkn, 'portal\/\/\'*iD').toString();
		//	console.log($http.defaults.headers.common['x-access-token']);
		$scope.percent = {};
		$scope.user = {};
		$timeout(function () {
			$scope.user = userFactory.getName();	//get user information - name, email, etc
		}, 500);

		//waiting for response from server
		var q = $scope.$watch('user', function (n, o) {
			if (n != o) {
				//storing details in local
				$localStorage.storeObject('Token', { username: n.username, token: CryptoJS.AES.encrypt($stateParams.tkn, 'portal\/\/\'*iD').toString() });
				$scope.loading = false;

				$scope.browse = {
					device_details: deviceDetector,
					'important_date.last_login': new Date
				};

				$scope.success = 0;
				$scope.success = userFactory.saveDetails($scope.browse);		//saving browser details

				//waiting for response from server
				$scope.$watch('success', function (n, o) {
					if (n != o)
						if (n.message == 'Done')
							$timeout(function () {
								$scope.percent = userFactory.getPercentage($scope.percent);		//retrieving user status
								q();
							}, 1000);
				}, true);   //true for deep comparison
			}
		}, true);   //true for deep comparison

		//waiting to response from server, to get the status of user and then traversing according to it
		var pq = $scope.$watch('percent', function (n, o) {
			if (n != o) {
				if (n.reflective_filled) {
					if (!n.questionnaire_filled) {
						$state.go('questionnaire', {});
					}
					else
						$state.go('dashboard', {});
				}
				else
					$state.go('details', {});
				pq();
			}
		}, true);   //true for deep comparison
	}])

	.controller('myPersonalController', ['$scope', '$state', 'userFactory', function ($scope, $state, userFactory) {
		$scope.loading = true;

		$scope.personalDetails = {};
		$scope.personalDetails = userFactory.getPersonal($scope.personalDetails);

		//waiting for response
		$scope.$watch('personalDetails', function (n, o) {
			if (n != o)
				$scope.loading = false;
		}, true);   //true for deep comparison

		//submitting edited details
		$scope.proceed = function () {
			$scope.success = 0;
			$scope.success = userFactory.saveDetails($scope.personalDetails);
			$scope.$watch('success', function (n, o) {
				if (n != o)
					$state.go('dashboard', {});
			}, true);   //true for deep comparison
		}
	}])

	.controller('detailsController', ['$scope', '$state', 'userFactory', 'facilitatorFactory', function ($scope, $state, userFactory, facilitatorFactory) {
		$scope.loading = true;
		$scope.submitted = false;

		$scope.facList = [];
		$scope.userDetails = {};

		//retrieve user details
		$scope.userDetails = userFactory.getDetails($scope.userDetails);

		//waiting for response
		var a = $scope.$watch('userDetails', function (n, o) {
			if (n != o) {
				$scope.facList = facilitatorFactory.getFacs();		//get dynamic facilitator list

				//waiting for response
				$scope.$watch('facList', function (n, o) {
					if (n != o) {
						$scope.loading = false;
						a();
					}
				}, true);   //true for deep comparison
			}
		}, true);   //true for deep comparison

		//submit data
		$scope.proceed = function () {
			$scope.submitted = true;
			$scope.success = 0;
			if (($scope.userDetails.facilitator_name == '') || ($scope.userDetails.facilitator_name == '--UNKNOWN--'))
				return;
			else {
				$scope.success = userFactory.saveDetails($scope.userDetails);
				$scope.$watch('success', function (n, o) {
					if (n != o)
						$state.go('process-steps', {});
				}, true);   //true for deep comparison
			}
		}
	}])

	.controller('processController', ['$scope', '$rootScope', '$state', '$timeout', 'userFactory', function ($scope, $rootScope, $state, $timeout, userFactory) {
		$('html,body').scrollTop(0);

		$scope.percent = {};
		$scope.load_ins = function () {
			$scope.percent = userFactory.getPercentage($scope.percent);		//get user info - like name, email, etc
		};

		//waiting for response
		var rem = $scope.$watch('percent', function (n, o) {
			if (n != o) {
				$scope.loading = false;
				rem();
			}
		}, true);   //true for deep comparison

		$scope.RQ_num = 1;
		$scope.loading = true;

		$scope.currentTime = new Date();

		$scope.quesDetails = {};

		//module to retrieve Reflective Questions
		$scope.load_questions = function () {
			$scope.quesDetails = userFactory.getQuestions($scope.quesDetails);
		};

		//track attempts
		var copyTrack = {
			RQTrack: 0
		};

		//waiting for response from server, Reflective Questions
		var end = $scope.$watch('quesDetails', function (n, o) {
			if (n != o) {
				if (n.question.RQtrack.length)		//if attempt exists before
					copyTrack.RQTrack = n.question.RQtrack[n.question.RQtrack.length - 1].attempt;
				else								//if doesn't exists
					copyTrack.RQTrack = 0;
				if (n.question.RQeditable.length == 0)		//initializing blocking status of 4 Reflective Questions for first time only
					$scope.quesDetails.question.RQeditable = new Array(4).fill(false);

				$scope.loading = false;
				end();
			}
		}, true);   //true for deep comparison

		//capturing ques no. change
		$scope.$watch('RQ_num', function (n, o) {
			if (n != o) {
				var toSave;
				eval('toSave = {"question.RQ' + o + '": $scope.quesDetails.question.RQ' + o + '}');
				// console.log(toSave);
				$scope.success = 0;
				$scope.success = userFactory.saveDetails(toSave);

				//waiting for response
				var close = $scope.$watch('success', function (n, o) {
					if (n != o && n.message == 'Done') {
						$timeout(function () {
							close();
							$scope.success = 0;
						}, 2000);
					}
				}, true);   //true for deep comparison
			}
		});

		$scope.save_ques = function (num) {
			$scope.quesDetails.last_modification = new Date();		//saving last modification
			var diff = (Date.parse($scope.quesDetails.last_modification) - Date.parse($scope.currentTime)) / 1000;		//finding out total time taken
			$scope.quesDetails.question.RQtrack.push({ time_taken: diff, attempt: copyTrack.RQTrack + 1, when: $scope.quesDetails.last_modification });

			if (num == 2)
				$scope.quesDetails.question.RQeditable.fill(true);		//blocking specific question

			$scope.success = 0;
			$scope.success = userFactory.saveDetails($scope.quesDetails);

			//waiting for response
			var close = $scope.$watch('success', function (n, o) {
				if (n != o && n.message == 'Done') {
					if (num == 2) {
						$rootScope.$broadcast('noti:Send', { statement: "filled Reflective Questions." });
						$state.go('dragQ', {});
					}
					$timeout(function () {
						close();
						$scope.success = 0;
					}, 2000);
				}
			}, true);   //true for deep comparison
		};
		/*
		$scope.proceedStep = function(){
			if(!$scope.percent.reflective_filled)
				$state.go('reflective-questions', {});
			else if($scope.percent.reflective_filled && !$scope.percent.questionnaire_filled)
				$state.go('questionnaire', {});
			else if($scope.percent.reflective_filled && $scope.percent.questionnaire_filled && !($scope.percent.selected_profile))
				$state.go('select-profile', {});
			else if($scope.percent.reflective_filled && $scope.percent.questionnaire_filled && $scope.percent.selected_profile && !($scope.percent.profile_filled))
				$state.go('userProfile', {});
			else
				$state.go('dashboard', {});
		};*/
	}])

	.controller('questionnaireController', ['$scope', '$state', '$rootScope', 'userFactory', 'questionnaireFactory', '$window', function ($scope, $state, $rootScope, userFactory, questionnaireFactory, $window) {
		$scope.questions = {};
		$scope.answers = Array(36).fill(0);
		$scope.loading = true;

		$scope.currentTime = new Date();

		//tracking attempt count
		var copyTrack = {
			QTrack: 0
		};

		//waiting for response of 36 questionnaire
		var qs = $scope.$watch('questions', function (n, o) {
			if (n != o) {
				if ($scope.quesDetails.question.Questrack.length)		//attempts exists before
					copyTrack.QTrack = $scope.quesDetails.question.Questrack[$scope.quesDetails.question.Questrack.length - 1].attempt;
				else
					copyTrack.QTrack = 0;

				$scope.loading = false;
				$('#myModal').modal('show');
				qs();
			}
		}, true);   //true for deep comparison

		//retrieve user questionnaire attempt
		$scope.quesDetails = userFactory.getQuestions($scope.quesDetails);

		//waiting for response
		var qs2 = $scope.$watch('quesDetails', function (n, o) {
			if (n != o) {
				if (n.question.questionnaire.length > 0)			//initialize attempted answers from user's attempt, if exists
					$scope.answers = n.question.questionnaire;

				questionnaireFactory.query(function (success) {	//retrive 36 questionnaire
					$scope.questions = success;
				}, function (err) { });

				qs2();
			}
		}, true);   //true for deep comparison

		// check atleast 1 selection in questionnaire
		$scope.checkQuestionnaire = function () {
			if (($scope.answers.indexOf("1") == -1) && ($scope.answers.indexOf("2") == -1))
				return false;
			else
				return true;
		}

		//submitting questionnaire
		$scope.saveQues = function () {
			if (!$scope.checkQuestionnaire())
				return;
			$scope.quesDetails.last_modification = new Date();		//saving time of last modification
			var diff = (Date.parse($scope.quesDetails.last_modification) - Date.parse($scope.currentTime)) / 1000;		//finding out total tim taken
			$scope.quesDetails.question.Questrack.push({ time_taken: diff, attempt: copyTrack.QTrack + 1, when: $scope.quesDetails.last_modification });
			$scope.quesDetails.question.questionnaire = $scope.answers;			//saving back to user's questionnaire data
			$scope.success = 0;

			//waiting for response
			userFactory.saveDetails($scope.quesDetails)
				.$promise
				.then(function (res) {
					$scope.success = res;

					if ($scope.success.message == 'Done') {
						$scope.after_fill = true;
						$rootScope.$broadcast('noti:Send', { statement: "filled Questionnaire." });

						//Questionnaire calculation
						var sumQues = new Array(9).fill(0);
						for (var k = 0; k < $scope.questions.length; k++) {
							//console.log(k + ' ' + $scope.questionnaire.length);
							if ($scope.quesDetails.question.questionnaire[k] != 0)
								sumQues[$scope.questions[k].keywords[parseInt($scope.quesDetails.question.questionnaire[k]) - 1].from_profile - 1]++;
						}
						// console.log(sumQues);

						var mailData = { to: 'facilitator' };
						mailData.subject = "iDiscover.me | Progress | RQs + Questionnaire Filled";
						mailData.html = 'had filled RQs and Questionnaire at app.idiscover.me.<br><br>Company : <br><br>Experience : <br><br><b>Reflective Questions</b><br>Q1. What kind of people you like? What qualities you like in them?<br>' + $scope.quesDetails.question.RQ1 + '<br><br>Q2. How would a close friend of yours describe you? Please mention both positive and negative qualities.<br>' + $scope.quesDetails.question.RQ2 + '<br><br>Q3. Mention positive and negative qualities about yourself that are not covered in Question 2.<br>' + $scope.quesDetails.question.RQ3 + '<br><br>Q4. Please mention negative qualities that you have improved in last few years.<br>' + $scope.quesDetails.question.RQ4 + '<br>'
							+ '<br><b>Rank Your Strengths</b><br>' + $scope.quesDetails.question.dragArray.map(function (key, i) {
								return '(' + (i + 1) + ') ' + key
							}).join('<br>')
							+ '<br><br><b>Questionnaire</b><br>' + (function () {
								var str = '';
								for (var i = 0; i < 9; i++)
									str += 'Profile ' + (i + 1) + ': ' + sumQues[i] + '<br>'
								return str;
							})()
							+ '<br>If you need help, please feel free to contact us at info@idiscover.me<br><br><br>Best Regards,<br>Team iDiscover.me';

						userFactory.sendMailToOwn(mailData);	//sending custom mail to facilitator
					}
				}, function (err) {
					alert(JSON.stringify(err));
				});
			// var lim = $scope.$watch('success', function (n, o) {
			// 	if (n != o) {
			// 		if (n.message == 'Done') {
			// 			$scope.after_fill = true;
			// 			$rootScope.$broadcast('noti:Send', { statement: "filled Questionnaire." });
			// 			lim();
			// 			//$state.go('dashboard', {});
			// 		}
			// 	}
			// }, true);   //true for deep comparison
		};
	}])

	.controller('dashboardController', ['$scope', '$state', '$timeout', 'userFactory', function ($scope, $state, $timeout, userFactory) {
		$scope.percent = {};
		$scope.loading = true;
		$scope.to_review = false;

		//DASHBOARD PART

		//switching views - dashboard <=> peer-review
		$scope.changeView = function () {
			$scope.to_review = !$scope.to_review;
		};

		//retrieving user info - name, email, etc
		$scope.percent = userFactory.getPercentage($scope.percent);

		//waiting for response
		var rem = $scope.$watch('percent', function (n, o) {
			if (n != o) {
				$scope.loading = false;
				rem();
			}
		}, true);   //true for deep comparison

		//PEER REVIEW PART

		//adding reviewers
		$scope.reviewers = new Array();
		$scope.reviewer = {
			name: '',
			relationship: '',
			emailid: ''
		};

		//push individual reviewer
		$scope.addReviewer = function () {
			$scope.reviewers.push($scope.reviewer);
			$scope.reviewer = {
				name: '',
				relationship: '',
				emailid: ''
			};
		};

		//submit and send mail to reviewers
		$scope.submitReviewer = function () {
			$scope.success = 0;
			$scope.success = userFactory.saveReviewers($scope.reviewers);
			var sc = $scope.$watch('success', function (n, o) {
				if (n != o) {
					$scope.reviewers = [];
					$timeout(function () {
						$scope.success = 0;
						sc();
					}, 3000);
				}
			}, true);   //true for deep comparison
		};
	}])

	.controller('selectController', ['$scope', '$state', 'keywordFactory', 'userFactory', function ($scope, $state, keywordFactory, userFactory) {
		$scope.profile_content = {};
		$scope.type_number = 0;
		$scope.loading = false;

		//module to submit Trueslef Profile Type selected by user
		$scope.submitType = function () {
			$scope.loading = true;

			$scope.profile_content = {
				profile_number: parseInt($scope.type_number)
			};
			$scope.success = 0;
			$scope.success = userFactory.sendAndSaveProfileData($scope.profile_content);		//saving type

			//waiting for response
			$scope.$watch('success', function (n, o) {
				if (n != o) {
					if (n.success)
						$state.go('userProfile', {});
				}
			}, true);   //true for deep comparison

		};
	}])

	.controller('userProfileController', ['$scope', '$state', '$rootScope', 'userFactory', '$timeout', 'addedFactory', 'growthRecommendFactory', 'beliefFactory', 'additionalDataFactory', function ($scope, $state, $rootScope, userFactory, $timeout, addedFactory, growthRecommendFactory, beliefFactory, additionalDataFactory) {
		$scope.section_num = 0;
		var last_section = 0;
		$scope.profile_content = {};
		$scope.type_number = 0;
		$scope.loading = true;
		$scope.second3timer = false;

		$scope.sectionDescs = additionalDataFactory.sectionDescs;
		$scope.sub_heading = additionalDataFactory.sub_heading;
		$scope.basic_fear = additionalDataFactory.basic_fear;
		$scope.key_motivation = additionalDataFactory.key_motivation;

		$scope.$watch('second3timer', function (n, o) {
			if (n != o) {
				if (n) {
					$timeout(function () {
						$scope.second3timer = false;
					}, 3000);
				}
			}
		});

		$scope.currentTime = new Date();
		$scope.currentSectionTime = new Date;

		$scope.profile_content = userFactory.getProfile($scope.profile_content);

		$scope.addingGrowth = false;

		// RR %age count
		$scope.total_mini = 0;
		$scope.sectionKeysCount = new Array(3).fill(0);

		function countRRPercentage(profileArray) {
			var k = 0, j = 0;
			$scope.total_mini = 0;
			$scope.sectionKeysCount = new Array(3).fill(0);

			for (k = 0; k < profileArray.length; k++) {
				if (profileArray[k].keyword_id[5] == 3) {
					for (j = 0; j < profileArray[k].mini_descriptions.length; j++) {
						switch (profileArray[k].mini_descriptions[j].relate) {
							case 'donotexhibitanymore':
							case 'relatestrongly':
							case 'relatepartially': $scope.total_mini++;
								break;
						}
						if (profileArray[k].mini_descriptions[j].relate == 'donotexhibitanymore')
							$scope.sectionKeysCount[0]++;
						else if (profileArray[k].mini_descriptions[j].relate == 'relatepartially')
							$scope.sectionKeysCount[1]++;
						else if (profileArray[k].mini_descriptions[j].relate == 'relatestrongly')
							$scope.sectionKeysCount[2]++;
					}
				}
			}
		}

		// for balancing view only - START
		function profileViewsSwitch(profileArray) {
			var k = 0, j = 0;
			$scope.temp_content = [];

			for (k = 0; k < profileArray.length; k++) {

				if (profileArray[k].linked_keyword) {

					for (j = 0; j < profileArray.length; j++) {

						if (profileArray[k].linked_keyword == profileArray[j].keyword_id) {
							$scope.temp_content[k] = profileArray[j];
							break;
						}
					}

				}
				else
					$scope.temp_content[k] = {};

				//console.log("here: "+$scope.temp_content[k]);
			}
		}

		var copyTrack = {
			attemptTrack: 0,
			eachSectionTrack: {
				attemptBelief: 0,
				attemptValue: 0,
				attemptStrength: 0,
				attemptLearning: 0,
				attemptGrowth: 0
			}
		};

		$scope.grRec = '';

		var pc = $scope.$watch('profile_content', function (n, o) {
			if (n != o) {
				//			if($state.current.name == 'userProfile' && $scope.profile_content.profile.eachSectionEditable[0] && $scope.profile_content.profile.eachSectionEditable[1] && $scope.profile_content.profile.eachSectionEditable[2] && $scope.profile_content.profile.eachSectionEditable[3] && $scope.profile_content.profile.eachSectionEditable[4])
				if ($state.current.name == 'userProfile' && $scope.profile_content.profile.eachSectionEditable[0] && $scope.profile_content.profile.eachSectionEditable[1] && $scope.profile_content.profile.eachSectionEditable[2] && $scope.profile_content.profile.eachSectionEditable[3])
					return;

				$scope.loading = false;

				if ($state.current.name == 'userProfile') {
					if ($scope.profile_content.profile.eachSectionStopReflect.length == 0) {
						$scope.profile_content.profile.eachSectionStopReflect = new Array(3).fill('');
						$scope.profile_content.profile.eachSectionStopReflectPAEI = new Array(3).fill('');
					}
					if ($scope.profile_content.profile.eachSectionStopReflectDone.length == 0)
						$scope.profile_content.profile.eachSectionStopReflectDone = new Array(3).fill(false);

					if ($scope.profile_content.profile.eachSectionEditable.length == 0)
						$scope.profile_content.profile.eachSectionEditable = new Array(5).fill(false);

					//				for(var i=0; i<5; i++){
					for (var i = 0; i < 4; i++) {
						if ($scope.profile_content.profile.eachSectionEditable[i] == false) {
							//						if(i == 4)
							//							$scope.section_num = 5;
							//						else
							$scope.section_num = i;
							break;
						}
					}

					if ($scope.profile_content.profile.eachSectionRelate.length == 0)
						$scope.profile_content.profile.eachSectionRelate = new Array(3).fill('');

					if ($scope.profile_content.profile.eachSectionShareMore.length == 0)
						$scope.profile_content.profile.eachSectionShareMore = new Array(3).fill('');

					if ($scope.profile_content.profile.beliefs.length == 0)
						$scope.profile_content.profile.beliefs = beliefFactory.getProfile($scope.profile_content.profile.profile_number);


					if ($scope.profile_content.profile.track.length)
						copyTrack.attemptTrack = $scope.profile_content.profile.track[$scope.profile_content.profile.track.length - 1].attempt;
					else
						copyTrack.attemptTrack = 0;
					if ($scope.profile_content.profile.eachSectionTrack.timeBelief.length)
						copyTrack.eachSectionTrack.attemptBelief = $scope.profile_content.profile.eachSectionTrack.timeBelief[$scope.profile_content.profile.eachSectionTrack.timeBelief.length - 1].attempt;
					else
						copyTrack.eachSectionTrack.attemptBelief = 0;
					if ($scope.profile_content.profile.eachSectionTrack.timeValue.length)
						copyTrack.eachSectionTrack.attemptValue = $scope.profile_content.profile.eachSectionTrack.timeValue[$scope.profile_content.profile.eachSectionTrack.timeValue.length - 1].attempt;
					else
						copyTrack.eachSectionTrack.attemptValue = 0;
					if ($scope.profile_content.profile.eachSectionTrack.timeStrength.length)
						copyTrack.eachSectionTrack.attemptStrength = $scope.profile_content.profile.eachSectionTrack.timeStrength[$scope.profile_content.profile.eachSectionTrack.timeStrength.length - 1].attempt;
					else
						copyTrack.eachSectionTrack.attemptStrength = 0;
					if ($scope.profile_content.profile.eachSectionTrack.timeLearning.length)
						copyTrack.eachSectionTrack.attemptLearning = $scope.profile_content.profile.eachSectionTrack.timeLearning[$scope.profile_content.profile.eachSectionTrack.timeLearning.length - 1].attempt;
					else
						copyTrack.eachSectionTrack.attemptLearning = 0;
					if ($scope.profile_content.profile.eachSectionTrack.timeGrowth.length)
						copyTrack.eachSectionTrack.attemptGrowth = $scope.profile_content.profile.eachSectionTrack.timeGrowth[$scope.profile_content.profile.eachSectionTrack.timeGrowth.length - 1].attempt;
					else
						copyTrack.eachSectionTrack.attemptGrowth = 0;
				}
				countRRPercentage($scope.profile_content.profile.profile_content);
				profileViewsSwitch($scope.profile_content.profile.profile_content);

				$scope.profile_content.last_modification = new Date();

				// if ($state.current.name == 'trueself-report')
				// 	calculateCompetencies();

				pc();
			}
		}, true);

		$scope.$watch('section_num', function (n, o) {
			if (n != o) {
				// if (n == 5) {
				// 	if ($scope.profile_content.profile.growth_recommendations.length == 0) {
				// 		$scope.profile_content.profile.growth_recommendations = growthRecommendFactory.getProfile($scope.profile_content.profile.profile_number);
				// 	}
				// }
				$scope.currentSectionTime = new Date();
				$scope.saveProfile(2);
				$('html,body').scrollTop(0);
			}
		});

		$scope.$watch('profile_selected', function (n, o) {
			if (n != o) {
				if (n != -1) {
					profileViewsSwitch($scope.profile_content.profile.old[$scope.profile_selected].pro);
					countRRPercentage($scope.profile_content.profile.old[$scope.profile_selected].pro);
				}
				else if (n == -1) {
					profileViewsSwitch($scope.profile_content.profile.profile_content);
					countRRPercentage($scope.profile_content.profile.profile_content);
				}
			}
		});
		// for balancing view only - END

		$scope.checkRel = new Array(4).fill(false);

		$scope.checkSectionFill = function (sno) {
			if (!($scope.profile_content && $scope.profile_content.profile && $scope.profile_content.profile.profile_content))
				return false;

			var relateFill = true;
			var commentFill = true;
			var miniRelate = true;

			if (sno >= 1 && sno <= 3) {
				//			if(!$scope.profile_content.profile.eachSectionRelate[sno-1])
				//				relateFill = false;

				// if (sno == 1 && !$scope.profile_content.profile.eachSectionCombineComment.value[0])
				// 	commentFill = false;
				// if (sno == 2 && (!$scope.profile_content.profile.eachSectionCombineComment.strength[0] || !$scope.profile_content.profile.eachSectionCombineComment.strength[1]))
				// 	commentFill = false;
				if (sno == 3 && (!$scope.profile_content.profile.eachSectionCombineComment.learning.length || !$scope.profile_content.profile.eachSectionCombineComment.learning[0] || !$scope.profile_content.profile.eachSectionCombineComment.learning[1] || !$scope.profile_content.profile.eachSectionCombineComment.learning[2]))
					commentFill = false;
			}
			if (sno == 0) {
				if ($scope.profile_content.profile.beliefs.length == 0)
					return false;
				for (var k = 0; k < $scope.profile_content.profile.beliefs.length; k++) {
					if (!($scope.profile_content.profile.beliefs[k].how_much && $scope.profile_content.profile.beliefs[k].comment))
						return false;
				}
			}
			else if (sno != 0)
				$scope.profile_content.profile.profile_content
					.filter(function (keys, ki) { return keys.keyword_id[5] == sno && keys.new_keyword == false; })
					.forEach(function (keys, ki) {
						var filteredMini = keys.mini_descriptions.filter(function (mini, mi) { return mini['relate'] && mini.mini_by_assessor == false; });

						if (filteredMini.length != keys.mini_descriptions.filter(function (mini, mi) { return mini.mini_by_assessor == false; }).length) {
							// console.log('relate wrong');
							miniRelate = false;
							return false;
						}
						if (sno == 3) {
							// console.log(keys.do_ask_comment)
							filteredMini.forEach(function (mini) {
								if (['relatestrongly', 'relatepartially'].indexOf(mini.relate) != -1 && (!keys.do_ask_comment || (keys.do_ask_comment == 'Yes' && !keys.comment))) {
									// console.log(keys.keyword_id, 'comment wrong');
									miniRelate = false;
									return false;
								}
							});
						}
					});
			// console.log(sno, relateFill, commentFill, miniRelate);
			// return false;
			return (true && relateFill && commentFill && miniRelate);
		};

		$scope.checkMiniQuesFill = function (sno) {
			var toSend = true;

			if (sno == 3) {
				/*
				for (var k = 0; k < $scope.profile_content.profile.profile_content.length; k++) {
					if ($scope.profile_content.profile.profile_content[k].keyword_id[5] == sno) {
						for (var o = 0; o < $scope.profile_content.profile.profile_content[k].mini_descriptions.length; o++) {
							// if ((sno == 2 && $scope.profile_content.profile.profile_content[k].mini_descriptions[o].relate != 'relatepartially') || (sno == 3 && $scope.profile_content.profile.profile_content[k].mini_descriptions[o].relate != 'donotexhibitanymore'))
							// 	continue;

							// if (sno == 2 && ($scope.profile_content.profile.profile_content[k].mini_descriptions[o].questions.strength.length == 0 || !$scope.profile_content.profile.profile_content[k].mini_descriptions[o].questions.strength[0]))
							// 	return false;
							if (sno == 3 && $scope.profile_content.profile.profile_content[k].mini_descriptions[o].relate == 'donotexhibitanymore') {
								$scope.profile_content.profile.profile_content[k].mini_descriptions[o].questions.learning[0] = '-';
								$scope.profile_content.profile.profile_content[k].mini_descriptions[o].questions.learning[1] = '-';
								// console.log($scope.profile_content.profile.profile_content[k].mini_descriptions[o].questions.learning, !$scope.profile_content.profile.profile_content[k].mini_descriptions[o].questions.learning[2]);
								if (!$scope.profile_content.profile.profile_content[k].mini_descriptions[o].questions.learning[2])
									return false;
							}
						}
					}
				};
				*/
				// if (!$scope.profile_content.profile.eachSectionRelateCombineComment || !$scope.profile_content.profile.eachSectionRelateCombineComment.learning || !$scope.profile_content.profile.eachSectionRelateCombineComment.learning.ques1)
				// 	return false;
			}

			// if ($scope.profile_content.profile.profile_content.filter(function (keys, ki) { return keys.keyword_id[5] == sno && keys.new_keyword == false && !keys.relate_combine_comment; }).length > 0)
			// 	toSend = false;

			$scope.profile_content.profile.profile_content
				.filter(function (keys, ki) { return keys.keyword_id[5] == sno && keys.new_keyword == false; })
				.forEach(function (keys, ki) {
					var filteredMini = keys.mini_descriptions.filter(function (mini, mI) { return mini.relate == 'donotexhibitanymore'; });
					// console.log(keys.keyword_id, filteredMini);
					if (filteredMini.length > 0) {
						if (!keys.relate_combine_comment)
							toSend = false;
						// console.log(keys.keyword_id, 'mini check', toSend);
					}
				})

			return toSend;
		};

		$scope.validateComment = function (kid) {
			var toSend = false;

			$scope.profile_content.profile.profile_content
				.filter(function (keys, ki) { return keys.keyword_id == kid; })
				.forEach(function (keys, ki) {
					if (keys.mini_descriptions.filter(function (mini) { return mini.mini_by_assessor == false && mini.relate.length && ['relatestrongly', 'relatepartially'].indexOf(mini.relate) != -1 && (!keys.do_ask_comment || (keys.do_ask_comment == 'Yes' && !keys.comment)); }).length > 0) {
						toSend = true;
						return true;
					}
				})

			return toSend;
		};

		$scope.$watch('profile_content.profile.sectionFillDone', function (n, o) {
			if (n != o) {
				if ($scope.section_num == 2 && $scope.checkMiniQuesFill(2)) {
					$timeout(function () {
						$scope.section_num++;
						$('html,body').scrollTop(0);
					}, 0);
				}
				else if ($scope.section_num == 3 && $scope.checkMiniQuesFill(3)) {
					$timeout(function () {
						$scope.submitProfile();
						$('html,body').scrollTop(0);
					}, 0);
				}
				else {
					$scope.saveProfile(1);
					$('html,body').scrollTop(0);
				}
			}
		}, true);

		$scope.calculate_avg = function () {
			var key_sum = 0;
			var checked_len = 0;
			for (var k = 0; k < $scope.profile_content.profile.profile_content.length; k++) {
				key_sum = 0;
				checked_len = 0;
				var mini_len = $scope.profile_content.profile.profile_content[k].mini_descriptions.length;

				for (var q = 0; q < mini_len; q++) {
					if ($scope.profile_content.profile.profile_content[k].mini_descriptions[q].relate) {
						checked_len++;
						key_sum += $scope.profile_content.profile.profile_content[k].mini_descriptions[q].mini_rating;
					}
				}
				if (checked_len)
					$scope.profile_content.profile.profile_content[k].key_rating = key_sum / checked_len;
			}
		};

		$scope.keyAdded = new Array(3).fill(false);
		$scope.pk = {
			keyword: '',
			section_id: 'P00S00',
			keyword_id: 'P00S00K00',
			new_keyword: true,
			linked_keyword: '',
			mini_descriptions: [{ mini_description: '', mini_description_id: 'P00S00K00M00', relate: 'none' }]
		};
		$scope.pushNewKey = function (sno) {
			var kno = 0;

			for (var k = 0; k < $scope.profile_content.profile.profile_content.length; k++) {
				if ($scope.profile_content.profile.profile_content[k].keyword_id[5] == sno)
					kno++;
			}
			kno++;

			if (kno > 9)
				var pid = 'P0' + $scope.profile_content.profile.profile_number + 'S0' + sno + 'K' + kno;
			else
				var pid = 'P0' + $scope.profile_content.profile.profile_number + 'S0' + sno + 'K0' + kno;

			$scope.pk.section_id = pid.substr(0, 6);
			$scope.pk.keyword_id = pid;
			$scope.pk.new_keyword = true;
			$scope.pk.mini_descriptions[0].mini_description_id = pid + 'M01';
			$scope.pk.mini_descriptions[0].relate = 'relatestrongly';
		};

		$scope.addNewKey = function (sno) {
			if ($scope.pk.keyword.length == 0 || $scope.pk.mini_descriptions[0].mini_description.length == 0)
				return;

			$scope.keyAdded[sno - 1] = false;
			$scope.profile_content.profile.profile_content.push($scope.pk);

			$scope.pk.who_added = $scope.profile_content.firstname + ' ' + $scope.profile_content.lastname;
			$scope.pk.who_added_id = $scope.profile_content._id;
			$scope.pk.when_added = new Date;
			addedFactory.saveNew($scope.pk);

			$scope.pk = {
				keyword: '',
				section_id: 'P00S00',
				keyword_id: 'P00S00K00',
				new_keyword: true,
				linked_keyword: '',
				mini_descriptions: [{ mini_description: '', mini_description_id: 'P00S00K00M00', relate: 'none' }]
			};
		};

		function commonSave() {
			var toSave = {
				// 'profile.eachSectionRelateCombineComment': $scope.profile_content.profile.eachSectionRelateCombineComment,
				'profile.eachSectionCombineComment': $scope.profile_content.profile.eachSectionCombineComment,
				'profile.eachSectionEditable': $scope.profile_content.profile.eachSectionEditable,
				'profile.eachSectionRelate': $scope.profile_content.profile.eachSectionRelate,
				'profile.eachSectionShareMore': $scope.profile_content.profile.eachSectionShareMore,
				'profile.eachSectionStopReflect': $scope.profile_content.profile.eachSectionStopReflect,
				'profile.eachSectionStopReflectElse': $scope.profile_content.profile.eachSectionStopReflectElse,
				'profile.eachSectionStopReflectDone': $scope.profile_content.profile.eachSectionStopReflectDone,
				'profile.eachSectionStopReflectPAEI': $scope.profile_content.profile.eachSectionStopReflectPAEI,
				'profile.eachSectionTrack': $scope.profile_content.profile.eachSectionTrack,
				'profile.StopReflectPAEIDropdown': $scope.profile_content.profile.StopReflectPAEIDropdown,
				'proifle.sectionFillDone': $scope.profile_content.profile.sectionFillDone
			};

			if (last_section == 0)
				toSave['profile.beliefs'] = $scope.profile_content.profile.beliefs;
			else if (last_section != 0)
				toSave['profile.profile_content'] = $scope.profile_content.profile.profile_content.filter(function (key) { return key.keyword_id[5] != '4' });

			// console.log(toSave);
			$scope.success = userFactory.saveDetails(toSave);
		}

		$scope.saveProfile = function (num) {
			$scope.calculate_avg();
			var diff = (Date.parse($scope.currentSectionTime) - Date.parse($scope.profile_content.last_modification)) / 1000;
			//console.log(diff);
			$scope.profile_content.last_modification = new Date();

			if (num == 2) {									// on section change
				if (last_section == 0)
					$scope.profile_content.profile.eachSectionTrack.timeBelief.push({ time_taken: diff, attempt: copyTrack.eachSectionTrack.attemptBelief + 1, when: $scope.profile_content.last_modification });
				else if (last_section == 1)
					$scope.profile_content.profile.eachSectionTrack.timeValue.push({ time_taken: diff, attempt: copyTrack.eachSectionTrack.attemptValue + 1, when: $scope.profile_content.last_modification });
				else if (last_section == 2)
					$scope.profile_content.profile.eachSectionTrack.timeStrength.push({ time_taken: diff, attempt: copyTrack.eachSectionTrack.attemptStrength + 1, when: $scope.profile_content.last_modification });
				else if (last_section == 3)
					$scope.profile_content.profile.eachSectionTrack.timeLearning.push({ time_taken: diff, attempt: copyTrack.eachSectionTrack.attemptLearning + 1, when: $scope.profile_content.last_modification });
				//			else if(last_section == 5)
				//				$scope.profile_content.profile.eachSectionTrack.timeGrowth.push({ time_taken: diff, attempt: copyTrack.eachSectionTrack.attemptGrowth + 1, when: $scope.profile_content.last_modification });

				//			if(last_section >= 0 && last_section <= 3)
				$scope.profile_content.profile.eachSectionEditable[last_section] = true;
				//			else if(last_section == 5)
				//				$scope.profile_content.profile.eachSectionEditable[last_section - 1] = true;
			}

			else if (num == 1) {									// on section un-change
				if ($scope.section_num == 0)
					$scope.profile_content.profile.eachSectionTrack.timeBelief.push({ time_taken: diff, attempt: copyTrack.eachSectionTrack.attemptBelief + 1, when: $scope.profile_content.last_modification });
				else if ($scope.section_num == 1)
					$scope.profile_content.profile.eachSectionTrack.timeValue.push({ time_taken: diff, attempt: copyTrack.eachSectionTrack.attemptValue + 1, when: $scope.profile_content.last_modification });
				else if ($scope.section_num == 2)
					$scope.profile_content.profile.eachSectionTrack.timeStrength.push({ time_taken: diff, attempt: copyTrack.eachSectionTrack.attemptStrength + 1, when: $scope.profile_content.last_modification });
				else if ($scope.section_num == 3)
					$scope.profile_content.profile.eachSectionTrack.timeLearning.push({ time_taken: diff, attempt: copyTrack.eachSectionTrack.attemptLearning + 1, when: $scope.profile_content.last_modification });
				//			else if($scope.section_num == 5)
				//				$scope.profile_content.profile.eachSectionTrack.timeGrowth.push({ time_taken: diff, attempt: copyTrack.eachSectionTrack.attemptGrowth + 1, when: $scope.profile_content.last_modification });

				//			if($scope.section_num >= 0 && $scope.section_num <= 3 && $scope.checkSectionFill($scope.section_num))
				if ($scope.checkSectionFill($scope.section_num))
					$scope.profile_content.profile.eachSectionEditable[$scope.section_num] = true;
				//			else if($scope.section_num == 5 && $scope.checkSectionFill($scope.section_num))
				//				$scope.profile_content.profile.eachSectionEditable[$scope.section_num - 1] = true;
			}

			$scope.waitingQueue = true;
			$scope.success = 0;

			commonSave();

			var close = $scope.$watch('success', function (n, o) {
				if (n != o) {
					if (n.message == 'Done') {
						if (num == 2) {
							var section_name = "";
							if (last_section == 0)
								section_name = "Beliefs";
							else if (last_section == 1)
								section_name = "Professional Values and Work Culture Preferences";
							else if (last_section == 2)
								section_name = "Professional Strengths";
							else if (last_section == 3)
								section_name = "Learning Needs";
							//						else if(last_section == 5)
							//							section_name = "Growth Recommendations";

							if ($scope.checkSectionFill(last_section) && !$scope.checkSectionFill($scope.section_num))
								$rootScope.$broadcast('noti:Send', { statement: "filled section '" + section_name + "'." });

							last_section = $scope.section_num;
						}

						$timeout(function () { $scope.success = ''; }, 2000);
						$scope.waitingQueue = false;
					}
					close();
				}
			}, true);   //true for deep comparison
		};

		$scope.submitProfile = function () {
			$scope.calculate_avg();
			/*$scope.profile_content = {	'last_modification': new Date,
											'_id': $scope.profile_content._id,
											'profile': $scope.profile_content.profile,
											'firstname': $scope.profile_content.firstname,
											'lastname': $scope.profile_content.lastname
									 };*/
			var diff = (Date.parse($scope.currentSectionTime) - Date.parse($scope.profile_content.last_modification)) / 1000;
			$scope.profile_content.profile.eachSectionTrack.timeLearning.push({ time_taken: diff, attempt: copyTrack.eachSectionTrack.attemptLearning + 1, when: $scope.profile_content.last_modification });

			$scope.profile_content.last_modification = new Date();

			diff = (Date.parse($scope.profile_content.last_modification) - Date.parse($scope.currentTime)) / 1000;
			$scope.profile_content.profile.track.push({ time_taken: diff, attempt: copyTrack.attemptTrack + 1, when: $scope.profile_content.last_modification });

			$scope.profile_content.profile.eachSectionEditable[3] = true;

			$scope.waitingQueue = true;
			$scope.success = 0;

			commonSave();
			// $scope.success = userFactory.saveDetails($scope.profile_content);

			var lis = $scope.$watch('success', function (n, o) {
				if (n != o) {
					if (n.message == 'Done') {
						$scope.loading = true;

						var mailData = { to: '', bcc: 'facilitator' };
						mailData.subject = $scope.profile_content.firstname + ' ' + $scope.profile_content.lastname + ", your Leadership Profile by iDiscover.me is ready";
						mailData.html = 'Dear ' + $scope.profile_content.firstname + ' ' + $scope.profile_content.lastname + ',<br><br>Thank you for completing the Leadership Assessment by iDiscover.me. Your Leadership Profile is ready!<br><br>The Leadership Profile provides an insight into your core fears, motivations, strengths and learning needs. Don’t forget to go through the growth recommendations provided in the profile. They can help you professionally as well as personally.<br><br>You can view or share your Leadership Profile using the link below:<br>app.idiscover.me/#/trueself-report-share/' + $scope.profile_content._id + '<br><br>Please feel free to contact us at info@idiscover.me if you face any problems or have any queries!<br><br><br>Best Regards,<br>Team iDiscover.me';

						userFactory.sendMailToOwn(mailData);
						if ($scope.profile_content.feedback.submitted)
							$state.go('trueself-report', {});
						else
							$state.go('feedback', {});
						$rootScope.$broadcast('noti:Send', { statement: "filled Trueself Profile." });
					}
					lis();
				}
			}, true);   //true for deep comparison
		};

		$scope.backMenu = function () {
			if ($scope.menu > 1) {
				$('html,body').scrollTop(0);
				$scope.menu -= 1;
			}
		};

		$scope.nextMenu = function () {
			if ($scope.menu < 4) {
				$('html,body').scrollTop(0);
				$scope.menu += 1;
			}
		};

		$scope.newGrowth = {
			selected: true,
			statement: ''
		};

		$scope.pushNewGrowth = function () {
			$scope.profile_content.profile.growth_recommendations.push($scope.newGrowth);

			$scope.newGrowth = {
				selected: true,
				statement: ''
			};
		};

		//top profile(s) switch

		$scope.profile_selected = -1;

		$scope.chosenProfile = function (i) {
			return i;
		};
		$scope.chooseProfile = function (i) {
			$scope.profile_selected = i;
		};

		// $scope.printPDF = function () {
		// 	additionalDataFactory.printPDF($scope.profile_content.firstname + ' ' + $scope.profile_content.lastname, $scope.profile_content.profile.profile_content, $scope.sectionKeysCount, $scope.total_mini, 1, null);
		// };

		$scope.checkToShow = function (kID) {
			if (!kID || !kID.length) return true;

			const filteredKeys = $scope.profile_content.profile.profile_content.filter(function (item) { return kID.indexOf(item['keyword_id']) != -1; });

			const relates = filteredKeys.map(function (key) {
				return key.mini_descriptions
					.filter(function (mini) { return ['relatestrongly', 'relatepartially'].indexOf(mini['relate']) != -1; })
					.map(function (mini) { return mini['relate']; });
			})

			// console.log(relates)

			for (var j = 0; j < relates.length; j++)
				if (relates[j].indexOf('relatestrongly') != -1 || relates[j].indexOf('relatepartially') != -1)
					return true;

			return false;
		};

		$scope.countCompetencies = new Array(8);
		for (var op = 0; op < 8; op++)
			$scope.countCompetencies[op] = new Array(3).fill(0);			// 0 - sum, 1 - counts, 2 - avg

		function calculateCompetencies() {
			for (var k = 0; k < $scope.profile_content.profile.profile_content.length; k++) {
				for (var o = 0; o < $scope.profile_content.profile.profile_content[k].mini_descriptions.length; o++) {
					if ($scope.profile_content.profile.profile_content[k].keyword_id[5] == 2) {
						if ($scope.profile_content.profile.profile_content[k].mini_descriptions[o].paei_tag.tag1) {
							$scope.countCompetencies[0][0] += $scope.profile_content.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[0][1] += 1;
						}
						if ($scope.profile_content.profile.profile_content[k].mini_descriptions[o].paei_tag.tag2) {
							$scope.countCompetencies[1][0] += $scope.profile_content.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[1][1] += 1;
						}
						if ($scope.profile_content.profile.profile_content[k].mini_descriptions[o].paei_tag.tag3) {
							$scope.countCompetencies[2][0] += $scope.profile_content.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[2][1] += 1;
						}
						if ($scope.profile_content.profile.profile_content[k].mini_descriptions[o].paei_tag.tag4) {
							$scope.countCompetencies[3][0] += $scope.profile_content.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[3][1] += 1;
						}
						if ($scope.profile_content.profile.profile_content[k].mini_descriptions[o].paei_tag.tag5) {
							$scope.countCompetencies[4][0] += $scope.profile_content.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[4][1] += 1;
						}
						if ($scope.profile_content.profile.profile_content[k].mini_descriptions[o].paei_tag.tag6) {
							$scope.countCompetencies[5][0] += $scope.profile_content.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[5][1] += 1;
						}
						if ($scope.profile_content.profile.profile_content[k].mini_descriptions[o].paei_tag.tag7) {
							$scope.countCompetencies[6][0] += $scope.profile_content.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[6][1] += 1;
						}
						if ($scope.profile_content.profile.profile_content[k].mini_descriptions[o].paei_tag.tag8) {
							$scope.countCompetencies[7][0] += $scope.profile_content.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[7][1] += 1;
						}
					}
					else if ($scope.profile_content.profile.profile_content[k].keyword_id[5] == 3) {
						if ($scope.profile_content.profile.profile_content[k].mini_descriptions[o].paei_tag.tag1) {
							$scope.countCompetencies[0][0] -= $scope.profile_content.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[0][1] += 1;
						}
						if ($scope.profile_content.profile.profile_content[k].mini_descriptions[o].paei_tag.tag2) {
							$scope.countCompetencies[1][0] -= $scope.profile_content.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[1][1] += 1;
						}
						if ($scope.profile_content.profile.profile_content[k].mini_descriptions[o].paei_tag.tag3) {
							$scope.countCompetencies[2][0] -= $scope.profile_content.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[2][1] += 1;
						}
						if ($scope.profile_content.profile.profile_content[k].mini_descriptions[o].paei_tag.tag4) {
							$scope.countCompetencies[3][0] -= $scope.profile_content.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[3][1] += 1;
						}
						if ($scope.profile_content.profile.profile_content[k].mini_descriptions[o].paei_tag.tag5) {
							$scope.countCompetencies[4][0] -= $scope.profile_content.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[4][1] += 1;
						}
						if ($scope.profile_content.profile.profile_content[k].mini_descriptions[o].paei_tag.tag6) {
							$scope.countCompetencies[5][0] -= $scope.profile_content.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[5][1] += 1;
						}
						if ($scope.profile_content.profile.profile_content[k].mini_descriptions[o].paei_tag.tag7) {
							$scope.countCompetencies[6][0] -= $scope.profile_content.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[6][1] += 1;
						}
						if ($scope.profile_content.profile.profile_content[k].mini_descriptions[o].paei_tag.tag8) {
							$scope.countCompetencies[7][0] -= $scope.profile_content.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[7][1] += 1;
						}
					}
				}
			}

			for (var op = 0; op < 8; op++) {
				if ($scope.countCompetencies[op][1])
					$scope.countCompetencies[op][2] = $scope.countCompetencies[op][0] / $scope.countCompetencies[op][1];
			}
		}

		$scope.printSD = function () {
			additionalDataFactory.SD_PDF($scope.profile_content.firstname + ' ' + $scope.profile_content.lastname, $scope.profile_content.profile.profile_number, $scope.profile_content.profile.profile_content, $scope.profile_content.profile.beliefs);
		};

		$scope.filterSec3 = function () {
			return function (item) {
				return item.keyword_id[5] == '3';
			};
		};
	}])

	.controller('anyPeerController', ['$scope', '$state', '$timeout', '$stateParams', 'userFactory', function ($scope, $state, $timeout, $stateParams, userFactory) {
		$scope.loading = true;
		$scope.verified = false;
		$scope.v_id = null;
		$scope.section_num = 1;

		$scope.checkVerification = function () {
			$scope.success = 0;
			$scope.success = userFactory.checkPeerEmail($stateParams.id, { eid: $scope.v_id });
			var lis = $scope.$watch('success', function (n, o) {
				if (n != o) {
					if (n.success) {
						$timeout(function () {
							$scope.verified = true;
						}, 2000);
					}
					lis();
				}
			}, true);
		};

		var list = $scope.$watch('verified', function (n, o) {
			if (n != o) {
				if (n == true) {
					$scope.user = userFactory.getPeerSpecific({ id: $stateParams.id, eid: $scope.v_id });
					$scope.$watch('user', function (ne, ol) {
						if (ne != ol) {
							$scope.loading = false;
						}
					}, true);   //true for deep comparison
				}
				list();
			}
		}, true);   //true for deep comparison

		$scope.checkSectionFill = function (sno) {
			for (var k = 0; k < $scope.user.peer_reviewer_data.reviews.length; k++) {
				if ($scope.user.peer_reviewer_data.reviews[k].keyword_id[5] == sno) {
					for (var o = 0; o < $scope.user.peer_reviewer_data.reviews[k].mini_descriptions.length; o++) {
						//console.log($scope.user.peer_reviewer_data.reviews[k].mini_descriptions);
						if ($scope.user.peer_reviewer_data.reviews[k].mini_descriptions[o].relate.length == 0)
							return false;
					}
				}
			}
			return true;
		};

		$scope.$watch('section_num', function (n, o) {
			if (n != o) {
				$scope.saveProfile();
				$('html,body').scrollTop(0);
			}
		});

		$scope.calculate_avg = function () {
			var key_sum = 0;
			var checked_len = 0;
			for (var k = 0; k < $scope.user.peer_reviewer_data.reviews.length; k++) {
				key_sum = 0;
				checked_len = 0;
				var mini_len = $scope.user.peer_reviewer_data.reviews[k].mini_descriptions.length;

				for (var q = 0; q < mini_len; q++) {
					if ($scope.user.peer_reviewer_data.reviews[k].mini_descriptions[q].relate) {
						checked_len++;
						key_sum += $scope.user.peer_reviewer_data.reviews[k].mini_descriptions[q].mini_rating;
					}
				}
				if (checked_len)
					$scope.user.peer_reviewer_data.reviews[k].key_rating = key_sum / checked_len;
			}
		};

		$scope.saveProfile = function () {
			$scope.calculate_avg();
			$scope.waitingQueue = true;
			$scope.success = 0;
			$scope.success = userFactory.submitPeerData($stateParams.id, $scope.user.peer_reviewer_number, $scope.user.peer_reviewer_data);

			var lis = $scope.$watch('success', function (n, o) {
				if (n != o) {
					if (n.message == 'Review Submitted !') {
						$timeout(function () { $scope.success = ''; }, 2000);
						$scope.waitingQueue = false;
					}
					lis();
				}
			}, true);   //true for deep comparison
		};

		$scope.submitProfile = function () {
			$scope.calculate_avg();
			$scope.waitingQueue = true;
			$scope.success = 0;
			$scope.success2 = $scope.success = userFactory.submitPeerData($stateParams.id, $scope.user.peer_reviewer_number, $scope.user.peer_reviewer_data);
			var lis = $scope.$watch('success2', function (n, o) {
				if (n != o) {
					if (n.message == 'Review Submitted !') {
						$('html,body').scrollTop(0);
						$scope.success = '';
						$scope.success2 = '';
						//                	$scope.showBalancing = true;
						$scope.doneReviewing = true;
					}
					lis();
				}
			}, true);   //true for deep comparison
		};

		// 3rd View
		// for balancing view only
		$scope.showBalancing = false;
		$scope.doneReviewing = false;
		$scope.temp_content = [];
		$scope.temp_content2 = [];
		var list3 = $scope.$watch('showBalancing', function (n, o) {
			if (n != o) {
				if (n == true) {
					var k = 0, j = 0;

					for (k = 0; k < $scope.user.profile.profile_content.length; k++) {

						if ($scope.user.profile.profile_content[k].linked_keyword) {

							for (j = 0; j < $scope.user.profile.profile_content.length; j++) {

								if ($scope.user.profile.profile_content[k].linked_keyword == $scope.user.profile.profile_content[j].keyword_id) {
									$scope.temp_content[k] = $scope.user.profile.profile_content[j];
									$scope.temp_content2[k] = $scope.user.peer_reviewer_data.reviews[j];
									break;
								}
							}

						}
						else {
							$scope.temp_content[k] = {};
							$scope.temp_content2[k] = {};
						}
					}
				}
				list3();
			}
		}, true);
	}])

	.controller('peerAnalysisController', ['$scope', '$state', '$stateParams', 'userFactory', function ($scope, $state, $stateParams, userFactory) {
		$scope.loading = true;
		$scope.avgPeer;

		userFactory.getPeersData({ id: $stateParams.id })
			.$promise
			.then(function (res) {
				$scope.user = res;
				$scope.loading = false;

				//		doCalculation();
				calculateCompetencies();
			});

		function doCalculation() {
			$scope.avgPeer = new Array($scope.user.peer_reviews[0].reviews.length);
			for (var k = 0; k < $scope.avgPeer.length; k++) {
				$scope.avgPeer[k] = new Array(4).fill(0);						// 0 - keyword_id, 1 - sum, 2 - counts, 4 - avg
			}

			//alloting keyword IDs
			var rc = 0;
			while (rc < $scope.user.peer_reviews[0].reviews.length) {
				$scope.avgPeer[rc][0] = $scope.user.peer_reviews[0].reviews[rc].keyword_id;
				rc++;
			}

			var usc = 0, pc;
			while (usc < $scope.user.peer_reviews.length) {
				rc = 0;
				while (rc < $scope.user.peer_reviews[usc].reviews.length) {
					pc = 0;
					while (pc < $scope.avgPeer.length) {
						if ($scope.avgPeer[pc][0] == $scope.user.peer_reviews[usc].reviews[rc].keyword_id) {
							$scope.avgPeer[rc][1] += $scope.user.peer_reviews[usc].reviews[rc].key_rating;
							$scope.avgPeer[rc][2] += 1;

							break;
						}

						pc++;
					}

					rc++;
				}
				usc++;
			}

			//avg count
			for (var k = 0; k < $scope.avgPeer.length; k++) {
				$scope.avgPeer[k][3] = $scope.avgPeer[k][1] / $scope.avgPeer[k][2];
			}
		}

		$scope.countCompetencies = new Array(8);
		$scope.countCompetencies2 = new Array(8);
		for (var op = 0; op < 8; op++) {
			$scope.countCompetencies[op] = new Array(3).fill(0);			// 0 - sum, 1 - counts, 2 - avg
			$scope.countCompetencies2[op] = new Array(3).fill(0);			// 0 - sum, 1 - counts, 2 - avg
		}

		function calculateCompetencies() {
			for (var k = 0; k < $scope.user.profile.profile_content.length; k++) {
				for (var o = 0; o < $scope.user.profile.profile_content[k].mini_descriptions.length; o++) {
					if ($scope.user.profile.profile_content[k].keyword_id[5] == 2) {
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.tag1) {
							$scope.countCompetencies[0][0] += $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[0][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.tag2) {
							$scope.countCompetencies[1][0] += $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[1][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.tag3) {
							$scope.countCompetencies[2][0] += $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[2][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.tag4) {
							$scope.countCompetencies[3][0] += $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[3][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.tag5) {
							$scope.countCompetencies[4][0] += $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[4][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.tag6) {
							$scope.countCompetencies[5][0] += $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[5][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.tag7) {
							$scope.countCompetencies[6][0] += $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[6][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.tag8) {
							$scope.countCompetencies[7][0] += $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[7][1] += 1;
						}
					}
					else if ($scope.user.profile.profile_content[k].keyword_id[5] == 3) {
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.tag1) {
							$scope.countCompetencies[0][0] -= $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[0][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.tag2) {
							$scope.countCompetencies[1][0] -= $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[1][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.tag3) {
							$scope.countCompetencies[2][0] -= $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[2][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.tag4) {
							$scope.countCompetencies[3][0] -= $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[3][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.tag5) {
							$scope.countCompetencies[4][0] -= $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[4][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.tag6) {
							$scope.countCompetencies[5][0] -= $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[5][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.tag7) {
							$scope.countCompetencies[6][0] -= $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[6][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.tag8) {
							$scope.countCompetencies[7][0] -= $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[7][1] += 1;
						}
					}
				}
			}

			for (var pr = 0; pr < $scope.user.peer_reviews.length; pr++) {
				for (var k = 0; k < $scope.user.peer_reviews[pr].reviews.length; k++) {
					for (var o = 0; o < $scope.user.peer_reviews[pr].reviews[k].mini_descriptions.length; o++) {
						if ($scope.user.peer_reviews[pr].reviews[k].keyword_id[5] == 2) {
							if ($scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].relate && $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].paei_tag.tag1) {
								$scope.countCompetencies2[0][0] += $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].mini_rating;
								$scope.countCompetencies2[0][1] += 1;
							}
							if ($scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].relate && $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].paei_tag.tag2) {
								$scope.countCompetencies2[1][0] += $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].mini_rating;
								$scope.countCompetencies2[1][1] += 1;
							}
							if ($scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].relate && $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].paei_tag.tag3) {
								$scope.countCompetencies2[2][0] += $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].mini_rating;
								$scope.countCompetencies2[2][1] += 1;
							}
							if ($scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].relate && $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].paei_tag.tag4) {
								$scope.countCompetencies2[3][0] += $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].mini_rating;
								$scope.countCompetencies2[3][1] += 1;
							}
							if ($scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].relate && $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].paei_tag.tag5) {
								$scope.countCompetencies2[4][0] += $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].mini_rating;
								$scope.countCompetencies2[4][1] += 1;
							}
							if ($scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].relate && $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].paei_tag.tag6) {
								$scope.countCompetencies2[5][0] += $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].mini_rating;
								$scope.countCompetencies2[5][1] += 1;
							}
							if ($scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].relate && $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].paei_tag.tag7) {
								$scope.countCompetencies2[6][0] += $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].mini_rating;
								$scope.countCompetencies2[6][1] += 1;
							}
							if ($scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].relate && $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].paei_tag.tag8) {
								$scope.countCompetencies2[7][0] += $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].mini_rating;
								$scope.countCompetencies2[7][1] += 1;
							}
						}
						else if ($scope.user.peer_reviews[pr].reviews[k].keyword_id[5] == 3) {
							if ($scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].relate && $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].paei_tag.tag1) {
								$scope.countCompetencies2[0][0] -= $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].mini_rating;
								$scope.countCompetencies2[0][1] += 1;
							}
							if ($scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].relate && $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].paei_tag.tag2) {
								$scope.countCompetencies2[1][0] -= $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].mini_rating;
								$scope.countCompetencies2[1][1] += 1;
							}
							if ($scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].relate && $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].paei_tag.tag3) {
								$scope.countCompetencies2[2][0] -= $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].mini_rating;
								$scope.countCompetencies2[2][1] += 1;
							}
							if ($scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].relate && $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].paei_tag.tag4) {
								$scope.countCompetencies2[3][0] -= $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].mini_rating;
								$scope.countCompetencies2[3][1] += 1;
							}
							if ($scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].relate && $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].paei_tag.tag5) {
								$scope.countCompetencies2[4][0] -= $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].mini_rating;
								$scope.countCompetencies2[4][1] += 1;
							}
							if ($scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].relate && $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].paei_tag.tag6) {
								$scope.countCompetencies2[5][0] -= $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].mini_rating;
								$scope.countCompetencies2[5][1] += 1;
							}
							if ($scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].relate && $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].paei_tag.tag7) {
								$scope.countCompetencies2[6][0] -= $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].mini_rating;
								$scope.countCompetencies2[6][1] += 1;
							}
							if ($scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].relate && $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].paei_tag.tag8) {
								$scope.countCompetencies2[7][0] -= $scope.user.peer_reviews[pr].reviews[k].mini_descriptions[o].mini_rating;
								$scope.countCompetencies2[7][1] += 1;
							}
						}
					}
				}
			}

			for (var op = 0; op < 8; op++) {
				if ($scope.countCompetencies[op][1])
					$scope.countCompetencies[op][2] = $scope.countCompetencies[op][0] / $scope.countCompetencies[op][1];
				if ($scope.countCompetencies2[op][1])
					$scope.countCompetencies2[op][2] = $scope.countCompetencies2[op][0] / $scope.countCompetencies2[op][1];
			}
		}
	}])

	.controller('anyController', ['$scope', '$state', '$stateParams', '$timeout', 'userFactory', 'questionnaireFactory', 'recommendFactory', 'additionalDataFactory', 'libraryFactory', 'keywordFactory', 'competencyFactory', 'growthRecommendAssessorFactory', 'roleFitmentFactory', '$document', '$http', 'Upload', 'synthesisFactory', 'rankFactory', function ($scope, $state, $stateParams, $timeout, userFactory, questionnaireFactory, recommendFactory, additionalDataFactory, libraryFactory, keywordFactory, competencyFactory, growthRecommendAssessorFactory, roleFitmentFactory, $document, $http, $upload, synthesisFactory, rankFactory) {
		$scope.loading = true;

		$scope.sub_heading = additionalDataFactory.sub_heading;
		$scope.basic_fear = additionalDataFactory.basic_fear;
		$scope.key_motivation = additionalDataFactory.key_motivation;
		$scope.dragArray = [];

		$scope.user = userFactory.getSpecific({ id: $stateParams.id });
		$scope.temp_content = [];
		$scope.temp_content2 = [];
		$scope.link = 'app.idiscover.me/#/open-assessor-report/' + $stateParams.id;

		$scope.sectionDescs = additionalDataFactory.sectionDescs;

		$scope.getTotalTime = function () {
			$scope.totalRQ = 0;
			$scope.totalQues = 0;
			$scope.totalDrag = 0;
			$scope.totalProfile = 0;
			$scope.totalBelief = 0;
			$scope.totalValue = 0;
			$scope.totalStr = 0;
			$scope.totalLearn = 0;
			$scope.totalGrowth = 0;

			var attemptRQ = new Array;
			var attemptQues = new Array;
			var attemptDrag = new Array;
			var attemptProfile = new Array;
			var attemptBelief = new Array;
			var attemptValue = new Array;
			var attemptStr = new Array;
			var attemptLearn = new Array;
			var attemptGrowth = new Array;

			for (var k = 0; k < $scope.user.question.RQtrack.length; k++) {
				attemptRQ[$scope.user.question.RQtrack[k].attempt - 1] = ($scope.user.question.RQtrack[k].time_taken);
			}
			for (var k = 0; k < attemptRQ.length; k++) {
				$scope.totalRQ += attemptRQ[k];
			}

			for (var k = 0; k < $scope.user.question.Questrack.length; k++) {
				attemptQues[$scope.user.question.Questrack[k].attempt - 1] = ($scope.user.question.Questrack[k].time_taken);
			}
			for (var k = 0; k < attemptQues.length; k++) {
				$scope.totalQues += attemptQues[k];
			}

			for (var k = 0; k < $scope.user.question.dragTrack.length; k++) {
				attemptDrag[$scope.user.question.dragTrack[k].attempt - 1] = ($scope.user.question.dragTrack[k].time_taken);
			}
			for (var k = 0; k < attemptDrag.length; k++) {
				$scope.totalDrag += attemptDrag[k];
			}

			for (var k = 0; k < $scope.user.profile.track.length; k++) {
				attemptProfile[$scope.user.profile.track[k].attempt - 1] = ($scope.user.profile.track[k].time_taken);
			}
			for (var k = 0; k < attemptProfile.length; k++) {
				$scope.totalProfile += attemptProfile[k];
			}

			for (var k = 0; k < $scope.user.profile.eachSectionTrack.timeBelief.length; k++) {
				attemptBelief[$scope.user.profile.eachSectionTrack.timeBelief[k].attempt - 1] = ($scope.user.profile.eachSectionTrack.timeBelief[k].time_taken);
			}
			for (var k = 0; k < attemptBelief.length; k++) {
				$scope.totalBelief += attemptBelief[k];
			}

			for (var k = 0; k < $scope.user.profile.eachSectionTrack.timeValue.length; k++) {
				attemptValue[$scope.user.profile.eachSectionTrack.timeValue[k].attempt - 1] = ($scope.user.profile.eachSectionTrack.timeValue[k].time_taken);
			}
			for (var k = 0; k < attemptValue.length; k++) {
				$scope.totalValue += attemptValue[k];
			}

			for (var k = 0; k < $scope.user.profile.eachSectionTrack.timeStrength.length; k++) {
				attemptStr[$scope.user.profile.eachSectionTrack.timeStrength[k].attempt - 1] = ($scope.user.profile.eachSectionTrack.timeStrength[k].time_taken);
			}
			for (var k = 0; k < attemptStr.length; k++) {
				$scope.totalStr += attemptStr[k];
			}

			for (var k = 0; k < $scope.user.profile.eachSectionTrack.timeLearning.length; k++) {
				attemptLearn[$scope.user.profile.eachSectionTrack.timeLearning[k].attempt - 1] = ($scope.user.profile.eachSectionTrack.timeLearning[k].time_taken);
			}
			for (var k = 0; k < attemptLearn.length; k++) {
				$scope.totalLearn += attemptLearn[k];
			}

			for (var k = 0; k < $scope.user.profile.eachSectionTrack.timeGrowth.length; k++) {
				attemptGrowth[$scope.user.profile.eachSectionTrack.timeGrowth[k].attempt - 1] = ($scope.user.profile.eachSectionTrack.timeGrowth[k].time_taken);
			}
			for (var k = 0; k < attemptGrowth.length; k++) {
				$scope.totalGrowth += attemptGrowth[k];
			}
		};

		// RR %age count
		$scope.total_mini = 0;
		$scope.sectionKeysCount = new Array(3).fill(0);

		$scope.total_mini_2nd = 0;
		$scope.sectionKeysCount_2nd = new Array(3).fill(0);
		$scope.button_show_2nd = new Array(3).fill(true);

		$scope.total_mini_3rd = 0;
		$scope.sectionKeysCount_3rd = new Array(3).fill(0);
		$scope.button_show_3rd = new Array(3).fill(true);

		function countRRPercentage(profileArray) {
			var k = 0, j = 0;
			$scope.total_mini = 0;
			$scope.sectionKeysCount = new Array(3).fill(0);

			for (k = 0; k < profileArray.length; k++) {
				if (profileArray[k].keyword_id[5] == 3) {
					for (j = 0; j < profileArray[k].mini_descriptions.length; j++) {
						switch (profileArray[k].mini_descriptions[j].relate) {
							case 'donotexhibitanymore':
							case 'relatestrongly':
							case 'relatepartially': $scope.total_mini++;
								break;
						}
						if (profileArray[k].mini_descriptions[j].relate == 'donotexhibitanymore')
							$scope.sectionKeysCount[0]++;
						else if (profileArray[k].mini_descriptions[j].relate == 'relatepartially')
							$scope.sectionKeysCount[1]++;
						else if (profileArray[k].mini_descriptions[j].relate == 'relatestrongly')
							$scope.sectionKeysCount[2]++;
					}
				}
			}
		}

		function countRRPercentageAssessor(profileArray) {
			var k = 0, j = 0;
			$scope.total_mini = 0;
			$scope.sectionKeysCount = new Array(3).fill(0);

			for (k = 0; k < profileArray.length; k++) {
				if (profileArray[k].keyword_id[5] == 3) {
					for (j = 0; j < profileArray[k].mini_descriptions.length; j++) {
						switch (profileArray[k].mini_descriptions[j].assessor_relate) {
							case 'donotexhibitanymore':
							case 'relatestrongly':
							case 'relatepartially': $scope.total_mini++;
								break;
						}
						if (profileArray[k].mini_descriptions[j].assessor_relate == 'donotexhibitanymore')
							$scope.sectionKeysCount[0]++;
						else if (profileArray[k].mini_descriptions[j].assessor_relate == 'relatepartially')
							$scope.sectionKeysCount[1]++;
						else if (profileArray[k].mini_descriptions[j].assessor_relate == 'relatestrongly')
							$scope.sectionKeysCount[2]++;
					}
				}
			}
		}

		function countRRPercentageAssessor_2nd() {
			var k = 0, j = 0;
			$scope.total_mini_2nd = 0;
			$scope.sectionKeysCount_2nd = new Array(3).fill(0);

			$scope.sectionKeysCount_2nd[0] += $scope.user.assessor.RRAddOns.responsive.length;
			$scope.sectionKeysCount_2nd[1] += $scope.user.assessor.RRAddOns.moderate.length;
			$scope.sectionKeysCount_2nd[2] += $scope.user.assessor.RRAddOns.reactive.length;

			$scope.total_mini_2nd = $scope.sectionKeysCount_2nd[0] + $scope.sectionKeysCount_2nd[1] + $scope.sectionKeysCount_2nd[2];
		}

		function countRRPercentageAssessor_3rd() {
			var k = 0, j = 0;
			$scope.total_mini_3rd = 0;
			$scope.sectionKeysCount_3rd = new Array(3).fill(0);

			$scope.sectionKeysCount_3rd[0] += $scope.user.assessor.RRAddOns2.responsive.length;
			$scope.sectionKeysCount_3rd[1] += $scope.user.assessor.RRAddOns2.moderate.length;
			$scope.sectionKeysCount_3rd[2] += $scope.user.assessor.RRAddOns2.reactive.length;

			$scope.total_mini_3rd = $scope.sectionKeysCount_3rd[0] + $scope.sectionKeysCount_3rd[1] + $scope.sectionKeysCount_3rd[2];
		}

		// for balancing view only - START
		function profileViewsSwitch(profileArray) {
			var k = 0, j = 0;
			$scope.temp_content = [];

			for (k = 0; k < profileArray.length; k++) {

				if (profileArray[k].linked_keyword) {

					for (j = 0; j < profileArray.length; j++) {

						if (profileArray[k].linked_keyword == profileArray[j].keyword_id) {
							$scope.temp_content[k] = profileArray[j];
							break;
						}
					}

				}
				else
					$scope.temp_content[k] = {};

				//console.log("here: "+$scope.temp_content[k]);
			}
		}

		$scope.$watch('profile_selected', function (n, o) {
			if (n != o) {
				if (n != -1) {
					profileViewsSwitch($scope.user.profile.old[$scope.profile_selected].pro);
					countRRPercentage($scope.user.profile.old[$scope.profile_selected].pro);
				}
				else if (n == -1) {
					profileViewsSwitch($scope.user.profile.profile_content);
					countRRPercentage($scope.user.profile.profile_content);
				}
			}
		});

		$scope.$watch('menu', function (n, o) {
			if (n != o) {
				if (n == 1) {
					rankFactory.getKeywordData()
						.$promise
						.then(function (rankData) {
							$scope.dragArray = rankData;
						});
				}
				else if (n == 2) {
					if ($scope.profile_selected != -1) {
						countRRPercentage($scope.user.profile.old[$scope.profile_selected].pro);
					}
					else if ($scope.profile_selected == -1) {
						countRRPercentage($scope.user.profile.profile_content);
					}
				}
				else if (n == 4) {
					countRRPercentageAssessor($scope.user.assessor.profile_content);
					countRRPercentageAssessor_2nd();
					countRRPercentageAssessor_3rd();

					if (!$scope.competencies)
						competencyFactory.getComps()
							.$promise
							.then(function (comps) {
								$scope.competencies = comps.slice();
								compArray = comps.map(function (comp) { return comp.competency_id });
							});
				}
			}
		});
		// for balancing view only - END

		var ot = $scope.$watch('user', function (n, o) {
			if (n != o) {
				$scope.loading = false;
				$scope.getTotalTime();

				var assessment_rubric = [["Extremely low level of self-knowledge; lacks clarity in articulating own strengths and areas of development.", "Average level of self-knowledge; understands his strengths but blind towards his learning needs.", "Fully aware and able to clearly articulate own strengths and areas of development."], ["Is in denial state w.r.t. her areas of development; Tendency to blame others in difficult situations.", "Little protective of self-image; Needs to feel safe before opening up.", "Transparent and accepting of her blind-spots; Open to leaning and feedback from peers & manager."], ["Rigid in his attitude to change; not shown any significant personal growth in the past.", "Low level of personal mastery; not worked on many personal challenges in the past.", "Reflective and committed to self-development; Balanced individual who has shown considerable personal growth in the past."]];

				//assigning initial values
				if (!('rounds_feedback' in $scope.user)) {
					$scope.user['rounds_feedback'] = {};
					for (var ques in additionalDataFactory.rounds_feedback_default) {
						if (!(ques in $scope.user['rounds_feedback']) || !$scope.user['rounds_feedback'][ques])
							$scope.user['rounds_feedback'][ques] = additionalDataFactory.rounds_feedback_default[ques];
					}
				}
				if (!('RQ_notes' in $scope.user.question)) {
					$scope.user.question['RQ_notes'] = {};
					for (var ques in additionalDataFactory.RQ_notes_default) {
						if (!(ques in $scope.user.question['RQ_notes']) || !$scope.user.question['RQ_notes'][ques])
							$scope.user.question['RQ_notes'][ques] = additionalDataFactory.RQ_notes_default[ques];
					}
				}
				if ($scope.user.assessor.rubric.length == 0)
					$scope.user.assessor.rubric = assessment_rubric;
				if ($scope.user.assessor.profile_content.length == 0 && $scope.user.profile.profile_content.length != 0) {
					// $scope.calculateBSLscore();
					$scope.user.assessor.profile_content = $scope.user.profile.profile_content.slice();
					$scope.reUpdate();
					$scope.replacePronouns();

					$scope.user.assessor.profile_content
						.filter(function (keyword) { return ['2', '3'].indexOf(keyword.keyword_id[5]) != -1; })
						.forEach(function (keyword) {
							keyword.assessor_checkbox = true;
							if (keyword.keyword_id[5] == 2)
								if (keyword.mini_descriptions.filter(function (mini) { return mini.relate == 'relatestrongly'; }).length == 0)
									keyword.assessor_checkbox = true;
						});
				}

				//CHECKING WHETHER REPORT DESCRIPTIONS ARE THERE OR NOT
				$scope.user.assessor.profile_content
					// .filter(function (keyword) { return [1, 2].indexOf(parseInt(keyword['keyword_id'][5])) != -1; })
					.forEach(function (keyword) {
						if (!keyword['report_keyword'])
							keyword.report_keyword = keyword.keyword;
						if (keyword['report_descriptions'].length == 0) {
							keyword.report_descriptions = keyword.mini_descriptions.slice();
							keyword.report_descriptions.forEach(function (mini) { mini['assessor_mini_checkbox'] = true; })
						}
					});

				if ($scope.user.assessor.recommendations_for_manager.length == 0) {
					$scope.user.assessor.recommendations_for_manager = recommendFactory.getProfile($scope.user.profile.profile_number);
				}
				// if ($scope.user.assessor.score_competencies.length != 0) {
				// 	$scope.countCompetenciesA2 = $scope.user.assessor.score_competencies.slice();
				// }
				if ($scope.user.profile.profile_content && $scope.user.profile.profile_content.length != 0 && !$scope.user.assessor.growth_recommendations_assessor_initialized)
					$scope.growthRecommendationsInitialization();
				if ($scope.user.profile.profile_content && $scope.user.profile.profile_content.length != 0 && $scope.user.assessor.first_person_word_count.learning == 0)
					countFirstPersonWords(3);

				//balancing start
				profileViewsSwitch($scope.user.profile.profile_content);
				//RR views change
				countRRPercentage($scope.user.profile.profile_content);
				//RR assessor button show
				$scope.manageRRButtonShow($scope.user.assessor.per_mast_lvl);

				$scope.dividedObj = { 's0': { '6': 0, '7': 0 }, 's1': {}, 's2': {}, 's3': {} };

				$scope.user.profile.beliefs.forEach(function (item) {
					if (item.how_much > 6) {
						$scope.dividedObj['s0']['6']++;
						if (item.how_much > 7) {
							$scope.dividedObj['s0']['7']++;
						}
					}
				});

				var k = 0, j = 0;

				for (k = 0; k < $scope.user.assessor.profile_content.length; k++) {

					$scope.user.assessor.profile_content[k].mini_descriptions.forEach(function (md) {
						// console.log({ sctn: md.mini_description_id[5], mini_description: md.mini_description, paei_tag: md.paei_tag });
						for (var sub_tag in md.paei_tag.p) {
							if (md.paei_tag.p[sub_tag]) {
								var z = 0;
								for (; z < $scope.allMDp.length; z++) {
									if ($scope.allMDp[z].mini_description == md.mini_description)
										break;
								}
								if (z == $scope.allMDp.length)
									$scope.allMDp.push({ sctn: md.mini_description_id[5], mini_description: md.mini_description, tag: sub_tag });
								break;
							}
						}
						for (var sub_tag in md.paei_tag.a) {
							if (md.paei_tag.a[sub_tag]) {
								var z = 0;
								for (; z < $scope.allMDa.length; z++) {
									if ($scope.allMDa[z].mini_description == md.mini_description)
										break;
								}
								if (z == $scope.allMDa.length)
									$scope.allMDa.push({ sctn: md.mini_description_id[5], mini_description: md.mini_description, tag: sub_tag });
								break;
							}
						}
						for (var sub_tag in md.paei_tag.e) {
							if (md.paei_tag.e[sub_tag]) {
								var z = 0;
								for (; z < $scope.allMDe.length; z++) {
									if ($scope.allMDe[z].mini_description == md.mini_description)
										break;
								}
								if (z == $scope.allMDe.length)
									$scope.allMDe.push({ sctn: md.mini_description_id[5], mini_description: md.mini_description, tag: sub_tag });
								break;
							}
						}
						for (var sub_tag in md.paei_tag.i) {
							if (md.paei_tag.i[sub_tag]) {
								var z = 0;
								for (; z < $scope.allMDi.length; z++) {
									if ($scope.allMDi[z].mini_description == md.mini_description)
										break;
								}
								if (z == $scope.allMDi.length)
									$scope.allMDi.push({ sctn: md.mini_description_id[5], mini_description: md.mini_description, tag: sub_tag });
								break;
							}
						}

						if (("s" + md.mini_description_id[5]) in $scope.dividedObj) {
							if (!(md.relate in $scope.dividedObj["s" + md.mini_description_id[5]])) {
								$scope.dividedObj["s" + md.mini_description_id[5]][md.relate] = 0;
							}
							$scope.dividedObj["s" + md.mini_description_id[5]][md.relate]++;
						}
					});

					if ($scope.user.assessor.profile_content[k].linked_keyword) {

						for (j = 0; j < $scope.user.assessor.profile_content.length; j++) {

							if ($scope.user.assessor.profile_content[k].linked_keyword == $scope.user.assessor.profile_content[j].keyword_id) {
								$scope.temp_content2[k] = $scope.user.assessor.profile_content[j];
								break;
							}
						}
					}
					else
						$scope.temp_content2[k] = {};
				}
				//balancing end

				calculateCompetencies();

				calculateAutomationScores();

				ot();
			}
		}, true);   //true for deep comparison

		//Questionnaire
		$scope.sumQues = new Array(9).fill(0);
		$scope.questionnaire = [];
		$scope.showQuestionnaire = function () {
			$scope.showQuesAnalysis = true;
			questionnaireFactory.query(function (success) {
				$scope.questionnaire = success;
				for (var k = 0; k < $scope.questionnaire.length; k++) {
					//console.log(k + ' ' + $scope.questionnaire.length);
					if ($scope.user.question.questionnaire[k] != 0)
						$scope.sumQues[$scope.questionnaire[k].keywords[parseInt($scope.user.question.questionnaire[k]) - 1].from_profile - 1]++;
				}
			}, function (err) { });
		};

		$scope.checkQues = function (qno, kno) {
			return $scope.questionnaire[parseInt(qno) - 1].keywords[parseInt(kno) - 1].from_profile;
		};

		$scope.puttingType = false;

		$scope.submitTypeByFacilitator = function () {
			$scope.puttingType = true;

			$scope.bodyP = { profile_number: parseInt($scope.type_number) };
			$scope.success = 0;
			$scope.success = userFactory.sendAndSaveProfileDataByFacilitator($scope.user._id, $scope.bodyP);
			var quit = $scope.$watch('success', function (n, o) {
				if (n != o) {
					if (n.success) {
						$scope.success = '';
						$scope.puttingType = false;
						$scope.user = userFactory.getSpecific({ id: $stateParams.id });
					}
					quit();
				}
			}, true);   //true for deep comparison
		};

		//for balancing view save
		// $scope.reverseLinking = function () {
		// 	var k = 0, j = 0;

		// 	for (k = 0; k < $scope.temp_content2.length; k++) {

		// 		if ($scope.temp_content2[k].keyword_id) {
		// 			for (j = 0; j < $scope.user.assessor.profile_content.length; j++) {

		// 				if ($scope.temp_content2[k].keyword_id == $scope.user.assessor.profile_content[j].keyword_id) {

		// 					//$scope.user.assessor.profile_content[j].key_rating = $scope.temp_content[k].key_rating;
		// 					//$scope.user.assessor.profile_content[j].assessor_key_rating = $scope.temp_content2[k].assessor_key_rating;
		// 					//$scope.user.assessor.profile_content[j].keyword = $scope.temp_content2[k].keyword;
		// 					$scope.user.assessor.profile_content[j] = $scope.temp_content2[k];

		// 					break;
		// 				}
		// 			}
		// 		}
		// 	}
		// };

		$scope.checkSectionFill = function (sno) {
			if ('assessor' in $scope.user && 'profile_content' in $scope.user.assessor && $scope.user.assessor.profile_content)
				for (var k = 0; k < $scope.user.assessor.profile_content.length; k++) {
					if ($scope.user.assessor.profile_content[k].keyword_id[5] == sno) {
						for (var o = 0; o < $scope.user.assessor.profile_content[k].mini_descriptions.length; o++) {
							if ('assessor_relate' in $scope.user.assessor.profile_content[k].mini_descriptions[o] && $scope.user.assessor.profile_content[k].mini_descriptions[o].assessor_relate.length == 0)
								return false;
						}
					}
				};

			return true;
		};

		$scope.section_num = 0;
		var compArray = [];

		$scope.$watch('section_num', function (n, o) {
			if (n != o) {
				if (n == 7) {
					if (!($scope.user.assessor.role_fitment && $scope.user.assessor.role_fitment.suitable_work.length))
						roleFitmentFactory.getData($scope.user.profile.profile_number)
							.$promise
							.then(function (roles) {
								$scope.user.assessor.role_fitment.suitable_work = roles.suitable_work.map(function (item) { item.selected = true; return item; });
								$scope.user.assessor.role_fitment.difficult_work = roles.difficult_work.map(function (item) { item.selected = true; return item; });
							});
				}
				else if (n == 6) {
					if ($scope.user.profile.profile_content && $scope.user.profile.profile_content.length != 0 && !$scope.user.assessor.recommendations_for_manager_assessor_initialized)
						$scope.recommendationsForManagerInitialization();
				}
				// else if (n == 5 || n == 6) {
				// 	if (!$scope.competencies)
				// 		competencyFactory.getComps()
				// 			.$promise
				// 			.then(function (comps) {
				// 				$scope.competencies = comps.slice();
				// 				compArray = comps.map(function (comp) { return comp.competency_id });
				// 			});
				// }
				else if (o == 1)
					$scope.success = userFactory.updateSpecific($stateParams.id, { 'profile.eachSectionCombineComment.assessor_belief_note': $scope.user.profile.eachSectionCombineComment.assessor_belief_note });
				if (o == 0)
					$scope.updateAssessorBeliefs();
				else
					$scope.submitAssessor(1);

				$('html,body').scrollTop(0);
			}
		});

		$scope.getProfileCompetencyMapping = function (cID) {
			if (['NA', 'PM', 'P', 'A', 'E', 'I'].indexOf(cID) != -1)
				return cID;
			else if (!(compArray && compArray.length))
				return 'Data Not Loaded Yet !';
			else if (cID) {
				// console.log(cID);
				var indx = compArray.indexOf(cID.toUpperCase());
				if (indx == -1)
					return '';
				else {
					return $scope.competencies[indx]['competency'];
				}
			}
			else
				return '';
		};

		$scope.calculate_avg = function () {
			var key_sum = 0;
			var checked_len = 0;
			for (var k = 0; k < $scope.user.assessor.profile_content.length; k++) {
				key_sum = 0;
				checked_len = 0;
				var mini_len = $scope.user.assessor.profile_content[k].mini_descriptions.length;

				for (var q = 0; q < mini_len; q++) {
					if ($scope.user.assessor.profile_content[k].mini_descriptions[q].assessor_relate) {
						checked_len++;
						key_sum += $scope.user.assessor.profile_content[k].mini_descriptions[q].assessor_mini_rating;
					}
				}
				if (checked_len)
					$scope.user.assessor.profile_content[k].assessor_key_rating = key_sum / checked_len;
			}
		};

		$scope.updateUserSection = function () {
			$scope.success = userFactory.updateSpecific($stateParams.id, { 'profile.eachSectionEditable': $scope.user.profile.eachSectionEditable });
		};

		$scope.updateUserProfile = function () {
			$scope.success = userFactory.updateSpecific($stateParams.id, { 'question': $scope.user.question });
		};

		$scope.submitAssessor = function (num) {
			// $scope.user.assessor.score_competencies = $scope.countCompetenciesA2.slice();
			//		calculateCompetencies();
			// $scope.reverseLinking();

			$scope.calculate_avg();

			$scope.success = userFactory.updateSpecific($stateParams.id, { 'assessor': $scope.user.assessor });
		};

		$scope.$watch('success', function (n, o) {
			if (n != o) {
				if (n.message == "Done") {
					$timeout(function () {
						$scope.success = 0;
					}, 3000);
				}
			}
		}, true);  //true for deep comparison

		//top profile(s) switch	
		$scope.profile_selected = -1;

		$scope.chosenProfile = function (i) {
			return i;
		};
		$scope.chooseProfile = function (i) {
			$scope.profile_selected = i;
		};

		//Assessed Candidate Profile tab
		$scope.add_to_recommend = function () {
			$scope.user.assessor.recommend.push({ title: '', desc: '', page: 1 });
		};

		$scope.remove_to_recommend = function (i) {
			$scope.user.assessor.recommend.splice(i, 1);
		};

		$scope.switchView = 1;

		$scope.addNewLine = function (i) {
			$scope.user.assessor.recommend[i].desc = $scope.user.assessor.recommend[i].desc + '<br>';
		};

		$scope.printPDF = function () {
			additionalDataFactory.printPDF($scope.user.firstname + ' ' + $scope.user.lastname, $scope.user.assessor.profile_content, $scope.sectionKeysCount_2nd, $scope.total_mini_2nd, 2, $scope.user, $scope.temp_content2, $scope.competencies, $scope.user.assessor.recommendations_for_manager);
		};

		$scope.pushResponsiveRR = function () {
			$scope.user.assessor.RRAddOns.responsive.push({ statement: '' });
		};

		$scope.removeResponsiveRR = function (i) {
			$scope.user.assessor.RRAddOns.responsive.splice(i, 1);
		};

		$scope.pushModerateRR = function () {
			$scope.user.assessor.RRAddOns.moderate.push({ statement: '' });
		};

		$scope.removeModerateRR = function (i) {
			$scope.user.assessor.RRAddOns.moderate.splice(i, 1);
		};

		$scope.pushReactiveRR = function () {
			$scope.user.assessor.RRAddOns.reactive.push({ statement: '' });
		};

		$scope.removeReactiveRR = function (i) {
			$scope.user.assessor.RRAddOns.reactive.splice(i, 1);
		};

		$scope.pushResponsiveRR2 = function () {
			$scope.user.assessor.RRAddOns2.responsive.push({ statement: '' });
		};

		$scope.removeResponsiveRR2 = function (i) {
			$scope.user.assessor.RRAddOns2.responsive.splice(i, 1);
		};

		$scope.pushModerateRR2 = function () {
			$scope.user.assessor.RRAddOns2.moderate.push({ statement: '' });
		};

		$scope.removeModerateRR2 = function (i) {
			$scope.user.assessor.RRAddOns2.moderate.splice(i, 1);
		};

		$scope.pushReactiveRR2 = function () {
			$scope.user.assessor.RRAddOns2.reactive.push({ statement: '' });
		};

		$scope.removeReactiveRR2 = function (i) {
			$scope.user.assessor.RRAddOns2.reactive.splice(i, 1);
		};

		// $scope.checkRemainingKeys = function (id) {
		// 	for (var i = 0; i < $scope.temp_content.length; i++) {
		// 		if ($scope.temp_content[i].keyword_id == id)
		// 			return false;
		// 	}
		// 	return true;
		// };

		// $scope.lib = [];
		var tabc = $scope.$watch('assessor_tab', function (n, o) {
			if (n != o) {
				// if (n == 0) {
				// 	var num = '0' + $scope.user.profile.profile_number;
				// 	libraryFactory.query({ num: num }, function (success) {
				// 		$scope.lib = success;
				// 	}, function (err) { });
				// 	tabc();
				// }
				if (n == 3)
					checkAndInsertPAEIstatements();
				else if (n == 5 || n == 6) {
					// if ($scope.syns.length == 0)
					// 	fetchProfileSynthesis();
					// calculateSynthesisCode();
					calculateAutomationScores();
				}
			}
		});

		// $scope.structureLib = {
		// 	statement: ''
		// };

		// $scope.removeLib = function (i, sID) {
		// 	$scope.lib.splice(i, 1);
		// 	var num = '0' + $scope.user.profile.profile_number;
		// 	var num2 = sID[4] + sID[5];
		// 	libraryFactory.delete({ num: num, num2: num2 }, function (success) { }, function (err) { });
		// };

		// $scope.addToLib = function () {
		// 	if ($scope.lib.length == 0)
		// 		$scope.structureLib.sID = ('P0' + $scope.user.profile.profile_number + 'N01');
		// 	else {
		// 		var rhs;
		// 		if (parseInt($scope.lib[$scope.lib.length - 1].sID[5]) == 9)
		// 			rhs = 'N' + (parseInt($scope.lib[$scope.lib.length - 1].sID[4]) + 1) + '0';
		// 		else if (parseInt($scope.lib[$scope.lib.length - 1].sID[5]) < 9)
		// 			rhs = 'N' + parseInt($scope.lib[$scope.lib.length - 1].sID[4]) + (parseInt($scope.lib[$scope.lib.length - 1].sID[5]) + 1);
		// 		else
		// 			rhs = 'N' + (parseInt($scope.lib[$scope.lib.length - 1].sID[5]) + 1);

		// 		$scope.structureLib.sID = ('P0' + $scope.user.profile.profile_number + rhs);
		// 	}
		// 	$scope.lib.push($scope.structureLib);

		// 	libraryFactory.save($scope.structureLib, function (success) { }, function (err) { });

		// 	$scope.structureLib = {
		// 		statement: ''
		// 	};
		// };

		$scope.checkToShow = function (kID) {
			if (!kID)
				return true;

			for (var k = 0; k < $scope.user.profile.profile_content.length; k++) {
				if (kID == $scope.user.profile.profile_content[k].keyword_id) {
					for (var o = 0; o < $scope.user.profile.profile_content[k].mini_descriptions.length; o++) {
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].relate == 'relatestrongly' || $scope.user.profile.profile_content[k].mini_descriptions[o].relate == 'relatepartially')
							return true;
					}
					return false;
				}
			}

			return false;
		};

		//	$scope.firstMD = function(index1){
		//		for(var o = 0 ; o < $scope.user.assessor.profile_content[index1].mini_descriptions.length; o++){
		//			if($scope.user.assessor.profile_content[index1].mini_descriptions[o].assessor_relate != '')
		//				return o;
		//		}
		//	};

		$scope.keyAdded = new Array(3).fill(false);
		$scope.pk = {
			keyword: '',
			section_id: 'P00S00',
			keyword_id: 'P00S00K00',
			new_keyword: true,
			linked_keyword: '',
			mini_descriptions: [{ mini_description: '', mini_description_id: 'P00S00K00M00', relate: 'relatestrongly', paei_tag: { ptag: false, atag: false, etag: false, itag: false }, assessor_report_mini_check: false, mini_by_assessor: true }],
			assessor_report_keyword: '',
			assessor_checkbox: true
		};

		$scope.md = {
			mini_description: '',
			mini_description_id: 'P00S00K00M00',
			relate: 'relatestrongly',
			paei_tag: { ptag: false, atag: false, etag: false, itag: false },
			assessor_report_mini_check: false,
			mini_by_assessor: true
		};

		$scope.pushNewKey = function (sno, from) {
			var kno = 0;

			$scope.user.assessor.profile_content
				.filter(function (keyword) { return sno == keyword.keyword_id[5] })
				.forEach(function (keyword) {
					// console.log(keyword)
					if (sno == 3) {
						if (kno < (parseInt(keyword.keyword_id[7]) * 10 + parseInt(keyword.keyword_id[8])))
							kno = (parseInt(keyword.keyword_id[7]) * 10 + parseInt(keyword.keyword_id[8]));
					}
					else
						keyword.mini_descriptions.forEach(function (mini) {
							if (kno < (parseInt(keyword.keyword_id[7]) * 10 + parseInt(keyword.keyword_id[8])))
								kno = (parseInt(keyword.keyword_id[7]) * 10 + parseInt(keyword.keyword_id[8]));
						});
				});
			kno++;

			if (kno > 9)
				var pid = 'P0' + $scope.user.profile.profile_number + 'S0' + sno + 'K' + kno;
			else
				var pid = 'P0' + $scope.user.profile.profile_number + 'S0' + sno + 'K0' + kno;

			$scope.pk.section_id = pid.substr(0, 6);
			$scope.pk.keyword_id = pid;
			$scope.pk.new_keyword = true;

			if (from) {
				$scope.pk.bsl_score = 0;
				$scope.pk.is_report_keyword = true;
				// console.log($scope.pk);
				$scope.user.assessor.profile_content.push($scope.pk);
				$scope.pk = {
					keyword: '',
					section_id: 'P00S00',
					keyword_id: 'P00S00K00',
					new_keyword: true,
					linked_keyword: '',
					mini_descriptions: [{ mini_description: '', mini_description_id: 'P00S00K00M00', relate: 'relatestrongly', paei_tag: { ptag: false, atag: false, etag: false, itag: false }, assessor_report_mini_check: false, mini_by_assessor: true }],
					assessor_report_keyword: '',
					assessor_checkbox: true
				};

				// alert('Keyword added above with BSL Score 0 !');
			}
			else {
				$scope.pk.mini_descriptions[0].mini_description_id = pid + 'M01';
				$scope.pk.mini_descriptions[0].assessor_relate = 'none';
			}
		};

		$scope.addNewKey = function (sno) {
			if ($scope.pk.keyword.length == 0 || $scope.pk.mini_descriptions[0].mini_description.length == 0)
				return;

			$scope.keyAdded[sno - 1] = false;
			$scope.pk.assessor_report_keyword = $scope.pk.mini_descriptions[0].mini_description;
			$scope.user.assessor.profile_content.push($scope.pk);

			$scope.pk = {
				keyword: '',
				section_id: 'P00S00',
				keyword_id: 'P00S00K00',
				new_keyword: true,
				linked_keyword: '',
				mini_descriptions: [{ mini_description: '', mini_description_id: 'P00S00K00M00', relate: 'relatestrongly', paei_tag: { ptag: false, atag: false, etag: false, itag: false }, assessor_report_mini_check: false, mini_by_assessor: true }],
				assessor_report_keyword: '',
				assessor_checkbox: true
			};
		};

		$scope.pushNewMini = function (pObj) {
			$scope.md.mini_description_id = pObj.keyword_id + '0' + (pObj.mini_descriptions.length + 1);
			$scope.md.mini_by_assessor = true;
			pObj.pushingMini = true;
		};

		$scope.addNewMini = function (pObj) {
			if ($scope.md.mini_description.length == 0)
				return;

			pObj.pushingMini = false;
			pObj.mini_descriptions.push($scope.md);

			$scope.md = {
				mini_description: '',
				mini_description_id: 'P00S00K00M00',
				relate: 'none',
				paei_tag: { ptag: false, atag: false, etag: false, itag: false },
				assessor_report_mini_check: false,
				mini_by_assessor: true
			};
		};

		$scope.pushNewReportMini = function (pObj) {
			if (!pObj.report_descriptions || pObj.report_descriptions.length == 0)
				pObj.report_descriptions = [];

			if (pObj.report_descriptions && pObj.report_descriptions.length > 0)
				pObj.report_descriptions.sort(function (a, b) {
					if (a.mini_description_id > b.mini_description_id)
						return 1;
					else
						return -1;
				});
			if (pObj.report_descriptions && pObj.report_descriptions.length > 0) {
				var tempMax = parseInt(pObj.report_descriptions[pObj.report_descriptions.length - 1].mini_description_id.slice(10));
				tempMax = tempMax > 9 ? tempMax + 1 : '0' + (tempMax + 1);
			}
			else {
				var tempMax = '01';
			}
			$scope.md.mini_description_id = pObj.keyword_id + 'R' + tempMax;
			$scope.md.mini_by_assessor = true;
			$scope.md.assessor_mini_checkbox = true;
			$scope.md.relate = 'relatestrongly';
			// console.log($scope.md)
			pObj.report_descriptions.push($scope.md);

			$scope.md = {
				mini_description: '',
				mini_description_id: 'P00S00K00M00',
				relate: 'relatestrongly',
				paei_tag: { ptag: false, atag: false, etag: false, itag: false },
				assessor_report_mini_check: false,
				mini_by_assessor: true
			};
		};

		$scope.removeReportMini = function (pObj, i) {
			pObj.report_descriptions.splice(i, 1);
		};
		$scope.removeRM_Statement = function (pObj, i) {
			pObj.splice(i, 1);
		};

		$scope.reUpdate = function () {
			$scope.calculateBSLscore();

			var arr_ass = $scope.user.assessor.profile_content;
			var arr_pro = $scope.user.profile.profile_content;

			var key_sum = 0;
			var checked_len = 0;
			var relate_score = {
				donotexhibitanymore: 1,
				donotrelate: 0,
				relatepartially: 1,
				relatestrongly: 2
			};

			arr_pro.forEach(function (key) {
				// console.log('---------------');
				// console.log(key.key_rating);
				key_sum = 0;
				checked_len = 0;
				key.key_rating = 0;
				key.mini_descriptions.forEach(function (mini) {
					if (mini.relate) {
						checked_len++;
						// console.log(mini.mini_relate, relate_score[mini.relate]);
						key_sum += relate_score[mini.relate];
					}
				});
				if (checked_len)
					key.key_rating = key_sum / checked_len;
				// console.log(key.key_rating);
			});

			for (var k = 0; k < arr_ass.length; k++) {
				for (var m = 0; m < arr_pro.length; m++) {

					if (arr_pro[m].keyword_id == arr_ass[k].keyword_id) {
						arr_ass[k].comment = arr_pro[m].comment;
						arr_ass[k].do_ask_comment = arr_pro[m].do_ask_comment;
						arr_ass[k].bsl_score = arr_pro[m].bsl_score;
						arr_ass[k].key_rating = arr_pro[m].key_rating;

						for (var o = 0; o < arr_ass[k].mini_descriptions.length; o++) {
							for (var l = 0; l < arr_pro[m].mini_descriptions.length; l++) {

								if (arr_pro[m].mini_descriptions[l].mini_description_id == arr_ass[k].mini_descriptions[o].mini_description_id) {
									arr_ass[k].mini_descriptions[o].relate = arr_pro[m].mini_descriptions[l].relate;
								}

							}
						}

						break;
					}

				}
			}

			countFirstPersonWords(3);
		};

		$scope.languageUpdate = function () {
			($scope.user.language == 'eng') ? $scope.user.language = 'eng+hin' : $scope.user.language = 'eng';
			$scope.success = userFactory.updateSpecific($stateParams.id, { 'language': $scope.user.language });
		};

		// $scope.countCompetencies = new Array(4);
		// $scope.countCompetenciesA = new Array(4);
		// $scope.countCompetenciesA2 = new Array(4);
		// for (var op = 0; op < 4; op++) {
		// 	$scope.countCompetencies[op] = new Array(3).fill(0);			// 0 - sum, 1 - counts, 2 - avg
		// 	$scope.countCompetenciesA[op] = new Array(3).fill(0);			// 0 - sum, 1 - counts, 2 - avg
		// }

		function calculateCompetencies() {
			for (var k = 0; k < $scope.user.profile.profile_content.length; k++) {
				for (var o = 0; o < $scope.user.profile.profile_content[k].mini_descriptions.length; o++) {
					if ($scope.user.profile.profile_content[k].keyword_id[5] == 2) {
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.ptag) {
							$scope.countCompetencies[0][0] += $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[0][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.atag) {
							$scope.countCompetencies[1][0] += $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[1][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.etag) {
							$scope.countCompetencies[2][0] += $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[2][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.itag) {
							$scope.countCompetencies[3][0] += $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[3][1] += 1;
						}
					}
					else if ($scope.user.profile.profile_content[k].keyword_id[5] == 3) {
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.ptag) {
							$scope.countCompetencies[0][0] -= $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[0][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.atag) {
							$scope.countCompetencies[1][0] -= $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[1][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.etag) {
							$scope.countCompetencies[2][0] -= $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[2][1] += 1;
						}
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].paei_tag.itag) {
							$scope.countCompetencies[3][0] -= $scope.user.profile.profile_content[k].mini_descriptions[o].mini_rating;
							$scope.countCompetencies[3][1] += 1;
						}
					}
				}
			}

			for (var k = 0; k < ($scope.user.assessor.profile_content.length); k++) {
				for (var o = 0; o < $scope.user.assessor.profile_content[k].mini_descriptions.length; o++) {
					if ($scope.user.assessor.profile_content[k].keyword_id[5] == 2) {
						if ($scope.user.assessor.profile_content[k].mini_descriptions[o].assessor_relate && $scope.user.assessor.profile_content[k].mini_descriptions[o].paei_tag.ptag) {
							$scope.countCompetenciesA[0][0] += $scope.user.assessor.profile_content[k].mini_descriptions[o].assessor_mini_rating;
							$scope.countCompetenciesA[0][1] += 1;
						}
						if ($scope.user.assessor.profile_content[k].mini_descriptions[o].assessor_relate && $scope.user.assessor.profile_content[k].mini_descriptions[o].paei_tag.atag) {
							$scope.countCompetenciesA[1][0] += $scope.user.assessor.profile_content[k].mini_descriptions[o].assessor_mini_rating;
							$scope.countCompetenciesA[1][1] += 1;
						}
						if ($scope.user.assessor.profile_content[k].mini_descriptions[o].assessor_relate && $scope.user.assessor.profile_content[k].mini_descriptions[o].paei_tag.etag) {
							$scope.countCompetenciesA[2][0] += $scope.user.assessor.profile_content[k].mini_descriptions[o].assessor_mini_rating;
							$scope.countCompetenciesA[2][1] += 1;
						}
						if ($scope.user.assessor.profile_content[k].mini_descriptions[o].assessor_relate && $scope.user.assessor.profile_content[k].mini_descriptions[o].paei_tag.itag) {
							$scope.countCompetenciesA[3][0] += $scope.user.assessor.profile_content[k].mini_descriptions[o].assessor_mini_rating;
							$scope.countCompetenciesA[3][1] += 1;
						}
					}
					else if ($scope.user.assessor.profile_content[k].keyword_id[5] == 3) {
						if ($scope.user.assessor.profile_content[k].mini_descriptions[o].assessor_relate && $scope.user.assessor.profile_content[k].mini_descriptions[o].paei_tag.ptag) {
							$scope.countCompetenciesA[0][0] -= $scope.user.assessor.profile_content[k].mini_descriptions[o].assessor_mini_rating;
							$scope.countCompetenciesA[0][1] += 1;
						}
						if ($scope.user.assessor.profile_content[k].mini_descriptions[o].assessor_relate && $scope.user.assessor.profile_content[k].mini_descriptions[o].paei_tag.atag) {
							$scope.countCompetenciesA[1][0] -= $scope.user.assessor.profile_content[k].mini_descriptions[o].assessor_mini_rating;
							$scope.countCompetenciesA[1][1] += 1;
						}
						if ($scope.user.assessor.profile_content[k].mini_descriptions[o].assessor_relate && $scope.user.assessor.profile_content[k].mini_descriptions[o].paei_tag.etag) {
							$scope.countCompetenciesA[2][0] -= $scope.user.assessor.profile_content[k].mini_descriptions[o].assessor_mini_rating;
							$scope.countCompetenciesA[2][1] += 1;
						}
						if ($scope.user.assessor.profile_content[k].mini_descriptions[o].assessor_relate && $scope.user.assessor.profile_content[k].mini_descriptions[o].paei_tag.itag) {
							$scope.countCompetenciesA[3][0] -= $scope.user.assessor.profile_content[k].mini_descriptions[o].assessor_mini_rating;
							$scope.countCompetenciesA[3][1] += 1;
						}
					}
				}
			}

			// for (var op = 0; op < 4; op++) {
			// 	if ($scope.countCompetencies[op][1])
			// 		$scope.countCompetencies[op][2] = $scope.countCompetencies[op][0] / $scope.countCompetencies[op][1];
			// 	if ($scope.countCompetenciesA[op][1])
			// 		$scope.countCompetenciesA[op][2] = $scope.countCompetenciesA[op][0] / $scope.countCompetenciesA[op][1];

			// 	if ($scope.user.assessor.score_competencies.length == 0)
			// 		$scope.countCompetenciesA2 = $scope.countCompetenciesA.slice();
			// }
		}

		$scope.updateExp = function () {
			$scope.success = userFactory.updateSpecific($stateParams.id, { 'work_details.experience': $scope.user.work_details.experience });
		};

		$scope.addDescToTag = function (tag) {
			switch (tag) {
				case 'P': $scope.user.assessor.paei_desc.p.push({ statement: "" }); break;
				case 'A': $scope.user.assessor.paei_desc.a.push({ statement: "" }); break;
				case 'E': $scope.user.assessor.paei_desc.e.push({ statement: "" }); break;
				case 'I': $scope.user.assessor.paei_desc.i.push({ statement: "" });
			}
		};

		$scope.removeDescFromTag = function (tag, ind) {
			if (confirm("Want to remove ?"))
				switch (tag) {
					case 'P': $scope.user.assessor.paei_desc.p.splice(ind, 1); break;
					case 'A': $scope.user.assessor.paei_desc.a.splice(ind, 1); break;
					case 'E': $scope.user.assessor.paei_desc.e.splice(ind, 1); break;
					case 'I': $scope.user.assessor.paei_desc.i.splice(ind, 1);
				}
		};

		$scope.allMDp = [];
		$scope.allMDa = [];
		$scope.allMDe = [];
		$scope.allMDi = [];

		$scope.copyThis = function (tag, ind, stat) {
			//		console.log(tag+" | "+stat+" | "+ind);
			switch (tag) {
				case 'P': $scope.user.assessor.paei_desc.p[ind].statement = stat; break;
				case 'A': $scope.user.assessor.paei_desc.a[ind].statement = stat; break;
				case 'E': $scope.user.assessor.paei_desc.e[ind].statement = stat; break;
				case 'I': $scope.user.assessor.paei_desc.i[ind].statement = stat;
			}
		};

		$scope.makeAssessorKeyword = function (pInd) {
			// $scope.user.assessor.profile_content[pInd].assessor_report_keyword = [];
			// $scope.user.assessor.profile_content[pInd].mini_descriptions.forEach(function (mini, index) {
			// 	if ($scope.user.assessor.profile_content[pInd].mini_descriptions[index].assessor_report_mini_check)
			// 		$scope.user.assessor.profile_content[pInd].assessor_report_keyword.push($scope.user.assessor.profile_content[pInd].mini_descriptions[index].mini_description);
			// });
			// $scope.user.assessor.profile_content[pInd].assessor_report_keyword = $scope.user.assessor.profile_content[pInd].assessor_report_keyword.join(" \\ ");

			// console.log($scope.user.assessor.profile_content[pInd].assessor_report_keyword);
		};

		$scope.relatePressed = function (pi, i) {
			if (($scope.user.assessor.profile_content[pi].mini_descriptions[i].assessor_relate.indexOf('relatepartially') != -1) || ($scope.user.assessor.profile_content[pi].mini_descriptions[i].assessor_relate.indexOf('relatestrongly') != -1)) {
				// $scope.user.assessor.profile_content[pi].mini_descriptions[i].assessor_report_mini_check = true;
				// $scope.makeAssessorKeyword(pi);
				$scope.user.assessor.profile_content[pi].assessor_checkbox = true;
			}
		};

		$scope.manageRRButtonShow = function (selection) {
			// alert(selection);
			switch (selection) {
				case 'Responsive':
					$scope.button_show_2nd = [true, false, false];
					$scope.button_show_3rd = [true, false, false];
					break;
				case 'Moderate moving towards Responsive':
					$scope.button_show_2nd = [true, false, false];
					$scope.button_show_3rd = [true, false, false];
					break;
				case 'Moderate':
					$scope.button_show_2nd = [true, false, false];
					$scope.button_show_3rd = [false, true, false];
					break;
				case 'Reactive moving towards Moderate':
					$scope.button_show_2nd = [false, true, false];
					$scope.button_show_3rd = [false, true, false];
					break;
				case 'Reactive':
					$scope.button_show_2nd = [false, true, false];
					$scope.button_show_3rd = [false, false, true];
			}
		};

		$scope.sendToAssessorLibrary = function (which, pObj, mIn) {
			switch (which) {
				case 'key':
					if (confirm('Are you sure to add "' + pObj.keyword + '" in Assessor Library ?'))
						keywordFactory.addNewByAssessor(which, pObj)
							.$promise
							.then(function (res) {
								if (res.success) {
									pObj.key_added_to_assessor_library = true;
									pObj.mini_descriptions.forEach(function (item) {
										item.added_to_assessor_library = true;
									});
									alert(res.message);
									$scope.submitAssessor(1);
								}
								else {
									alert(JSON.stringify(res.message));
								}
							});
					break;
				case 'mini':
					if (confirm('Are you sure to add "' + pObj.mini_descriptions[mIn].mini_description + '" in Assessor Library ?'))
						keywordFactory.addNewByAssessor(which, { keyword: pObj.keyword, mini_descriptions: pObj.mini_descriptions[mIn] })
							.$promise
							.then(function (res) {
								if (res.success) {
									pObj.mini_descriptions[mIn].added_to_assessor_library = true;
									alert(res.message);
									$scope.submitAssessor(1);
								}
								else {
									alert(JSON.stringify(res.message));
								}
							});
					break;
				case 'growth_by_assessor':
					if (confirm('Are you sure to add "' + pObj.brief + '" in Assessor Library ?'))
						growthRecommendAssessorFactory.addNewByAssessor(pObj)
							.$promise
							.then(function (res) {
								if (res.success) {
									pObj.added_to_assessor_library = true;
									pObj.selected = !pObj.selected;
									alert(res.message);
									$scope.submitGrowthRecAssessor();
								}
								else {
									alert(JSON.stringify(res.message));
								}
							});
					break;
				case 'recommendations_for_manager':
					if (confirm('Are you sure to add "' + pObj.brief + '" in Assessor Library ?'))
						recommendFactory.addNewByAssessor(pObj)
							.$promise
							.then(function (res) {
								if (res.success) {
									pObj.added_to_assessor_library = true;
									pObj.selected = !pObj.selected;
									alert(res.message);
									$scope.submitRecForManager();
								}
								else {
									alert(JSON.stringify(res.message));
								}
							});
					break;
				case 'role_fitmentS':
					if (confirm('Are you sure to add "' + pObj.statement + '" in Assessor Library ?'))
						roleFitmentFactory.saveNew('suitable_work', $scope.user.profile.profile_number, pObj)
							.$promise
							.then(function (res) {
								if (res.success) {
									pObj.added_to_assessor_library = true;
									alert(res.message);
									$scope.submitRoleFitment();
								}
								else {
									alert(JSON.stringify(res.message));
								}
							});
					break;
				case 'role_fitmentD':
					if (confirm('Are you sure to add "' + pObj.statement + '" in Assessor Library ?'))
						roleFitmentFactory.saveNew('difficult_work', $scope.user.profile.profile_number, pObj)
							.$promise
							.then(function (res) {
								if (res.success) {
									pObj.added_to_assessor_library = true;
									alert(res.message);
									$scope.submitRoleFitment();
								}
								else {
									alert(JSON.stringify(res.message));
								}
							});
			}

		};

		$scope.dividedObj = { 's0': { '6': 0, '7': 0 }, 's1': {}, 's2': {}, 's3': {} };

		$scope.printSD = function () {
			additionalDataFactory.SD_PDF($scope.user.firstname + ' ' + $scope.user.lastname, $scope.user.profile.profile_number, $scope.user.profile.profile_content, $scope.user.profile.beliefs);
		};

		//GROWTH RECOMMENDATIONS (ASSESSOR)
		$scope.submitGrowthRecAssessor = function () {
			$scope.success = userFactory.updateSpecific($stateParams.id, { 'profile.growth_recommendations_assessor': $scope.user.profile.growth_recommendations_assessor });
		};

		$scope.addingGrowthRecAssessor = false;
		$scope.addingGrowthRecAssessorObj = {
			brief: '',
			statement: '',
			selected: true,
			linked_competency: 'C__',
			linked_keywords: '',
			growth_by_assessor: true
		};

		$scope.addGrowthRecAssessor = function () {
			$scope.addingGrowthRecAssessor = true;
		};

		$scope.pushGrowthRecAssessor = function () {
			if (!$scope.addingGrowthRecAssessorObj.brief || !$scope.addingGrowthRecAssessorObj.statement)
				return alert("Kindly fill all the details");

			$scope.addingGrowthRecAssessorObj.sID = 'P0' + $scope.user.profile.profile_number + 'N__';
			$scope.addingGrowthRecAssessorObj.linked_keywords = $scope.addingGrowthRecAssessorObj.linked_keywords ? [$scope.addingGrowthRecAssessorObj.linked_keywords] : [];
			$scope.user.profile.growth_recommendations_assessor.push($scope.addingGrowthRecAssessorObj);

			$scope.addingGrowthRecAssessor = false;
			$scope.addingGrowthRecAssessorObj = {
				sID: 'P0' + $scope.user.profile.profile_number + 'N__',
				brief: '',
				statement: '',
				selected: true,
				linked_competency: 'C__',
				linked_keywords: '',
				growth_by_assessor: true
			};
			$scope.submitGrowthRecAssessor();
		};

		//RECOMMENDATIONS FOR MANAGER
		$scope.submitRecForManager = function () {
			$scope.success = userFactory.updateSpecific($stateParams.id, { 'assessor.recommendations_for_manager': $scope.user.assessor.recommendations_for_manager });
		};
		$scope.addingRecForManager = false;
		$scope.addingRecForManagerObj = {
			brief: '',
			statement: '',
			selected: true,
			linked_competency: 'C__',
			recommendation_by_assessor: true
		};

		$scope.addRecForManager = function () {
			$scope.addingRecForManager = true;
		};

		$scope.pushRecForManager = function () {
			if (!$scope.addingRecForManagerObj.brief || !$scope.addingRecForManagerObj.statement)
				return alert("Kindly fill all the details");

			$scope.addingRecForManagerObj.sID = 'P0' + $scope.user.profile.profile_number + 'N__';
			$scope.user.assessor.recommendations_for_manager.push($scope.addingRecForManagerObj);

			$scope.addingRecForManager = false;
			$scope.addingRecForManagerObj = {
				sID: 'P0' + $scope.user.profile.profile_number + 'N__',
				brief: '',
				statement: '',
				selected: true,
				linked_competency: 'C__',
				recommendation_by_assessor: true
			};
			$scope.submitRecForManager();
		};

		//ROLE FITMENT
		$scope.submitRoleFitment = function () {
			$scope.success = userFactory.updateSpecific($stateParams.id, { 'assessor.role_fitment': $scope.user.assessor.role_fitment });
		};
		$scope.addingRoleFitment = false;
		$scope.addingRoleFitmentS = false;
		$scope.addingRoleFitmentD = false;
		$scope.addingRoleFitmentObj = {
			statement: '',
			selected: true,
			by_assessor: true
		};

		$scope.addRoleFitment = function (which) {
			$scope.addingRoleFitment = true;
			which == 'S' ? $scope.addingRoleFitmentS = true : $scope.addingRoleFitmentD = true;
		};

		$scope.pushRoleFitment = function () {
			if (!$scope.addingRoleFitmentObj.statement)
				return alert("Kindly fill all the details");

			$scope.addingRoleFitmentS ? $scope.user.assessor.role_fitment.suitable_work.push($scope.addingRoleFitmentObj) : $scope.user.assessor.role_fitment.difficult_work.push($scope.addingRoleFitmentObj);

			$scope.addingRoleFitment = false;
			$scope.addingRoleFitmentS = false;
			$scope.addingRoleFitmentD = false;
			$scope.addingRoleFitmentObj = {
				statement: '',
				selected: true,
				by_assessor: true
			};
			$scope.submitRoleFitment();
		};

		function checkAndInsertPAEIstatements() {
			if (!$scope.user.assessor.paei_desc || ($scope.user.assessor.paei_desc.p.length == 0 && $scope.user.assessor.paei_desc.a.length == 0 && $scope.user.assessor.paei_desc.e.length == 0 && $scope.user.assessor.paei_desc.i.length == 0))
				$scope.user.assessor.profile_content.forEach(function (keyword, kI) {
					if (keyword.keyword_id[5] == '2' || keyword.keyword_id[5] == '3')
						keyword.mini_descriptions.forEach(function (mini, mI) {
							if (mini.assessor_relate == 'relatepartially' || mini.assessor_relate == 'relatestrongly') {
								// console.log(mini.mini_description_id);
								for (var sub_tag in mini.paei_tag.p) {
									if (mini.paei_tag.p[sub_tag]) {
										$scope.user.assessor.paei_desc.p.push({ statement: mini.mini_description });
										break;
									}
								}
								for (var sub_tag in mini.paei_tag.a) {
									if (mini.paei_tag.a[sub_tag]) {
										$scope.user.assessor.paei_desc.a.push({ statement: mini.mini_description });
										break;
									}
								}
								for (var sub_tag in mini.paei_tag.e) {
									if (mini.paei_tag.e[sub_tag]) {
										$scope.user.assessor.paei_desc.e.push({ statement: mini.mini_description });
										break;
									}
								}
								for (var sub_tag in mini.paei_tag.i) {
									if (mini.paei_tag.i[sub_tag]) {
										$scope.user.assessor.paei_desc.i.push({ statement: mini.mini_description });
										break;
									}
								}
							}
						});
				});
		}

		//initialization
		function checkRelateOfMini(mini_id) {
			const keys = $scope.user.profile.profile_content.filter(function (key) { return key.keyword_id[5] == '3' });
			for (var i = 0; i < keys.length; i++) {
				for (var j = 0; j < keys[i].mini_descriptions.length; j++) {
					if (keys[i].mini_descriptions[j].mini_description_id == mini_id)
						return keys[i].mini_descriptions[j].relate;
				}
			}
			return "";
		}

		$scope.growthRecommendationsInitialization = function () {
			$scope.user.profile.growth_recommendations_assessor.forEach(function (item) {
				item.linked_keywords.forEach(function (mini) {
					if (['relatestrongly', 'relatepartially'].indexOf(checkRelateOfMini(mini.mini_id)) != -1) {
						item.selected = true;
					}
				});
			});
			$scope.user.assessor.growth_recommendations_assessor_initialized = true;
			$scope.success = userFactory.updateSpecific($stateParams.id, { 'assessor.growth_recommendations_assessor_initialized': $scope.user.assessor.growth_recommendations_assessor_initialized });
		};

		$scope.recommendationsForManagerInitialization = function () {
			$scope.user.assessor.recommendations_for_manager.forEach(function (item) {
				if ('linked_keywords' in item && item.linked_keywords)
					item.linked_keywords.forEach(function (mini) {
						if (['relatestrongly', 'relatepartially'].indexOf(checkRelateOfMini(mini.mini_id)) != -1) {
							item.selected = true;
						}
					});
			});
			$scope.user.assessor.recommendations_for_manager_assessor_initialized = true;
			$scope.success = userFactory.updateSpecific($stateParams.id, { 'assessor.recommendations_for_manager_assessor_initialized': $scope.user.assessor.recommendations_for_manager_assessor_initialized });
		};

		$scope.grabChange = function (val) {
			alert(val)
		};

		$scope.editorStatus = {
			"bold": "format_bold",
			"italic": "format_italic",
			"insertParagraph": "keyboard_return"
		};

		$scope.doFormat = function (cmd, val) {
			console.log(cmd, null, val);
			document.execCommand(cmd);
			console.log(val);
		};

		function giveFirstPersonCount(sentence) {
			var words = [];

			words = sentence ? sentence.toLowerCase().split(/,| |-|[.]/).filter(function (word) {
				return ['i', 'me', 'myself', 'mine'].indexOf(word) != -1;
			}) : [];
			return words.length;
		}

		function countFirstPersonWords(sno) {
			$scope.user.assessor.first_person_word_count.learning = 0;

			$scope.user.profile.profile_content
				.filter(function (keyword) { return keyword.keyword_id[5] == sno; })
				.forEach(function (keyword) {
					$scope.user.assessor.first_person_word_count.learning += giveFirstPersonCount(keyword.comment);
				});

			$scope.user.assessor.first_person_word_count.learning += giveFirstPersonCount($scope.user.profile.eachSectionCombineComment.learning[0]);
			$scope.user.assessor.first_person_word_count.learning += giveFirstPersonCount($scope.user.profile.eachSectionCombineComment.learning[1]);
			$scope.user.assessor.first_person_word_count.learning += giveFirstPersonCount($scope.user.profile.eachSectionCombineComment.learning[2]);
		}

		$scope.calculateBSLscore = function () {
			// console.log('inside')
			$scope.user.assessor.profile_content.forEach(function (keyword) {
				// if (keyword.key_rating >= 0 && keyword.key_rating < 0.5)
				// 	keyword.bsl_score = 1;
				// else if (keyword.key_rating >= 0.5 && keyword.key_rating < 1)
				// 	keyword.bsl_score = 2;
				// else if (keyword.key_rating >= 1)
				keyword.bsl_score = keyword.key_rating;
			});

			$scope.user.profile.beliefs.forEach(function (belief) {
				if (((belief.how_much < 8 && (['Belief is limiting (Reactive)'].indexOf(belief['assessor_option']) != -1)) || ((belief.how_much >= 8) && (['Belief is in balance', 'Belief not understood'].indexOf(belief['assessor_option']) == -1))) && 'linked_ln' in belief) {
					// console.log(belief.linked_ln)
					belief.linked_ln.forEach(function (key_id) {
						var tmp = $scope.user.assessor.profile_content.filter(function (keyword) { return keyword.keyword_id == key_id });
						if (tmp && tmp.length) tmp[0]['bsl_score']++;
						// console.log($scope.user.assessor.profile_content.filter(function (keyword) { return keyword.keyword_id == key_id })[0]['bsl_score']);
					});
				}
			});

			$scope.user.assessor.profile_content
				.filter(function (keyword) { return keyword.keyword_id[5] == 2 })
				.forEach(function (keyword) {
					keyword.mini_descriptions.forEach(function (mini) {
						if (mini.relate == 'relatestrongly' && 'linked_ln' in mini) {
							mini.linked_ln.forEach(function (key_id) {
								var tmp = $scope.user.assessor.profile_content.filter(function (keyword) { return keyword.keyword_id == key_id });
								if (tmp && tmp.length) tmp[0]['bsl_score']++;
								// console.log($scope.user.assessor.profile_content.filter(function (keyword) { return keyword.keyword_id == key_id })[0]['assessor_checkbox']);
							});
						}
					});
				});
		};

		$scope.filterSec1 = function () {
			return function (item) {
				return item.keyword_id && item.keyword_id[5] == '1';
			};
		};

		$scope.filterSec2 = function () {
			return function (item) {
				return item.keyword_id && item.keyword_id[5] == '2';
			};
		};

		$scope.filterSec3 = function () {
			return function (item) {
				return item.keyword_id && item.keyword_id[5] == '3';
			};
		};

		$scope.pronoun_to_replace = {
			_his_: 'her',
			_himself_: 'herself',
			_him_: 'her',
			_he_: 'she',
			_His_: 'Her',
			_Himself_: 'Herself',
			_Him_: 'Her',
			_He_: 'She'
		};

		$scope.replacePronouns = function () {
			// $scope.user.sex = 'Female';
			$scope.user.assessor.profile_content
				.filter(function (keyword) { return keyword.keyword_id[5] == 3 })
				.forEach(function (keyword) {
					keyword.report_descriptions.forEach(function (mini) {
						// console.log(mini.mini_description);
						switch ($scope.user.sex) {
							case 'Female':
								for (var key in $scope.pronoun_to_replace) {
									mini.mini_description = mini.mini_description.replace(new RegExp(key, 'g'), $scope.pronoun_to_replace[key]);
								}
								break;
							default:
								mini.mini_description = mini.mini_description.replace(/[_]/g, '');
						}
						// console.log(mini.mini_description);
						// console.log('------------------------------');
					});
				});
		};

		// UPLOADING FILES
		$scope.files = [];

		$scope.$watch('user.attachments', function (n, o) {
			if (n && o && n.length != o.length) {
				// console.log(n.length ,$scope.oldCount,$scope.files.length);
				if ((n.length - $scope.oldCount) == $scope.files.length)
					$scope.success = userFactory.updateSpecific($stateParams.id, { attachments: $scope.user.attachments });
			}
		}, true);

		$scope.oldCount = 0;

		$scope.uploadFiles = function (files) {
			var d = new Date().getTime();
			$scope.oldCount = $scope.user.attachments.length || 0;

			var tkn = $http.defaults.headers.common['x-access-token'];
			delete $http.defaults.headers.common['x-access-token'];

			$scope.files = files;
			if (!$scope.files) return;
			files.forEach(function (file, fi) {
				if (file && !file.$error) {
					file.upload = $upload.upload({
						url: "https://345459641734613:nSWjHitGmZdC5D79jMUddHxWNLc@api.cloudinary.com/v1_1/idiscover-me/upload",
						data: {
							upload_preset: "xw5x9fwo",
							tags: 'assessor_attachments',
							context: 'photo=' + d,
							file: file
						}
					})
						.progress(function (e) {
							file.progress = Math.round((e.loaded * 100.0) / e.total);
							file.status = "Uploading... " + file.progress + "%";
						})
						.success(function (data, status, headers, config) {
							data.context = { custom: { photo: d } };
							file.result = data;

							if (!$scope.user.attachments || $scope.user.attachments.length == 0)
								$scope.user.attachments = [];

							$scope.user.attachments.push({ filename: file.result.original_filename, url: file.result.url });
						})
						.error(function (data, status, headers, config) {
							// console.log(JSON.stringify(data));
							file.result = data;
							alert(file.result.error.message);
						});
				}
			});

			$http.defaults.headers.common['x-access-token'] = tkn;
		};

		// Profile Synthesis
		$scope.syns = [];

		function fetchProfileSynthesis() {
			// $scope.calculateBSLscore()
			synthesisFactory.getData($scope.user.profile.profile_number)
				.$promise
				.then(function (data) {
					// console.log(data)
					$scope.syns = data;
					calculateSynthesisCode();
				});
		}

		$scope.calculateTotalBsScore = function () {
			var toRet = { both: 0, system: 0, user: 0, none: 0 };

			if ($scope.user.assessor && $scope.user.assessor['profile_content'])
				$scope.user.assessor.profile_content
					.filter(function (key) { return key.keyword_id && key.keyword_id[5] == 3 && !key.new_keyword; })
					.forEach(function (key) {
						var bs_score = 0;

						$scope.user.profile.beliefs
							.filter(function (belief) { return (('linked_ln' in belief) && (belief.linked_ln.indexOf(key.keyword_id) != -1)); })
							.forEach(function (belief) {
								if ((belief.how_much < 8 && (['Belief is limiting (Reactive)'].indexOf(belief['assessor_option']) != -1)) || ((belief.how_much >= 8) && (['Belief is in balance', 'Belief not understood'].indexOf(belief['assessor_option']) == -1)))
									bs_score++;
							});

						$scope.user.assessor.profile_content
							.filter(function (keyword) { return keyword.keyword_id && keyword.keyword_id[5] == 2 && !key.new_keyword; })
							.forEach(function (keyword) {
								keyword.mini_descriptions
									.filter(function (mini) { return (('linked_ln' in mini) && (mini.linked_ln.indexOf(key.keyword_id) != -1) && !mini.mini_by_assessor); })
									.forEach(function (mini) {
										if (mini.relate == 'relatestrongly')
											bs_score++;
									});
							});

						(key.key_rating >= 0.5) && (bs_score >= 1) ? toRet['both']++ : ((key.key_rating >= 0.5) ? toRet['user']++ : ((bs_score >= 1) ? toRet['system']++ : toRet['none']++));
					});

			return toRet;
		};

		$scope.calculateBsScore = function (ln_id) {
			var bs_score = 0;
			var total_bs = 0;

			$scope.user.profile.beliefs
				.filter(function (belief) { return (('linked_ln' in belief) && (belief.linked_ln.indexOf(ln_id) != -1)); })
				.forEach(function (belief) {
					if ((belief.how_much < 8 && (['Belief is limiting (Reactive)'].indexOf(belief['assessor_option']) != -1)) || ((belief.how_much >= 8) && (['Belief is in balance', 'Belief not understood'].indexOf(belief['assessor_option']) == -1)))
						bs_score++;
					total_bs++;
				});

			$scope.user.assessor.profile_content
				.filter(function (keyword) { return keyword.keyword_id && keyword.keyword_id[5] == 2 })
				.forEach(function (keyword) {
					keyword.mini_descriptions
						.filter(function (mini) { return (('linked_ln' in mini) && (mini.linked_ln.indexOf(ln_id) != -1)); })
						.forEach(function (mini) {
							if (mini.relate == 'relatestrongly')
								bs_score++;
							total_bs++;
						});
				});

			return { bs: bs_score, total: total_bs };
		}

		function calculateSynthesisCode() {
			if ($scope.syns.length) {
				$scope.syns
					.filter(function (item) { return !item.custom_statement; })
					.forEach(function (item) {
						var ln = $scope.user.assessor.profile_content.filter(function (it) { return it.keyword == item.statement; })[0];
						var ln_score = ln['bsl_score'];
						var ln_id = ln['keyword_id'];

						var bs_score = $scope.calculateBsScore(ln_id).bs;

						// console.log(item.sID, item.statement, (ln_score - bs_score), bs_score);

						if (bs_score >= 1)
							item.logic_system = true;
						if ((ln_score - bs_score) >= 2)
							item.logic_user = true;
					});
			}
		}

		$scope.getChilds = function (sid) {
			return $scope.syns.filter(function (item) { return item.sID == sid })[0];
		};

		$scope.totalSumO = 0;
		$scope.totalSumPM = 0;
		$scope.foundSumO = 0;
		$scope.foundSumPM = 0;
        $scope.percentO = 0;
        $scope.neverExhibitedMinVal = 0;

        $scope.neverExhibitedCount = function (neverExhibited) {
            $scope.neverExhibitedCountVal = neverExhibited;
            return $scope.neverExhibitedCountVal;
        }
        $scope.updatePercentOWithMinValue = function (neverExhibitedVal) {
            //$scope.percentO = minVal;
            calculateAutomationScores(neverExhibitedVal);
        }

		function calculateAutomationScores(minCountVal) {
			$scope.user.assessor.automation_slf_aware = 0.5;
			$scope.user.assessor.automation_openness = 0;
			$scope.user.assessor.automation_per_mast = 0;
            $scope.neverExhibitedVal = 0;
			$scope.totalSumO = 0;
			$scope.totalSumOYes = 0;
			$scope.totalSumPM = 0;
			$scope.foundSumO = 0;
			$scope.foundSumOYes = 0;
			$scope.foundSumPM = 0;
            $scope.percentMinimum = 0;

			$scope.user.assessor.profile_content
				.filter(function (key) { return key.keyword_id[5] == 3 && !key.new_keyword; })
				.forEach(function (key) {
					if ($scope.calculateBsScore(key.keyword_id)['bs'] > 0) {
						//O - BS>0
						$scope.totalSumO += key.mini_descriptions.length;
						$scope.foundSumO += key.mini_descriptions.filter(function (mini) { return mini.relate == 'donotrelate' && !mini.mini_by_assessor; }).length; console.log(key['do_ask_comment'])
						if (key['do_ask_comment'] == 'Yes') {
							$scope.totalSumOYes += key.mini_descriptions.length;
							$scope.foundSumOYes += key.mini_descriptions.filter(function (mini) { return mini.relate == 'donotrelate' && !mini.mini_by_assessor; }).length;
						}
					}
					//PM - BS>=0
					$scope.totalSumPM += key.mini_descriptions.length;
					$scope.foundSumPM += key.mini_descriptions.filter(function (mini) { return mini.relate == 'donotexhibitanymore' && !mini.mini_by_assessor; }).length;
				})

			//personal mastery
			if ((($scope.foundSumPM / ($scope.totalSumPM || 1)) * 100) >= 8) $scope.user.assessor.automation_per_mast += 0.5;
			if ((($scope.foundSumPM / ($scope.totalSumPM || 1)) * 100) >= 21) $scope.user.assessor.automation_per_mast += 0.5;
			if ((($scope.calculateTotalBsScore()['system'] + $scope.calculateTotalBsScore()['both']) / ($scope.calculateTotalBsScore()['both'] + $scope.calculateTotalBsScore()['system'] + $scope.calculateTotalBsScore()['user'] + $scope.calculateTotalBsScore()['none'])) * 100 <= 35)
				$scope.user.assessor.automation_per_mast += 0.5;
			if ((($scope.calculateTotalBsScore()['system'] + $scope.calculateTotalBsScore()['both']) / ($scope.calculateTotalBsScore()['both'] + $scope.calculateTotalBsScore()['system'] + $scope.calculateTotalBsScore()['user'] + $scope.calculateTotalBsScore()['none'])) * 100 == 0)
				$scope.user.assessor.automation_per_mast += 0.5;
			// if (($scope.user.assessor.profile_content.filter(function (key) { return key.keyword_id[5] == 3 && $scope.calculateBsScore(key.keyword_id)['bs'] == 0; }).length / $scope.user.assessor.profile_content.filter(function (key) { return key.keyword_id[5] == 3; }).length) * 100 >= 35)
			// 	$scope.user.assessor.automation_per_mast += 0.5;
			// if (($scope.user.assessor.profile_content.filter(function (key) { return key.keyword_id[5] == 3 && $scope.calculateBsScore(key.keyword_id)['bs'] == 0; }).length / $scope.user.assessor.profile_content.filter(function (key) { return key.keyword_id[5] == 3; }).length) * 100 >= 65)
			// 	$scope.user.assessor.automation_per_mast += 0.5;

			//openness

			//$scope.getMinimumPercent = function () {
			  //  $scope.percentMinimum = Math.min($scope.neverExhibitedCountVal,(($scope.foundSumO / ($scope.totalSumO || 1)) * 100))
              //  return $scope.percentMinimum;
		    //};
            $scope.percentO = ($scope.foundSumO / ($scope.totalSumO || 1)) * 100;
		    if(minCountVal !== undefined ){
                if($scope.percentO > minCountVal){
                    $scope.percentO = minCountVal;
                }
            }

            //$scope.percentMinimum = Math.min($scope.neverExhibitedCountVal, percentO);

			if ($scope.percentO < 80) $scope.user.assessor.automation_openness += 0.5;
			if ($scope.percentO < 60) $scope.user.assessor.automation_openness += 0.5;
			if ($scope.percentO < 50) $scope.user.assessor.automation_openness += 0.5;
			if ($scope.percentO < 40) $scope.user.assessor.automation_openness += 0.5;
			if ($scope.percentO < 30) $scope.user.assessor.automation_openness += 0.5;
			if ($scope.user.assessor.automation_per_mast >= 2) $scope.user.assessor.automation_openness += 0.5;
			if (($scope.foundSumOYes / ($scope.totalSumOYes || 1)) * 100 < 50) $scope.user.assessor.automation_openness -= 0.5;
			$scope.user.assessor.automation_openness = Math.min($scope.user.assessor.automation_openness, 1.5);

			//self aware
			if ($scope.percentO <= 60) $scope.user.assessor.automation_slf_aware += 0.5;
			if (($scope.foundSumOYes / ($scope.totalSumOYes || 1)) * 100 >= 50) $scope.user.assessor.automation_slf_aware += 0.5;
			if (($scope.calculateTotalBsScore()['system'] / ($scope.calculateTotalBsScore()['both'] + $scope.calculateTotalBsScore()['system'] + $scope.calculateTotalBsScore()['user'] + $scope.calculateTotalBsScore()['none'])) * 100 <= 40)
				$scope.user.assessor.automation_slf_aware += 0.5;
			if ($scope.user.assessor.automation_per_mast >= 1.5) $scope.user.assessor.automation_slf_aware += 0.5;
			if ($scope.user.assessor.automation_per_mast >= 2.5) $scope.user.assessor.automation_slf_aware += 0.5;

			// console.log($scope.totalSumO, $scope.totalSumPM, $scope.foundSumO, $scope.foundSumPM);
		}

		// main tab 2
		$scope.updateRoundFeedback = function () {
			$scope.success = userFactory.updateSpecific($stateParams.id, { 'rounds_feedback': $scope.user.rounds_feedback });
		};
		// rq
		$scope.updateRQnotes = function () {
			$scope.success = userFactory.updateSpecific($stateParams.id, { 'question.RQ_notes': $scope.user.question.RQ_notes });
		};
		// review profile -> beliefs
		$scope.updateAssessorBeliefs = function () {
			$scope.success = userFactory.updateSpecific($stateParams.id, { 'profile.beliefs': $scope.user.profile.beliefs });
		};

		//template -> sections
		$scope.pushNewMiniDesc = function (pObj) {
			if (!pObj.mini_descriptions || pObj.mini_descriptions.length == 0)
				pObj.mini_descriptions = [];

			if (pObj.mini_descriptions && pObj.mini_descriptions.length > 0)
				pObj.mini_descriptions.sort(function (a, b) {
					if (a.mini_description_id > b.mini_description_id)
						return 1;
					else
						return -1;
				});
			if (pObj.mini_descriptions && pObj.mini_descriptions.length > 0) {
				var tempMax = parseInt(pObj.mini_descriptions[pObj.mini_descriptions.length - 1].mini_description_id.slice(10));
				tempMax = tempMax > 9 ? tempMax + 1 : '0' + (tempMax + 1);
			}
			else {
				var tempMax = '01';
			}
			$scope.md.mini_description_id = pObj.keyword_id + 'M' + tempMax;
			$scope.md.mini_by_assessor = true;
			$scope.md.relate = 'relatestrongly';

			pObj.mini_descriptions.push($scope.md);
			$scope.md = {
				mini_description: '',
				mini_description_id: 'P00S00K00M00',
				relate: 'none',
				paei_tag: { ptag: false, atag: false, etag: false, itag: false },
				assessor_report_mini_check: false,
				mini_by_assessor: true,
				assessor_mini_checkbox: true
			};
		};

		// $scope.removeMiniDesc = function (pObj, i) {
		// 	// pObj.mini_descriptions.splice(i, 1);
		// 	pObj.mini_descriptions[i]['assessor_mini_checkbox'] = false;
		// };

		$scope.keyHasStronglyRelate = function (pObj) {
			// console.log(pObj)
			for (var k = 0; k < pObj.mini_descriptions.length; k++)
				if (pObj.mini_descriptions[k].relate == 'relatestrongly')
					return true;

			return false;
		};

		$scope.firstUserStronglyRelate = function (pObj) {
			for (var k = 0; k < pObj.mini_descriptions.length; k++)
				if (pObj.mini_descriptions[k].relate == 'relatestrongly' && pObj.mini_descriptions[k]['assessor_mini_checkbox'])
					return k;

			return -1;
		};

		$scope.parseMiniIdsToString = function (arr) {
			// console.log('->', arr);
			// arr.forEach(function (key_id, indx) {
			// 	// console.log('-->', key_id);
			var tmp = $scope.user.profile.profile_content
				.filter(function (key) { return arr.indexOf(key.keyword_id) != -1; })
				.map(function (key) { return key.keyword; })
				.join('; ');
			// 	// console.log(key_id, tmp)
			// 	arr[indx] = tmp && tmp.length ? tmp[0]['keyword'] : [];
			// });
			return 'Linked LN(s): ' + tmp;
		};

		$scope.addRowSpecificCompetency = function () {
			$scope.user.assessor.specific_competency.push({
				competency: '', score: '', description: ''
			});
		};

		$scope.removeRowSpecificCompetency = function (i) {
			if (confirm('Sure want to remove ?'))
				$scope.user.assessor.specific_competency.splice(i, 1);
		};

		$scope.toShowEmptyKeyword = function (kid) {
			var myKey = $scope.user.assessor.profile_content.filter(function (key) { return key.keyword_id == kid; });

			if (!myKey.length || myKey[0].mini_descriptions.filter(function (mini) { return mini.assessor_report_mini_check; }).length == 0)
				return false;

			return true;
		};

		$scope.giveMyRelateString = function (relate) {
			switch (relate) {
				case 'relatestrongly': return 'Relate Strongly'; break;
				case 'relatepartially': return 'Relate Partially'; break;
				case 'donotexhibitanymore': return 'Improved Over Time'; break;
				case 'donotrelate': return 'Never Exhibited'; break;
				default: return 'Nothing Selected!';
			};
		};

		$scope.addSection = function (section_in) {
			eval("$scope.user.assessor.addOnSectionsPDF." + section_in + ".push({ title: '', desc: '' });");
		};

		$scope.removeSection = function (section_in, i) {
			eval("$scope.user.assessor.addOnSectionsPDF." + section_in + ".splice(i, 1);");
		};

		$scope.globalI = -1;
		$scope.dropCallback = function (indx, item, external) {
			console.log(indx, item, external);
			$scope.globalI = indx;
			var myI = external.indexOf(item);
			external.splice(indx, 0, external.splice(myI, 1)[0]);

		};

		$scope.upDownKeyword = function (profile_data, indx, how_much, pnum) {
			const arrToAdd = [];

			//FINDING KEYWORD IDs TO SORT
			const fArr = profile_data
				.filter(function (key) { return key['keyword_id'][5] == pnum && !!key['assessor_checkbox']; })
				.map(function (key) { return key['keyword_id']; });

			// REMOVING AND PUSHING THE FOUND KEYWORDs AT END
			for (var k = 0; k < profile_data.length; k++) {
				if (fArr.indexOf(profile_data[k]['keyword_id']) != -1) {
					arrToAdd.push(profile_data.splice(k, 1)[0]);
					k--;
				}
			}

			//ACTUAL INDEX UP
			arrToAdd.splice(indx + how_much, 0, arrToAdd.splice(indx, 1)[0]);

			arrToAdd.forEach(function (key) { profile_data.push(key) });
		};
	}])

	.controller('openReportController', ['$scope', '$state', '$stateParams', '$timeout', 'userFactory', function ($scope, $state, $stateParams, $timeout, userFactory) {
		$scope.loading = true;

		$scope.user = userFactory.getAssessorReport({ id: $stateParams.id });

		var ot = $scope.$watch('user', function (n, o) {
			if (n != o) {
				$scope.loading = false;
				ot();
			}
		}, true);   //true for deep comparison

		$scope.checkToShow = function (kID) {
			if (!kID)
				return true;

			for (var k = 0; k < $scope.user.profile.profile_content.length; k++) {
				if (kID == $scope.user.profile.profile_content[k].keyword_id) {
					for (var o = 0; o < $scope.user.profile.profile_content[k].mini_descriptions.length; o++) {
						if ($scope.user.profile.profile_content[k].mini_descriptions[o].relate == 'relatestrongly' || $scope.user.profile.profile_content[k].mini_descriptions[o].relate == 'relatepartially')
							return true;
					}
					return false;
				}
			}

			return false;
		};

		$scope.firstMD = function (index1) {
			for (var o = 0; o < $scope.user.assessor.profile_content[index1].mini_descriptions.length; o++) {
				if ($scope.user.assessor.profile_content[index1].mini_descriptions[o].assessor_relate != '')
					return o;
			}
		};
	}])

	.controller('facController', ['$scope', '$state', 'userFactory', 'keywordFactory', 'notiFactory', function ($scope, $state, userFactory, keywordFactory, notiFactory) {
		$scope.loading = true;
		$scope.tab_num = 1;

		$scope.$watch('tab_num', function (n, o) {
			if (n != o) {
				if (n == 2 && !$scope.userList) {   // Tab 2
					$scope.userList = userFactory.getFacUsers($scope.usersDetails);
				}
				else if (n == 3) {    // Tab 3
					$scope.noti = notiFactory.getFacNoti($scope.noti);
				}
			}
		}, true);   //true for deep comparison

		//  Tab 1
		$scope.analysis_content = {};
		$scope.analysis_content = userFactory.getFacAnalysis($scope.analysis_content);

		$scope.label_profile_num = ["None", "Profile 1", "Profile 2", "Profile 3", "Profile 4", "Profile 5", "Profile 6", "Profile 7", "Profile 8", "Profile 9"];
		$scope.data_profile_num = [];

		$scope.temp_reg = [];
		$scope.data_reg = [];
		$scope.data_reg_final = [];
		$scope.total_months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		$scope.label_reg = [];
		$scope.data_reg.fill(0);

		$scope.$watch('analysis_content', function (n, o) {
			if (n != o) {
				$scope.loading = false;

				n.variant_profile_num.forEach(function (v, i) {
					$scope.data_profile_num[v._id] = v.total;
				});

				for (var j = 0; j < n.months.length; j++) {
					$scope.temp_reg.push(parseInt(($scope.total_months.indexOf((((new Date($scope.analysis_content.months[j])).toDateString()).split(" "))[1]) + 1) + '' + (((new Date($scope.analysis_content.months[j])).toDateString()).split(" "))[3]));
				}

				//$scope.temp_reg.sort(function(a, b){return a-b;});	//	sorting - asc	//found-bug - due to length of numbers

				for (var i = 0; i < $scope.temp_reg.length; i++) {	//	grouping
					if (!$scope.data_reg[$scope.data_reg.length - 1] || $scope.data_reg[$scope.data_reg.length - 1].value != $scope.temp_reg[i])
						$scope.data_reg.push({ value: $scope.temp_reg[i], times: 1 })
					else
						$scope.data_reg[$scope.data_reg.length - 1].times++;
				}

				for (var q = 0; q < $scope.data_reg.length; q++) {
					$scope.data_reg_final[q] = $scope.data_reg[q].times;
					if ($scope.data_reg[q].value.toString().length == 5)
						$scope.label_reg[q] = $scope.total_months[($scope.data_reg[q].value.toString())[0] - 1] + '\'' + ($scope.data_reg[q].value.toString()).slice(-2);
					else
						$scope.label_reg[q] = $scope.total_months[$scope.data_reg[q].value.toString().slice(0, 2) - 1] + '\'' + ($scope.data_reg[q].value.toString()).slice(-2);
				}
			}
		}, true);

		$scope.labels = ["January", "February", "March", "April", "May", "June", "July", "August", "Septempber", "October", "November", "December"];
		$scope.series = ['Series A', 'Series B'];
		$scope.data = [
			[65, 59, 80, 81, 56, 55, 40],
			[28, 48, 40, 19, 86, 27, 90]
		];
		$scope.data2 = [300, 500, 100, 600, 10, 200, 1000, 500, 100, 600, 10, 200, 1000];

		//  Tab 2
		$scope.userList = '';
		$scope.sortKey = '';
		$scope.reverse = false;

		$scope.grouping = function (name) {
			$scope.search = name;
		};

		$scope.sort = function (keyname) {
			$scope.sortKey = keyname;   //set the sortKey to the param passed
			$scope.reverse = !$scope.reverse; //if true make it false and vice versa
		};

		$scope.switchToAdmin = function () {
			$scope.switchingDone = true;
			$scope.userList = userFactory.getUsers($scope.usersDetails, 0);
		};

		// Tab 3
		$scope.noti = '';
		$scope.dup = '';

		$scope.removeDuplicatesForFac = function () {
			$scope.dup = notiFactory.removeDupNotiForFac();
			var lis = $scope.$watch('dup', function (n, o) {
				if (n != o) {
					if (n.success)
						$scope.noti = notiFactory.getFacNoti($scope.noti);
					lis();
				}
			}, true);   //true for deep comparison
		};

		$scope.notiRead = function (data) {
			notiFactory.updateNoti(data);
		};
	}])

	.controller('sadbmsController', ['$scope', '$state', 'userFactory', 'keywordFactory', 'notiFactory', 'questionnaireFactory', 'recommendFactory', 'growthRecommendFactory', 'beliefFactory', 'facilitatorFactory', 'openQuestionnaireFactory', 'openMCQFactory2', 'teamFactory', 'competencyFactory', 'growthRecommendAssessorFactory', 'roleFitmentFactory', 'synthesisFactory', 'rankFactory', function ($scope, $state, userFactory, keywordFactory, notiFactory, questionnaireFactory, recommendFactory, growthRecommendFactory, beliefFactory, facilitatorFactory, openQuestionnaireFactory, openMCQFactory2, teamFactory, competencyFactory, growthRecommendAssessorFactory, roleFitmentFactory, synthesisFactory, rankFactory) {
		$scope.loading = true;
		//$scope.usersDetails = {};
		$scope.tab_num = 1;

		$scope.$watch('tab_num', function (n, o) {
			if (n != o) {
				$('html,body').scrollTop(0);		//scroll to top

				if (n == 2 && !$scope.userList) {   // Tab 2
					$scope.totalUserListPages = Math.ceil($scope.analysis_content.u_len / 100);
					$scope.allUserListPages = [];
					var ij = 1;
					while (ij <= $scope.totalUserListPages) {
						$scope.allUserListPages.push(ij);
						ij++;
					}
					$scope.userList = userFactory.getUsers($scope.usersDetails, $scope.userListPage);
				}
				//else if(n==3 && !$scope.master){    // Tab 3
				//$scope.master = keywordFactory.getAllProfiles($scope.master);
				//}
				else if (n == 5) {    // Tab 5
					$scope.noti = notiFactory.getNoti($scope.noti);
				}
				else if (n == 6) {
					questionnaireFactory.query(function (success) {
						$scope.questions = success;
					}, function (err) { });
				}
				else if (n == 9) {
					$scope.facList = facilitatorFactory.getFacs();
				}
				else if (n == 12) {
					openQuestionnaireFactory.query(function (success) {
						$scope.questions2 = success;
					}, function (err) { });
				}
				else if (n == 15) {
					openMCQFactory2.query(function (success) {
						$scope.mcqs = success;
					}, function (err) { });
				}
				else if (n == 16) {
					$scope.teamList = teamFactory.getTeams();
				}
				else if (n == 17) {
					$scope.managerList = userFactory.getManagers();

					var qt = $scope.$watch('managerList', function (n, o) {
						if (n != o) {
							$scope.teamList = teamFactory.getTeams();
							qt();
						}
					}, true);
				}
				else if (n == 18) {
					if (!$scope.compList)
						$scope.compList = competencyFactory.getComps();
				}
				else if (n == 26) {
					if (!$scope.dragArray)
						$scope.dragArray = rankFactory.getData();
				}
			}
		}, true);   //true for deep comparison

		//  Tab 1
		$scope.analysis_content = {};
		$scope.analysis_content = userFactory.getAnalysis($scope.analysis_content);

		$scope.label_profile_num = ["None", "Profile 1", "Profile 2", "Profile 3", "Profile 4", "Profile 5", "Profile 6", "Profile 7", "Profile 8", "Profile 9"];
		$scope.data_profile_num = [];

		$scope.temp_reg = [];
		$scope.data_reg = [];
		$scope.data_reg_final = [];
		$scope.total_months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		$scope.label_reg = [];
		$scope.data_reg.fill(0);

		$scope.$watch('analysis_content', function (n, o) {
			if (n != o) {
				$scope.loading = false;

				n.variant_profile_num.forEach(function (v, i) {
					$scope.data_profile_num[v._id] = v.total;
				});

				for (var j = 0; j < n.months.length; j++) {
					$scope.temp_reg.push(parseInt(($scope.total_months.indexOf((((new Date($scope.analysis_content.months[j])).toDateString()).split(" "))[1]) + 1) + '' + (((new Date($scope.analysis_content.months[j])).toDateString()).split(" "))[3]));
				}

				//$scope.temp_reg.sort(function(a, b){return a-b;});	//	sorting - asc	//found-bug - due to length of numbers

				for (var i = 0; i < $scope.temp_reg.length; i++) {	//	grouping
					if (!$scope.data_reg[$scope.data_reg.length - 1] || $scope.data_reg[$scope.data_reg.length - 1].value != $scope.temp_reg[i])
						$scope.data_reg.push({ value: $scope.temp_reg[i], times: 1 })
					else
						$scope.data_reg[$scope.data_reg.length - 1].times++;
				}

				for (var q = 0; q < $scope.data_reg.length; q++) {
					$scope.data_reg_final[q] = $scope.data_reg[q].times;
					if ($scope.data_reg[q].value.toString().length == 5)
						$scope.label_reg[q] = $scope.total_months[($scope.data_reg[q].value.toString())[0] - 1] + '\'' + ($scope.data_reg[q].value.toString()).slice(-2);
					else
						$scope.label_reg[q] = $scope.total_months[$scope.data_reg[q].value.toString().slice(0, 2) - 1] + '\'' + ($scope.data_reg[q].value.toString()).slice(-2);
				}
			}
		}, true);

		//  Tab 2
		$scope.userList = '';
		$scope.sortKey = '';
		$scope.reverse = false;
		$scope.userListPage = 1;

		$scope.setNextPage = function (pg) {
			$scope.userListPage = pg;
			$scope.userList = userFactory.getUsers($scope.usersDetails, pg);
		};

		$scope.sort = function (keyname) {
			$scope.sortKey = keyname;   //set the sortKey to the param passed
			$scope.reverse = !$scope.reverse; //if true make it false and vice versa
		};

		$scope.save_admfac = function (id, now) {
			userFactory.updateSpecific(id, now);
		};

		//  Tab 3    
		$scope.master = '';
		var compArray = [];

		$scope.getThatProfile = function (tno) {
			$scope.master = keywordFactory.getProfile(tno);

			if (!$scope.compList) {
				competencyFactory.getComps()
					.$promise
					.then(function (resp) {
						$scope.compList = resp.slice();
						compArray = $scope.compList.map(function (item) { return item.competency_id });
					});
			}
		};

		$scope.addMoreMini = function (pi) {
			var obj = {
				mini_description_id: 'P__S__K__M__',
				mini_description: ''
			};
			$scope.master[pi].mini_descriptions.push(obj);
		};

		$scope.removeMD = function (pi, mi) {
			$scope.master[pi].mini_descriptions.splice(mi, 1);
		};

		$scope.updateThatProfile = function (pno, sno, k_id, i, from) {
			keywordFactory.updateProfile(pno, sno, k_id.slice(7), from == 1 ? $scope.master[i] : i)
				.$promise
				.then(function (res, err) {
					if (!err)
						alert('Done !');
				});
		};

		$scope.getProfileCompetencyMapping = function (cID) {
			// console.log(compArray);
			if (['NA', 'PM', 'P', 'A', 'E', 'I'].indexOf(cID) != -1)
				return cID;
			var indx = compArray.indexOf(cID.toUpperCase());
			return (indx != -1) && ('competency' in $scope.compList[indx]) && $scope.compList[indx]['competency'] ? $scope.compList[indx]['competency'] : '';
		};

		// Tab 4
		$scope.profile_to_add = 0;
		$scope.structure_mini = {
			mini_description_id: '',
			mini_description: '',
			tag: {
				personal: false,
				professional: false,
				company: false,
				competency: false
			}
		};
		$scope.structure_statement = {
			desc: ''
		};
		$scope.structure = {
			keyword: '',
			keyword_id: '',
			section_id: '',
			mini_descriptions: [],
			linked_keyword: '',
			dummy_keyword: '',
			belongs_to: {
				personal: false,
				professional: false
			},
			balancing_description: []
		};
		$scope.add_array = false;

		$scope.push_mini = function () {
			if (!$scope.structure_mini.mini_description || !$scope.structure_mini.mini_description_id) {
				return;
			}
			$scope.structure.mini_descriptions.push($scope.structure_mini);
			$scope.structure_mini = {
				mini_description_id: '',
				mini_description: '',
				tag: {
					personal: false,
					professional: false,
					company: false,
					competency: false
				}
			};
		};

		$scope.push_statement = function () {
			if (!$scope.structure_statement.desc.length)
				return;
			$scope.structure.balancing_description.push($scope.structure_statement);
			$scope.structure_statement = {
				desc: ''
			};
		};

		$scope.push_keyword = function () {
			if (!$scope.structure.mini_descriptions.length)
				return;
			$scope.add_array = $scope.structure;
			$scope.structure = {
				keyword: '',
				keyword_id: '',
				section_id: '',
				mini_descriptions: [],
				linked_keyword: '',
				belongs_to: {
					personal: false,
					professional: false
				},
				balancing_description: []
			};
		};

		$scope.undoData = function () {
			$scope.structure = $scope.add_array;
			$scope.add_array = false;
		};

		$scope.submitData = function () {
			keywordFactory.saveNew($scope.add_array);
			$scope.add_array = false;
		};

		// Tab 5
		$scope.noti = '';
		$scope.dup = '';

		$scope.removeDuplicates = function () {
			$scope.dup = notiFactory.removeDupNoti();
			var lis = $scope.$watch('dup', function (n, o) {
				if (n != o) {
					if (n.success)
						$scope.noti = notiFactory.getNoti($scope.noti);
					lis();
				}
			}, true);   //true for deep comparison
		};

		$scope.notiRead = function (data) {
			notiFactory.updateNoti(data);
		};

		// Tab 6
		$scope.questions = {};

		$scope.updateQues = function (id, q) {
			questionnaireFactory.update({ id: id }, q);
		};

		// Tab 7
		$scope.keywordSet = [];

		function getKeywordSet(tno) {
			if ($scope.keywordSet.length == 0)
				keywordFactory.getLessProfile(tno)
					.$promise
					.then(function (keysData) {
						$scope.keywordSet = keysData.filter(function (item) { return item.keyword_id[5] == '3'; });
					});
		}

		$scope.masterRecommend = '';

		$scope.getThatRecommend = function (tno) {
			recommendFactory.getProfile(tno)
				.$promise
				.then(function (data) {
					$scope.masterRecommend = data;
				})
				.then(function () {
					getKeywordSet(tno);
				});
		};

		$scope.updateThatRecommend = function (pno, sno, i) {
			recommendFactory.updateProfile(pno, sno, $scope.masterRecommend[i])
				.$promise
				.then(function (res, err) {
					if (!err)
						alert("Done !");
				});
		};

		$scope.removeMiniFromSetRecommend = function (mr, i) {
			mr.linked_keywords.splice(i, 1);
		};

		$scope.addMiniToSetRecommend = function (mr) {
			mr.linked_keywords.push({ mini_id: ""});
		};

		$scope.addRecommendForLearningNeed = function (recommendation) {
			recommendation.statements.push({statement: ""});
		};

		$scope.removeRecommendForLearningNeed = function (recommendation, i) {
			recommendation.statements.splice(i, 1);
		};

		// Tab 8
		$scope.structure_stat = {
			sID: '',
			brief: '',
			statement: ''
		};

		$scope.push_rec = function () {
			if (!$scope.structure_stat.statement.length)
				return;

			recommendFactory.saveNew($scope.structure_stat);

			$scope.structure_stat = {
				sID: '',
				brief: '',
				statement: ''
			};
		};

		// Tab 9
		$scope.facList = '';

		$scope.facObj = {
			facID: '',
			facName: ''
		};

		$scope.facUpdation = function (body) {
			facilitatorFactory.updateFac(body._id, body);
		};

		$scope.facDeletion = function (i, id) {
			$scope.facList.splice(i, 1);
			facilitatorFactory.removeFac(id);
		};

		$scope.addFacToList = function () {
			$scope.facList.push($scope.facObj);

			facilitatorFactory.saveNew($scope.facObj);

			$scope.facObj = {
				facID: '',
				facName: ''
			};
		};

		// Tab 10
		$scope.growthRecommend = '';

		$scope.getGrowthRecommend = function (tno) {
			$scope.growthRecommend = growthRecommendFactory.getProfile(tno);
		};

		$scope.updateGrowthRecommend = function (pno, sno1, sno2, i) {
			var sno = (parseInt(sno1) * 10) + parseInt(sno2);
			growthRecommendFactory.updateProfile(pno, sno, $scope.growthRecommend[i]);
		};

		// Tab 11
		$scope.structure_growth = {
			sID: '',
			statement: ''
		};

		$scope.push_growth = function () {
			if (!$scope.structure_growth.statement.length)
				return;

			growthRecommendFactory.saveNew($scope.structure_growth);

			$scope.structure_growth = {
				sID: '',
				statement: ''
			};
		};

		// Tab 12
		$scope.questions2 = {};

		$scope.updateQues2 = function (id, q) {
			openQuestionnaireFactory.update({ id: id }, q);
		};

		// Tab 13
		$scope.beliefs = '';

		$scope.getBeliefs = function (tno) {
			$scope.beliefs = beliefFactory.getProfile(tno);
		};

		$scope.updateBeliefs = function (pno, sno, i) {
			beliefFactory.updateProfile(pno, sno, $scope.beliefs[i])
				.$promise
				.then(function (res, err) {
					if (!err)
						alert("Done !");
				});
		};

		// Tab 14
		$scope.structure_beliefs = {
			sID: '',
			statement: ''
		};

		$scope.push_beliefs = function () {
			if (!$scope.structure_beliefs.statement.length)
				return;

			beliefFactory.saveNew($scope.structure_beliefs);

			$scope.structure_beliefs = {
				sID: '',
				statement: ''
			};
		};

		// Tab 15
		$scope.updateMCQ = function (id, q) {
			openMCQFactory.update({ id: id }, q);
		};

		// Tab 16
		$scope.teamList = '';

		$scope.teamObj = {
			teamID: '',
			teamName: '',
			members: new Array
		};

		$scope.memberObj = {
			emailID: '',
			name: ''
		};

		$scope.teamUpdation = function (body) {
			teamFactory.updateTeam(body._id, body);
		};

		$scope.teamDeletion = function (i, id) {
			$scope.teamList.splice(i, 1);
			teamFactory.removeTeam(id);
		};

		$scope.addTeamToList = function () {
			$scope.teamList.push($scope.teamObj);

			$scope.changeT = teamFactory.saveNew($scope.teamObj);

			var cq = $scope.$watch('changeT', function (n, o) {
				if (n != o) {
					$scope.teamList = teamFactory.getTeams();

					$scope.teamObj = {
						teamID: '',
						teamName: '',
						members: new Array
					};

					cq();
				}
			}, true);
		};

		$scope.addMemberToTeam = function (i) {
			$scope.teamList[i].members.push($scope.memberObj);

			$scope.memberObj = {
				emailID: '',
				name: ''
			};
		};

		$scope.memberDeletion = function (pi, i) {
			$scope.teamList[pi].members.splice(i, 1);
		};

		$scope.verifyAllMembersOfTeam = function (index) {
			userFactory.membersVerification($scope.teamList[index].members)
				.$promise
				.then(function (res) {
					$scope.teamList[index].verified = true;
					$scope.teamList[index].members = res.members;
				});
		};

		// Tab 17
		$scope.managerList = '';

		$scope.selectedTeams = new Array;

		$scope.addSelectedToTeams = function (tObj) {
			for (var i = 0; i < $scope.selectedTeams.length; i++) {
				if ($scope.selectedTeams[i].teamID == tObj.teamID) {
					$scope.selectedTeams.splice(i, 1);
					return;
				}
			}
			$scope.selectedTeams.push(tObj);
		};

		$scope.checkSelectedTeams = function (tID) {
			for (var i = 0; i < $scope.selectedTeams.length; i++) {
				if ($scope.selectedTeams[i].teamID == tID)
					return true;
			}
			return false;
		};

		$scope.addSelectedTeamsToManager = function (index, tObj) {
			var arrT = $scope.managerList[index].teams;
			if (!arrT)
				$scope.managerList[index].teams.push(tObj);
			for (var i = 0; i < arrT.length; i++) {
				if (arrT[i].teamID == tObj.teamID) {
					arrT.splice(i, 1);

					userFactory.updateSpecific($scope.managerList[index]._id, { 'teams': $scope.managerList[index].teams });
					return;
				}
			}
			$scope.managerList[index].teams.push(tObj);

			userFactory.updateSpecific($scope.managerList[index]._id, { 'teams': $scope.managerList[index].teams });
		};

		$scope.checkSelectedTeamsInManager = function (index, tID) {
			var arrT = $scope.managerList[index].teams;
			if (!arrT)
				return false;
			for (var i = 0; i < arrT.length; i++) {
				if (arrT[i].teamID == tID)
					return true;
			}
			return false;
		};

		$scope.getManagerTeams = function (index) {
			var str = '(ALL TEAMS)<br>';
			var arrT = $scope.managerList[index].teams;
			if (!arrT)
				return false;
			for (var i = 0; i < arrT.length; i++) {
				str += arrT[i].teamID + ' - ' + arrT[i].teamName + '<br>';
			}
			return str;
		};

		// Tab 18
		$scope.updateThatCompetency = function (index) {
			competencyFactory.updateComps($scope.compList[index]);
		};

		// Tab 19
		$scope.compObj = {
			competency_id: '',
			competency: '',
			description: '',
			domain: ''
		};

		$scope.submitCompetency = function () {
			competencyFactory.saveNew($scope.compObj);

			$scope.compObj = {
				competency_id: '',
				competency: '',
				description: '',
				domain: ''
			};
		};

		// Tab 20
		$scope.growthRecommendAssessor = '';

		$scope.getGrowthRecommendAssessor = function (tno) {
			growthRecommendAssessorFactory.getProfile(tno)
				.$promise
				.then(function (data) {
					$scope.growthRecommendAssessor = data;
				})
				.then(function () {
					getKeywordSet(tno);
				});
		};

		$scope.updateGrowthRecommendAssessor = function (pno, sno1, sno2, i) {
			var sno = (parseInt(sno1) * 10) + parseInt(sno2);
			growthRecommendAssessorFactory.updateProfile($scope.growthRecommendAssessor[i])
				.$promise
				.then(function (res) {
					alert("Done !");
				});
		};

		// $scope.getMiniNameFromId = function (mini_id) {
		// 	for (var i = 0; i < $scope.keywordSet.length; i++) {
		// 		for (var j = 0; j < $scope.keywordSet[i].mini_descriptions.length; j++) {
		// 			if ($scope.keywordSet[i].mini_descriptions[j].mini_description_id == mini_id)
		// 				return $scope.keywordSet[i].mini_descriptions[j].mini_description;
		// 		}
		// 	}
		// };

		$scope.removeMiniFromSet = function (arr, i) {
			arr.splice(i, 1);
		};

		$scope.addMiniToSet = function (arr) {
			arr.push('');
		};

		// Tab 21
		$scope.structure_growth_assessor = {
			sID: '',
			brief: '',
			statement: ''
		};

		$scope.push_growth_assessor = function () {
			if (!$scope.structure_growth_assessor.statement.length)
				return;

			growthRecommendAssessorFactory.saveNew($scope.structure_growth_assessor);

			$scope.structure_growth_assessor = {
				sID: '',
				brief: '',
				statement: ''
			};
		};

		// Tab 22
		$scope.roleFitments = {};

		$scope.getRoleFitments = function (prof_num) {
			roleFitmentFactory.getData(prof_num)
				.$promise
				.then(function (data) {
					$scope.roleFitments = data;
				});
		};

		$scope.addRoleFitment = function (which) {
			if (!$scope.prof_num) alert('Kindly load some profile first !');

			which == 'S' ? $scope.roleFitments.suitable_work.push({ sID: 'S__', statement: '' }) : $scope.roleFitments.difficult_work.push({ sID: 'S__', statement: '' });

		};

		$scope.updateRoleFitment = function (prof_num, which, obj) {
			if (confirm("Are you sure want to update " + (obj.sID) + " ?")) {
				roleFitmentFactory.updateRole(which == 'S' ? 'suitable_work' : 'difficult_work', prof_num, obj)
					.$promise
					.then(function (resp) {
						alert(JSON.stringify(resp));
					});
			}
		};

		// Tab 23
		$scope.internal_tab = 1;

		$scope.filterSec3 = function () {
			return function (item) {
				return item.keyword_id[5] == '3';
			};
		};

		$scope.filterSec2 = function () {
			return function (item) {
				return item.keyword_id[5] == '2';
			};
		};

		$scope.existsOrNot = function (keyIdSet, keyId) {
			if (keyIdSet.indexOf(keyId) != -1)
				return true;
			return false;
		};

		$scope.addKeyToKeySet = function (keyIdSet, keyId) {
			const result = keyIdSet.indexOf(keyId);
			if (result != -1) {
				keyIdSet.splice(result, 1);
				return;
			}
			keyIdSet.push(keyId);
			keyIdSet.sort();
		};

		// Tab 24
		$scope.addMoreReportMini = function (key_id, pi) {
			var obj = {
				mini_description_id: key_id + 'R' + ($scope.master[pi].report_descriptions.length > 0 ? '__' : '01'),
				mini_description: '',
				mini_description_h: ''
			};
			$scope.master[pi].report_descriptions.push(obj);
		};

		$scope.removeReportMD = function (pi, mi) {
			$scope.master[pi].report_descriptions.splice(mi, 1);
		};

		// Tab 25
		$scope.syns = [];

		$scope.fetchProfileSynthesis = function (prof_num) {
			synthesisFactory.getData(prof_num)
				.$promise
				.then(function (data) {
					$scope.syns = data;
					$scope.getThatProfile(prof_num);
				});
		};

		$scope.addSynthesis = function () {
			if (!$scope.profile_num) alert('Kindly load some profile first !');

			var max = $scope.syns.length == 0 ? '01' : (parseInt($scope.syns[$scope.syns.length - 1].sID.slice(4)) + 1 > 9 ? parseInt($scope.syns[$scope.syns.length - 1].sID.slice(4)) + 1 : '0' + (parseInt($scope.syns[$scope.syns.length - 1].sID.slice(4)) + 1));
			$scope.syns.push({ sID: 'P0' + $scope.profile_num + 'N' + max, statement: '', child_nodes: [], root_node: false, sub_statement: '' });
		};

		$scope.addChild = function (obj) {
			obj.child_nodes.push({ child_node: 'P__N__' });
		};

		$scope.removeChild = function (obj, i) {
			if (confirm('Sure to remove ' + obj[i].child_node + ' ?'))
				obj.splice(i, 1);
		};

		$scope.updateSynthesis = function (obj) {
			if (confirm("Are you sure want to update " + (obj.sID) + " ?")) {
				synthesisFactory.updateSynthesis(obj)
					.$promise
					.then(function (resp) {
						alert("Updated");
					}, function (err) {
						alert(JSON.stringify(err));
					});
			}
		};

		$scope.copyThisToSynthesis = function (obj, stat) {
			obj.statement = stat;
			obj.custom_statement = false;
		};

		$scope.getChilds = function (sid) {
			return $scope.syns.filter(function (item) { return item.sID == sid })[0];
		};

		// Tab 26
		$scope.addRemoveProfileFromRank = function (j, profile_num) {
			if ($scope.dragArray[j]['linked_profiles'].indexOf(profile_num) != -1) {
				$scope.dragArray[j]['linked_profiles'].splice($scope.dragArray[j]['linked_profiles'].indexOf(profile_num), 1);
			}
			else {
				$scope.dragArray[j]['linked_profiles'].push(parseInt(profile_num));
				$scope.dragArray[j]['linked_profiles'].sort();
			}
		};

		$scope.addRank = function () {
			var max = parseInt($scope.dragArray[0]['sID'].slice(1)), i = 1;

			while (i < $scope.dragArray.length) {
				var value = parseInt($scope.dragArray[i]['sID'].slice(1));
				if (max < value)
					max = value;

				i++;
			}

			$scope.dragArray.push({ sID: 'K' + (max + 1), keyword: '', linked_profiles: [] });
		};

		$scope.updateRank = function (obj) {
			console.log(obj)
			if (confirm("Are you sure want to update " + obj['sID'] + " ?")) {
				rankFactory.updateRank(obj)
					.$promise
					.then(function (resp) {
						alert('Done !');
					}, function (err) {
						alert(JSON.stringify(err));
					});
			}
		};
	}])

	.controller('feedbackController', ['$scope', '$state', 'userFactory', function ($scope, $state, userFactory) {
		$scope.loading = true;
		$scope.btn_press = false;

		$scope.userFB = {};
		$scope.userFB = userFactory.getFbDetails($scope.userFB);
		$scope.$watch('userFB', function (n, o) {
			if (n != o)
				$scope.loading = false;
		}, true);   //true for deep comparison

		$scope.proceed = function () {
			$scope.btn_press = true;

			if (!$scope.userFB.feedback.q1 || !$scope.userFB.feedback.q2 || !($scope.userFB.feedback.q3.a1 || $scope.userFB.feedback.q3.a2 || $scope.userFB.feedback.q3.a3 || $scope.userFB.feedback.q3.a4 || $scope.userFB.feedback.q3.a5) || !$scope.userFB.feedback.q5 || !$scope.userFB.feedback.q6 || !$scope.userFB.feedback.q7)
				return;

			$scope.userFB.feedback.submitted = true;
			$scope.success = 0;

			$scope.success = userFactory.saveDetails($scope.userFB);
			$scope.$watch('success', function (n, o) {
				if (n != o)
					$state.go('trueself-report', {});
			}, true);   //true for deep comparison
		};
	}])

	.controller('shareReportController', ['$scope', '$state', '$stateParams', 'userFactory', '$timeout', 'additionalDataFactory', function ($scope, $state, $stateParams, userFactory, $timeout, additionalDataFactory) {
		$scope.profile_content = {};
		$scope.work_details = {};
		$scope.loading = true;

		$scope.sub_heading = additionalDataFactory.sub_heading;
		$scope.basic_fear = additionalDataFactory.basic_fear;
		$scope.key_motivation = additionalDataFactory.key_motivation;

		$scope.profile_content = userFactory.getSpecificReport({ id: $stateParams.id });
        $scope.work_details = userFactory.getPersonal($scope.personalDetails);
        $scope.work_detail = $scope.work_details;

        console.log("-=-=-=-=-=-=--=-=-=-=-=-=-=-=-=-=-=-=-Hello=-=-=-=-=");
		//top profile(s) switch

		$scope.profile_selected = -1;

		$scope.chosenProfile = function (i) {
			return i;
		};
		$scope.chooseProfile = function (i) {
			$scope.profile_selected = i;
		};

		// RR %age count
		$scope.total_mini = 0;
		$scope.sectionKeysCount = new Array(3).fill(0);

		function countRRPercentage(profileArray) {
			var k = 0, j = 0;
			$scope.total_mini = 0;
			$scope.sectionKeysCount = new Array(3).fill(0);

			for (k = 0; k < profileArray.length; k++) {
				if (profileArray[k].keyword_id[5] == 3) {
					for (j = 0; j < profileArray[k].mini_descriptions.length; j++) {
						switch (profileArray[k].mini_descriptions[j].relate) {
							case 'donotexhibitanymore':
							case 'relatestrongly':
							case 'relatepartially': $scope.total_mini++;
								break;
						}
						if (profileArray[k].mini_descriptions[j].relate == 'donotexhibitanymore')
							$scope.sectionKeysCount[0]++;
						else if (profileArray[k].mini_descriptions[j].relate == 'relatepartially')
							$scope.sectionKeysCount[1]++;
						else if (profileArray[k].mini_descriptions[j].relate == 'relatestrongly')
							$scope.sectionKeysCount[2]++;
					}
				}
			}
		}

		// for balancing view only - START
		function profileViewsSwitch(profileArray) {
			var k = 0, j = 0;
			$scope.temp_content = [];

			for (k = 0; k < profileArray.length; k++) {

				if (profileArray[k].linked_keyword) {

					for (j = 0; j < profileArray.length; j++) {

						if (profileArray[k].linked_keyword == profileArray[j].keyword_id) {
							$scope.temp_content[k] = profileArray[j];
							break;
						}
					}

				}
				else
					$scope.temp_content[k] = {};

				//console.log("here: "+$scope.temp_content[k]);
			}
		}

		var pc = $scope.$watch('profile_content', function (n, o) {
			if (n != o) {
				$scope.loading = false;
				countRRPercentage($scope.profile_content.profile.profile_content);
				profileViewsSwitch($scope.profile_content.profile.profile_content);
				pc();
			}
		}, true);

		$scope.$watch('profile_selected', function (n, o) {
			if (n != o) {
				if (n != -1) {
					profileViewsSwitch($scope.profile_content.profile.old[$scope.profile_selected].pro);
					countRRPercentage($scope.profile_content.profile.old[$scope.profile_selected].pro);
				}
				else if (n == -1) {
					profileViewsSwitch($scope.profile_content.profile.profile_content);
					countRRPercentage($scope.profile_content.profile.profile_content);
				}
			}
		});
		// for balancing view only - END

		$scope.checkToShow = function (kID) {
			if (!kID || !kID.length) return true;

			const filteredKeys = $scope.profile_content.profile.profile_content.filter(function (item) { return kID.indexOf(item['keyword_id']) != -1; });

			const relates = filteredKeys.map(function (key) {
				return key.mini_descriptions
					.filter(function (mini) { return ['relatestrongly', 'relatepartially'].indexOf(mini['relate']) != -1; })
					.map(function (mini) { return mini['relate']; });
			})

			// console.log(relates)

			for (var j = 0; j < relates.length; j++)
				if (relates[j].indexOf('relatestrongly') != -1 || relates[j].indexOf('relatepartially') != -1)
					return true;

			return false;
		};
	}])

	.controller('openUserController', ['$scope', '$state', 'openQuestionnaireFactory', 'openUserFactory', '$stateParams', function ($scope, $state, openQuestionnaireFactory, openUserFactory, $stateParams) {
		$scope.questions = {};
		$scope.details = {};
		$scope.answers = Array(36).fill(0);
		$scope.next = 0;
		$scope.loading = true;

		$scope.nextStep = function () {
			$scope.next++;
		};

		var qs = $scope.$watch('questions', function (n, o) {
			if (n != o) {
				$scope.loading = false;
				qs();
			}
		}, true);   //true for deep comparison

		$scope.$watch('next', function (n, o) {
			if (n != o) {
				if (n == 1) {
					openQuestionnaireFactory.query(function (success) {
						$scope.questions = success;
					}, function (err) { });
				}
			}
		});

		$scope.saveQues = function () {
			$scope.details.questionnaire = $scope.answers;
			openUserFactory.save($scope.details, function (s) {
				$scope.next = 2;
			}, function (e) { });
		};

		$scope.allDone = function () {
			if ($scope.answers.indexOf(0) >= 0 && $scope.answers.indexOf(0) <= 35)
				return true;
			else
				return false;
		};

		//	FOR OPEN USER LIST
		$scope.userList = '';

		if ($stateParams.page == 2) {
			openUserFactory.query(function (success) {
				$scope.userList = success;
				$scope.loading = false;
			}, function (err) { });
		}

		$scope.sortKey = '';
		$scope.reverse = false;

		$scope.sort = function (keyname) {
			$scope.sortKey = keyname;   //set the sortKey to the param passed
			$scope.reverse = !$scope.reverse; //if true make it false and vice versa
		};

		$scope.specificSum = function (ques, num) {
			var count = 0;
			for (var j = 0; j < 36; j++) {
				if (ques[j] == num)
					count++;
			}
			return count;
		};
	}])

	.controller('openMCQController', ['$scope', '$state', 'openMCQFactory', 'openMCQFactory2', 'openMCQUserFactory', '$stateParams', 'deviceDetector', 'Fullscreen', '$interval', function ($scope, $state, openMCQFactory, openMCQFactory2, openMCQUserFactory, $stateParams, deviceDetector, Fullscreen, $interval) {
		$scope.questions = {};
		$scope.details = {};
		$scope.answers = Array(30).fill(0);
		$scope.next = 0;
		$scope.loading = true;

		$scope.timer = 0;
		$scope.hour = 0;

		var inClose, id;

		//module will start the test timer and is responsible for keeping an eye on user activity
		function startTimer() {
			inClose = $interval(function () {
				$scope.timer++;
				$scope.hour = parseInt($scope.timer / 60);

				if (!Fullscreen.isEnabled() || $scope.hour == 40) {		//if fullscreen exited or time over
					$scope.saveQues();
				}
			}, 1000);
		}

		$scope.details.device_details = deviceDetector;			//fetching browser details

		$scope.nextStep = function () {			//module responsible for switching pages
			$scope.next++;
		};

		//waiting for response of Test Questions
		var qs = $scope.$watch('questions', function (n, o) {
			if (n != o) {
				$scope.loading = false;
				qs();
			}
		}, true);   //true for deep comparison

		var qN = $scope.$watch('next', function (n, o) {
			if (n != o) {
				$('html,body').scrollTop(0);		//scroll to top
				if (n == 1) {
					openMCQUserFactory.save($scope.details, function (s) {			//saving user's information from form
						id = s.id;										//received id of user from response
						openMCQFactory.query(function (success) {			//retrieving Test Questions
							$scope.questions = success;
							startTimer();
						}, function (err) { });
					}, function (e) { });

					Fullscreen.all();						//Fullscreen enabled
					qN();
				}
			}
		});

		//module to save answers of Test Questions
		$scope.saveQues = function () {
			Fullscreen.cancel();
			$scope.details.MCQs = $scope.answers;
			$scope.details.sDate = new Date;
			//		console.log($scope.answers);
			$interval.cancel(inClose);
			openMCQUserFactory.update({ id: id }, $scope.details, function (s) {
				$scope.next = 3;
			}, function (e) { });
		};

		//	FOR OPEN USER LIST
		$scope.userList = '';

		if ($stateParams.page == 2) {
			openMCQUserFactory.query(function (success) {
				$scope.userList = success;

				openMCQFactory2.query(function (success) {
					$scope.questions = success;
					//console.log($scope.questions);
					$scope.loading = false;
				}, function (err) { });

			}, function (err) { });
		}

		$scope.sortKey = '';
		$scope.reverse = false;

		$scope.sort = function (keyname) {
			$scope.sortKey = keyname;   //set the sortKey to the param passed
			$scope.reverse = !$scope.reverse; //if true make it false and vice versa
		};

		$scope.specificSum = function (mc, num) {
			var i = 0, count = 0;

			if (num == 1) {
				i = 15;
				while (i < 30) {

					if (mc.indexOf($scope.questions[i].correct) != -1)
						count++;
					i++;
				}
			}
			else if (num == 2) {
				i = 0;
				while (i < 15) {

					if (mc.indexOf($scope.questions[i].correct) != -1)
						count++;
					i++;
				}
			}
			else if (num == 7) {
				i = 0;
				while (i < 15) {

					if (mc[i] != 0)
						count++;
					i++;
				}
			}
			else if (num == 8) {
				i = 15;
				while (i < 30) {

					if (mc[i] != 0)
						count++;
					i++;
				}
			}

			return count;
		};

		$scope.updateStatus = function (i) {
			openMCQUserFactory.update({ id: $scope.userList[i]._id }, $scope.userList[i], function (s) { }, function (e) { });
		};
	}])

	.controller('managerController', ['$scope', '$state', 'teamFactory', 'userFactory', function ($scope, $state, teamFactory, userFactory) {
		$scope.loading = true;
		$scope.tab_num = 1;
		$scope.showNoti = false;

		userFactory.getManagerTeams()
			.$promise
			.then(function (response) {
				$scope.loading = false;
				$scope.mData = response;

				$scope.combineComp = new Array($scope.mData.teams.length);
			});

		$scope.$watch('tab_num', function (n, o) {
			if (n != o) {
				if (n == 2) {
					$scope.mData = userFactory.getCompByAssessor($scope.mData);

					var quit = $scope.$watch('mData', function (n, o) {
						if (n != o) {
							calculateAssessorComp();

							quit();
						}
					}, true);
				}
			}
		});

		$scope.assignTab = function (i) {
			$scope.tab_num = -i;
		};

		$scope.checkTab = function (i) {
			return -i;
		};

		//team health level
		$scope.combineComp = [];

		function calculateAssessorComp() {
			for (var k = 0; k < $scope.mData.teams.length; k++) {
				$scope.combineComp[k] = new Array(9).fill(0);

				for (var m = 0; m < $scope.mData.teams[k].members.length; m++) {

					if ($scope.mData.teams[k].members[m].comp.length > 0) {
						for (var q = 0; q < $scope.mData.teams[k].members[m].comp.length; q++) {
							$scope.combineComp[k][q] += $scope.mData.teams[k].members[m].comp[q][2];
						}
						$scope.combineComp[k][8]++;
					}

				}

				for (var m = 0; m < $scope.combineComp.length - 1; m++) {
					$scope.combineComp[k][m] /= $scope.combineComp[k][8];
				}
			}


		}

		// tab 3
		$scope.team_selected = 0;

		$scope.chosenTeam = function (i) {
			return i;
		};
		$scope.chooseTeam = function (i) {
			$scope.team_selected = i;
		};

		$scope.saveProgress = function (mem) {
			$scope.showNoti = true;
			userFactory.updateSpecific(mem.userID, { pdp: mem.pdp })
				.$promise
				.then(function (res) {
					$scope.showNoti = false;
				});
		};
	}])

	.controller('pdpController', ['$scope', '$state', 'teamFactory', 'userFactory', '$timeout', function ($scope, $state, teamFactory, userFactory, $timeout) {
		$scope.loading = true;
		$scope.waitingQueue = true;
		$scope.tab_num = 1;

		userFactory.getPDP()
			.$promise
			.then(function (response) {
				$scope.loading = false;
				$scope.pdpData = response;
			});

		$scope.planObj = {
			learning_need: '',
			commitment: '',
			//		timeframe: '',
			//		monitoring: '',
			evaluation: ''
		};

		$scope.weekObj = {
			//		date: '',
			//		commitment: '',
			what_worked: '',
			what_didnt: '',
			//		was_being: '',
			what_better: ''
		};

		$scope.block_btn = false;

		$scope.saveProgress = function (idx) {
			$scope.waitingQueue = false;
			$scope.block_btn = true;

			if (idx != undefined && idx != null) {
				console.log(idx.date);
				idx.date = new Date().toISOString();
				console.log(idx.date);
			}

			userFactory.saveDetails($scope.pdpData)
				.$promise
				.then(function (res) {
					$scope.block_btn = false;

					$scope.planObj = {
						learning_need: '',
						commitment: '',
						//		timeframe: '',
						//		monitoring: '',
						evaluation: ''
					};

					$scope.weekObj = {
						//		date: '',
						//		commitment: '',
						what_worked: '',
						what_didnt: '',
						//		was_being: '',
						what_better: ''
					};

					$timeout(function () {
						$scope.waitingQueue = true;
					}, 500);
				});
		};

		$scope.addRowToPlan = function () {
			$scope.pdpData.pdp.planTable.push($scope.planObj);
			$scope.saveProgress();
		};

		$scope.removeRowFromPlan = function (i) {
			if (confirm("Are you sure want to delete entry " + (i + 1) + " ?")) {
				$scope.pdpData.pdp.planTable.splice(i, 1);
				$scope.saveProgress();
			}
		};

		$scope.addRowToWeek = function () {
			$scope.weekObj.date = new Date();
			$scope.pdpData.pdp.weekTable.push($scope.weekObj);
			$scope.saveProgress();
		};

		$scope.removeRowFromWeek = function (i) {
			if (confirm("Are you sure want to delete entry " + (i + 1) + " ?")) {
				$scope.pdpData.pdp.weekTable.splice(i, 1);
				$scope.saveProgress();
			}
		};
	}])

	.controller('uploadController', ['$scope', 'Upload', '$http', function ($scope, $upload, $http) {
		var d = new Date();
		$scope.title = "Image (" + d.getDate() + " - " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + ")";

		$scope.uploadFiles = function (files) {
			var tkn = $http.defaults.headers.common['x-access-token'];
			delete $http.defaults.headers.common['x-access-token'];

			$scope.files = files;
			if (!$scope.files) return;
			files.forEach(function (file, fi) {
				if (file && !file.$error) {
					file.upload = $upload.upload({
						url: "https://345459641734613:nSWjHitGmZdC5D79jMUddHxWNLc@api.cloudinary.com/v1_1/idiscover-me/upload",
						data: {
							upload_preset: "xw5x9fwo",
							tags: 'myphotoalbum',
							context: 'photo=' + $scope.title,
							file: file
						}
					})
						.progress(function (e) {
							file.progress = Math.round((e.loaded * 100.0) / e.total);
							file.status = "Uploading... " + file.progress + "%";
						})
						.success(function (data, status, headers, config) {
							data.context = { custom: { photo: $scope.title } };
							file.result = data;
						})
						.error(function (data, status, headers, config) {
							file.result = data;
						});
				}
			});

			$http.defaults.headers.common['x-access-token'] = tkn;
		};
	}])

	.controller('dragController', ['$scope', '$timeout', 'userFactory', '$rootScope', '$state', 'rankFactory', function ($scope, $timeout, userFactory, $rootScope, $state, rankFactory) {
		$scope.userData = {};
		$scope.loading = true;
		$scope.submitDone = false;

		$scope.dragArray = [];

		//track attempts
		var copyTrack = {
			dragTrack: 0
		};
		$scope.currentTime = new Date();

		userFactory.getDragDropQues()
			.$promise
			.then(function (success) {
				$scope.userData = success;

				if ($scope.userData.question.dragArray && $scope.userData.question.dragArray.length) {
					$scope.dragArray = $scope.userData.question.dragArray;
					$scope.loading = false;
					return '';
				}
				else {
					rankFactory.getKeywordData()
						.$promise
						.then(function (rankData) {
							$scope.dragArray = rankData;
							$scope.loading = false;
							return '';
						});
				}
			})
			.then(function (pData) {
				if ($scope.userData.question.dragTrack.length)		//if attempt exists before
					copyTrack.dragTrack = $scope.userData.question.dragTrack[$scope.userData.question.dragTrack.length - 1].attempt;
				else								//if doesn't exists
					copyTrack.dragTrack = 0;
			});

		$scope.shiftUp = function (indx) {
			$scope.info_statement = "";
			var item = $scope.dragArray.splice(indx, 1)[0];
			$scope.dragArray.splice(indx - 1, 0, item);
			$scope.info_statement = "'" + item + "' moved 1 block up !";
		};

		$scope.shiftDown = function (indx) {
			$scope.info_statement = "";
			var item = $scope.dragArray.splice(indx, 1)[0];
			$scope.dragArray.splice(indx + 1, 0, item);
			$scope.info_statement = "'" + item + "' moved 1 block down !";
		};

		$scope.logEvent = function (IndexCard) {
			$scope.movingItem = {
				IndexCard: IndexCard
			}
		};

		$scope.info_statement = "";

		$scope.$watch('info_statement', function (n, o) {
			if (n != o) {
				if (n)
					$timeout(function () {
						$scope.info_statement = "";
						$scope.globalI = -1;
					}, 1000);
			}
		});

		$scope.globalI = -1;
		$scope.dropCallback = function (indx, item, external) {
			// console.log(indx, item, external);
			$scope.info_statement = "";
			$scope.globalI = indx;
			var myI = external.indexOf(item);
			external.splice(indx, 0, external.splice(myI, 1)[0]);
			if (myI - indx > 0)
				$scope.info_statement = "'" + item + "' moved " + (myI - indx) + " block(s) up !";
			else if (myI - indx < 0)
				$scope.info_statement = "'" + item + "' moved " + (indx - myI) + " block(s) down !";
			else
				$scope.info_statement = "No change in position !";
		};

		$scope.updateUser = function () {
			$scope.userData.last_modification = new Date();		//saving last modification
			var diff = (Date.parse($scope.userData.last_modification) - Date.parse($scope.currentTime)) / 1000;		//finding out total time taken
			$scope.userData.question.dragTrack.push({ time_taken: diff, attempt: copyTrack.dragTrack + 1, when: $scope.userData.last_modification });

			userFactory.saveDetails({ 'question.dragArray': $scope.dragArray, 'question.dragTrack': $scope.userData.question.dragTrack, last_modification: $scope.userData.last_modification })
				.$promise
				.then(function (result) {
					$rootScope.$broadcast('noti:Send', { statement: "filled Rank Your Strengths." });
					$state.go('questionnaire', {});
				});
		};
	}])
	;