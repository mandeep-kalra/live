'use strict';

angular.module('idiscover.me')

	.constant("baseURL", "")

	.factory('$localStorage', ['$window', function ($window) {
		return {
			store: function (key, value) {
				$window.localStorage[key] = value;
			},
			get: function (key, defaultValue) {
				return $window.localStorage[key] || defaultValue;
			},
			remove: function (key) {
				$window.localStorage.removeItem(key);
			},
			storeObject: function (key, value) {
				$window.localStorage[key] = JSON.stringify(value);
			},
			getObject: function (key, defaultValue) {
				return JSON.parse($window.localStorage[key] || defaultValue);
			}
		};
	}])

	.factory('authFactory', ['baseURL', '$http', '$resource', '$rootScope', '$localStorage', '$timeout', function (baseURL, $http, $resource, $rootScope, $localStorage, $timeout) {
		var authFac = {};
		var TOKEN_KEY = 'Token';
		var isAuthenticated = false;
		var username = '';
		var scrt = 'portal\/\/\'*iD';

		function loadUserCredentials() {
			var credentials = $localStorage.getObject(TOKEN_KEY, '{}');
			if (credentials.username) {
				useCredentials(credentials);
			}
		}

		function storeUserCredentials(credentials) {
			$localStorage.storeObject(TOKEN_KEY, credentials);
			useCredentials(credentials);
		}

		function useCredentials(credentials) {
			isAuthenticated = true;
			username = credentials.username;

			// Set the token as header for your requests!
			$http.defaults.headers.common['x-access-token'] = credentials.token;
		}

		function destroyUserCredentials() {
			username = '';
			isAuthenticated = false;
			$http.defaults.headers.common['x-access-token'] = undefined;
			$localStorage.remove(TOKEN_KEY);
		}

		authFac.login = function (lData) {

			var loginData = {};
			loginData.username = lData.username;
			loginData.password = lData.password;

			var encrypted = CryptoJS.AES.encrypt(loginData.password, scrt);
			//console.log(encrypted.toString());
			loginData.password = encrypted.toString();

			$resource(baseURL + "user/auth/login").save(loginData,
				function (response) {
					storeUserCredentials({ username: loginData.username, token: response.token });
					$rootScope.$broadcast('login:Successful');
					$rootScope.$broadcast('registration:Successful');
				},
				function (response) {
					$rootScope.$broadcast('error:Failure', response.data.message);
					isAuthenticated = false;

					var message = '\
                                                        <div class="ngdialog-message">\
                                                        <div><h3>LOGIN UNSUCCESSFUL</h3></div>' +
						'<div><p>' + response.data.err.message + '</p>' +
						'<p>' + response.data.err.name + '</p>' +
						'</div>' +
						'<div class="ngdialog-buttons">\
                                                            <button type="button" class="ngdialog-button ngdialog-button-primary" ng-click=confirm("OK")>OK</button>\
                                                        </div>';

				}

			);

		};

		authFac.forget = function (forgetData) {
			return $resource(baseURL + 'user/resetpsw/' + forgetData.username).get(function (response) { },
				function (response) {
					$rootScope.$broadcast('error:Failure', response.data.message);
				});
		};

		authFac.logout = function () {
			$resource(baseURL + "user/auth/logout").get(function (response) { });
			destroyUserCredentials();
		};

		authFac.register = function (lData) {

			var registerData = {};

			registerData.username = lData.username;
			registerData.firstname = lData.firstname;
			registerData.lastname = lData.lastname;
			registerData.password = lData.password;

			var encrypted = CryptoJS.AES.encrypt(registerData.password, scrt);
			//console.log(encrypted.toString());
			registerData.password = encrypted.toString();

			$resource(baseURL + "user/auth/register").save(registerData,
				function (response) {
					authFac.login({
						username: registerData.username,
						password: CryptoJS.AES.decrypt(registerData.password, scrt)
					}).toString(CryptoJS.enc.Utf8);
				}
				, function (response) {
					$rootScope.$broadcast('error:Failure', response.data.message);
					var message = '\
                                                            <div class="ngdialog-message">\
                                                            <div><h3>REGISTRATION UNSUCCESSFUL</h3></div>' +
						'<div><p>' + response.data.err.message + '</p>' +
						'<p>' + response.data.err.name + '</p>' +
						'</div>' +
						'<div class="ngdialog-buttons">\
                                                                <button type="button" class="ngdialog-button ngdialog-button-primary" ng-click=confirm("OK")>OK</button>\
                                                            </div>';


				}

			);
		};

		authFac.isAuthenticated = function () {
			return isAuthenticated;
		};

		loadUserCredentials();

		return authFac;
	}])

	.factory('userFactory', ['baseURL', '$resource', function (baseURL, $resource) {
		var userD = {};
		var details = false;
		var content = {};
		var name = {};
		var ques_content = {};
		var profile_content = {};

		userD.detailsLoaded = function () {
			return details;
		};
		userD.getIdFromUsername = function (eID) {
			return $resource(baseURL + 'user/fetchId/' + eID).get(function (success) { details = true; }, function (e) { details = false; });
		};
		userD.getName = function () {
			name = $resource(baseURL + 'user/name').get(function (success) { details = true; }, function (e) { details = false; });
			return name;
		};
		userD.getPersonal = function (init) {
			content = init;
			content = $resource(baseURL + 'user/personal').get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		userD.getDetails = function (init) {
			content = init;
			content = $resource(baseURL + 'user/details').get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		userD.getQuestions = function (init) {
			ques_content = init;
			ques_content = $resource(baseURL + 'user/questions').get(function (success) { details = true; }, function (e) { details = false; });
			return ques_content;
		};
		userD.getProfile = function (init) {
			profile_content = init;
			profile_content = $resource(baseURL + 'user/profile/getProfile').get(function (success) { details = true; }, function (e) { details = false; });
			return profile_content;
		};
		userD.getSpecific = function (data) {
			return $resource(baseURL + 'user/specific/' + data.id).get(function (success) { details = true; }, function (e) { details = false; });
		};
		userD.getPeersData = function (data) {
			return $resource(baseURL + 'user/peers_data/' + data.id).get(function (success) { details = true; }, function (e) { details = false; });
		};
		userD.getPeerSpecific = function (data) {
			return $resource(baseURL + 'user/peer/' + data.id + '/' + data.eid).get(function (success) { details = true; }, function (e) { details = false; });
		};
		userD.getSpecificReport = function (data) {
			return $resource(baseURL + 'user/report/' + data.id).get(function (success) { details = true; }, function (e) { details = false; });
		};
		userD.getAssessorReport = function (data) {
			return $resource(baseURL + 'user/assessor-report/' + data.id).get(function (success) { details = true; }, function (e) { details = false; });
		};
		userD.getDragDropQues = function () {
			return $resource(baseURL + 'user/drag-drop').get(function (success) { details = true; }, function (e) { details = false; });
		};
		userD.updateSpecific = function (id, data) {
			return $resource(baseURL + 'user/specific/' + id, null, {
				'update': {
					method: 'PUT'
				}
			}).update(data);
		};
		userD.getCompByAssessor = function (data) {
			return $resource(baseURL + 'user/assessor-competencies', null, {
				'update': {
					method: 'PUT'
				}
			}).update(data);
		};
		userD.getUsers = function (init, pg) {
			profile_content = init;
			profile_content = $resource(baseURL + 'user/list/' + pg, null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
			return profile_content;
		};
		userD.getFacUsers = function (init) {
			profile_content = init;
			profile_content = $resource(baseURL + 'user/fac_list', null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
			return profile_content;
		};
		userD.getPDP = function () {
			return $resource(baseURL + 'user/pdp', null, {}).get(function (success) { details = true; }, function (e) { details = false; });
		};
		userD.getManagers = function () {
			return $resource(baseURL + 'user/manager-list', null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
		};
		userD.getManagerTeams = function () {
			return $resource(baseURL + 'user/managerData', null, {}).get(function (success) { details = true; }, function (e) { details = false; });
		};
		userD.membersVerification = function (data) {
			return $resource(baseURL + 'user/verifyMembers', null, {
				'update': {
					method: 'PUT'
				}
			}).update(data);
		};
		userD.getAnalysis = function (init) {
			content = init;
			content = $resource(baseURL + 'user/analysis').get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		userD.getFacAnalysis = function (init) {
			content = init;
			content = $resource(baseURL + 'user/fac_analysis').get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		userD.getPercentage = function (init) {
			profile_content = init;
			profile_content = $resource(baseURL + 'user/completion').get(function (success) { details = true; }, function (e) { details = false; });
			return profile_content;
		};
		userD.getFbDetails = function (init) {
			content = init;
			content = $resource(baseURL + 'user/feedback').get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		userD.sendMailToOwn = function (data) {
			$resource(baseURL + 'user/mailToOwn').save(data, function (success) { details = true; }, function (e) { details = false; });
		};
		userD.savePSW = function (data) {
			var newData = {};
			newData.password = data.password;
			var scrt = 'portal\/\/\'*iD';
			var encrypted = CryptoJS.AES.encrypt(newData.password, scrt);
			//console.log(encrypted.toString());
			newData.password = encrypted.toString();

			return $resource(baseURL + 'user/resetpsw/' + data.eid + '/' + data.tkn).save(newData);
		};
		userD.saveDetails = function (data) {
			return $resource(baseURL + 'user/details').save(data);
		};
		userD.saveReviewers = function (data) {
			return $resource(baseURL + 'user/reviewers').save(data);
		};
		userD.sendAndSaveProfileData = function (data) {
			return $resource(baseURL + 'user/profile/insertProfile').save(data);
		};
		userD.sendAndSaveProfileDataByFacilitator = function (id, data) {
			return $resource(baseURL + 'user/profile/insertProfileByFacilitator/' + id).save(data);
		};
		userD.submitPeerData = function (id, index, data) {
			return $resource(baseURL + 'user/peer_submit/' + id + '/' + index).save(data);
		};
		userD.checkPeerEmail = function (id, data) {
			return $resource(baseURL + 'user/peer_check/' + id).save(data);
		};

		return userD;
	}])

	.factory('keywordFactory', ['baseURL', '$resource', function (baseURL, $resource) {
		var profileD = {};
		var details = false;
		var content = {};
		var ques_content = {};

		profileD.detailsLoaded = function () {
			return details;
		};
		profileD.getProfile = function (tno) {
			content = [];
			content = $resource(baseURL + 'keyword/0' + tno, null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		profileD.getLessProfile = function (tno) {
			content = [];
			content = $resource(baseURL + 'keyword/getLess/0' + tno, null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		profileD.updateProfile = function (pno, sno, kno, data) {
			kno = parseInt(kno);
			return $resource(baseURL + 'keyword/0' + pno + '/0' + sno + '/' + (kno > 9 ? kno : '0' + kno), null, {
				'update': {
					method: 'PUT'
				}
			}).update(data);
		};
		profileD.saveNew = function (data) {
			return $resource(baseURL + 'keyword').save(data);
		};
		profileD.addNewByAssessor = function (which, data) {
			if (which == 'mini')
				return $resource(baseURL + 'keyword/miniByAssessor').save(data);
			else if (which == 'key')
				return $resource(baseURL + 'keyword/keyByAssessor').save(data);
		};

		return profileD;
	}])

	.factory('addedFactory', ['baseURL', '$resource', function (baseURL, $resource) {
		var quesD = {};
		var details = false;
		var content = {};
		var ques_content = {};

		quesD.detailsLoaded = function () {
			return details;
		};
		quesD.getProfile = function (tno) {
			content = [];
			content = $resource(baseURL + 'added/0' + tno, null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		quesD.updateProfile = function (pno, sno, kno, data) {
			return $resource(baseURL + 'added/0' + pno + '/0' + sno + '/0' + kno, null, {
				'update': {
					method: 'PUT'
				}
			}).update(data);
		};
		quesD.saveNew = function (data) {
			return $resource(baseURL + 'added').save(data);
		};

		return quesD;
	}])

	.factory('growthRecommendFactory', ['baseURL', '$resource', function (baseURL, $resource) {
		var recommendD = {};
		var details = false;
		var content = {};
		var ques_content = {};

		recommendD.detailsLoaded = function () {
			return details;
		};
		recommendD.getProfile = function (pno) {
			content = [];
			content = $resource(baseURL + 'growth_rec/0' + pno, null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		recommendD.updateProfile = function (pno, sno, data) {
			if (sno <= 9)
				sno = '0' + sno;
			return $resource(baseURL + 'growth_rec/0' + pno + '/' + sno, null, {
				'update': {
					method: 'PUT'
				}
			}).update(data);
		};
		recommendD.saveNew = function (data) {
			return $resource(baseURL + 'growth_rec').save(data);
		};

		return recommendD;
	}])

	.factory('growthRecommendAssessorFactory', ['baseURL', '$resource', function (baseURL, $resource) {
		var recommendD = {};
		var details = false;
		var content = {};
		var ques_content = {};

		recommendD.detailsLoaded = function () {
			return details;
		};
		recommendD.getProfile = function (pno) {
			content = [];
			content = $resource(baseURL + 'growth_rec_assessor/0' + pno, null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		recommendD.updateProfile = function (data) {
			return $resource(baseURL + 'growth_rec_assessor/' + data.sID, null, {
				'update': {
					method: 'PUT'
				}
			}).update(data);
		};
		recommendD.saveNew = function (data) {
			return $resource(baseURL + 'growth_rec_assessor').save(data);
		};
		recommendD.addNewByAssessor = function (data) {
			return $resource(baseURL + 'growth_rec_assessor/growthByAssessor').save(data);
		};

		return recommendD;
	}])

	.factory('beliefFactory', ['baseURL', '$resource', function (baseURL, $resource) {
		var beliefD = {};
		var details = false;
		var content = {};
		var ques_content = {};

		beliefD.detailsLoaded = function () {
			return details;
		};
		beliefD.getProfile = function (pno) {
			content = [];
			content = $resource(baseURL + 'beliefs/0' + pno, null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		beliefD.updateProfile = function (pno, sno, data) {
			return $resource(baseURL + 'beliefs/0' + pno + '/0' + sno, null, {
				'update': {
					method: 'PUT'
				}
			}).update(data);
		};
		beliefD.saveNew = function (data) {
			return $resource(baseURL + 'beliefs').save(data);
		};

		return beliefD;
	}])

	.factory('competencyFactory', ['baseURL', '$resource', function (baseURL, $resource) {
		var compD = {};
		var details = false;
		var content = {};
		var ques_content = {};

		compD.detailsLoaded = function () {
			return details;
		};
		compD.getComps = function () {
			content = [];
			content = $resource(baseURL + 'competency', null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		compD.updateComps = function (data) {
			return $resource(baseURL + 'competency/' + data.competency_id, null, {
				'update': {
					method: 'PUT'
				}
			}).update(data);
		};
		compD.saveNew = function (data) {
			return $resource(baseURL + 'competency').save(data);
		};

		return compD;
	}])

	.factory('recommendFactory', ['baseURL', '$resource', function (baseURL, $resource) {
		var recommendD = {};
		var details = false;
		var content = {};
		var ques_content = {};

		recommendD.detailsLoaded = function () {
			return details;
		};
		recommendD.getProfile = function (pno) {
			content = [];
			content = $resource(baseURL + 'rec_for_man/0' + pno, null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		recommendD.updateProfile = function (pno, sno, data) {
			return $resource(baseURL + 'rec_for_man/0' + pno + '/0' + sno, null, {
				'update': {
					method: 'PUT'
				}
			}).update(data);
		};
		recommendD.saveNew = function (data) {
			return $resource(baseURL + 'rec_for_man').save(data);
		};
		recommendD.addNewByAssessor = function (data) {
			return $resource(baseURL + 'rec_for_man/recommendByAssessor').save(data);
		};

		return recommendD;
	}])

	.factory('facilitatorFactory', ['baseURL', '$resource', function (baseURL, $resource) {
		var facD = {};
		var details = false;
		var content = {};
		var ques_content = {};

		facD.detailsLoaded = function () {
			return details;
		};
		facD.getFacs = function () {
			content = [];
			content = $resource(baseURL + 'facList', null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		facD.updateFac = function (id, data) {
			return $resource(baseURL + 'facList/' + id, null, {
				'update': {
					method: 'PUT'
				}
			}).update(data);
		};
		facD.removeFac = function (id) {
			return $resource(baseURL + 'facList/' + id).remove(function (success) { details = true; }, function (e) { details = false; });
		};
		facD.saveNew = function (data) {
			return $resource(baseURL + 'facList').save(data);
		};

		return facD;
	}])

	.factory('teamFactory', ['baseURL', '$resource', function (baseURL, $resource) {
		var teamD = {};
		var details = false;
		var content = {};
		var ques_content = {};

		teamD.detailsLoaded = function () {
			return details;
		};
		teamD.getTeams = function () {
			content = [];
			content = $resource(baseURL + 'team', null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		teamD.updateTeam = function (id, data) {
			return $resource(baseURL + 'team/' + id, null, {
				'update': {
					method: 'PUT'
				}
			}).update(data);
		};
		teamD.removeTeam = function (id) {
			return $resource(baseURL + 'team/' + id).remove(function (success) { details = true; }, function (e) { details = false; });
		};
		teamD.saveNew = function (data) {
			return $resource(baseURL + 'team').save(data);
		};

		return teamD;
	}])

	.factory('notiFactory', ['baseURL', '$resource', function (baseURL, $resource) {
		var notiD = {};
		var details = false;
		var content = {};
		var ques_content = {};

		notiD.detailsLoaded = function () {
			return details;
		};
		notiD.getNoti = function (init) {
			content = init;
			content = $resource(baseURL + 'noti', null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		notiD.getFacNoti = function (init) {
			content = init;
			content = $resource(baseURL + 'noti/fac_noti', null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		notiD.removeDupNoti = function () {
			return $resource(baseURL + 'noti/removeDuplicates').get(function (success) { details = true; }, function (e) { details = false; });
		};
		notiD.removeDupNotiForFac = function () {
			return $resource(baseURL + 'noti/removeDuplicatesForFac').get(function (success) { details = true; }, function (e) { details = false; });
		};
		notiD.saveNoti = function (data) {
			return $resource(baseURL + 'noti').save(data);
		};
		notiD.updateNoti = function (data) {
			return $resource(baseURL + 'noti/' + data._id, null, {
				'update': {
					method: 'PUT'
				}
			}).update(data);
		};

		return notiD;
	}])

	.factory('roleFitmentFactory', ['baseURL', '$resource', function (baseURL, $resource) {
		var roleD = {};
		var details = false;
		var content = {};
		var ques_content = {};

		roleD.detailsLoaded = function () {
			return details;
		};
		roleD.getData = function (pno) {
			content = [];
			content = $resource(baseURL + 'role_fitment/' + pno, null).get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		roleD.saveNew = function (section_name, pno, data) {
			return $resource(baseURL + 'role_fitment/' + pno + '/' + section_name).save(data);
		};
		roleD.updateRole = function (section_name, pno, data) {
			return $resource(baseURL + 'role_fitment/' + pno + '/' + section_name, null, {
				'update': {
					method: 'PUT'
				}
			}).update(data);
		};

		return roleD;
	}])

	.factory('synthesisFactory', ['baseURL', '$resource', function (baseURL, $resource) {
		var synD = {};
		var details = false;
		var content = {};
		var ques_content = {};

		synD.detailsLoaded = function () {
			return details;
		};
		synD.getData = function (pno) {
			content = [];
			content = $resource(baseURL + 'profile_synthesis/' + pno, null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		// synD.saveNew = function (section_name, pno, data) {
		// 	return $resource(baseURL + 'profile_synthesis/' + pno + '/' + section_name).save(data);
		// };
		synD.updateSynthesis = function (data) {
			return $resource(baseURL + 'profile_synthesis/' + data.sID, null, {
				'update': {
					method: 'PUT'
				}
			}).update(data);
		};

		return synD;
	}])

	.factory('rankFactory', ['baseURL', '$resource', function (baseURL, $resource) {
		var rankD = {};
		var details = false;
		var content = {};
		var ques_content = {};

		rankD.detailsLoaded = function () {
			return details;
		};
		rankD.getKeywordData = function (pno) {
			content = [];
			content = $resource(baseURL + 'rank_strengths/fetchKeywordsOnly', null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		rankD.getData = function (pno) {
			content = [];
			content = $resource(baseURL + 'rank_strengths/', null, { 'get': { method: 'GET', isArray: true } }).get(function (success) { details = true; }, function (e) { details = false; });
			return content;
		};
		// rankD.saveNew = function (section_name, pno, data) {
		// 	return $resource(baseURL + 'rank_strengths/' + pno + '/' + section_name).save(data);
		// };
		rankD.updateRank = function (data) {
			return $resource(baseURL + 'rank_strengths/' + data.sID, null, {
				'update': {
					method: 'PUT'
				}
			}).update(data);
		};

		return rankD;
	}])

	.factory('questionnaireFactory', ['$resource', 'baseURL', function ($resource, baseURL) {
		return $resource(baseURL + "ques/:id", null, {
			'update': {
				method: 'PUT'
			}
		});
	}])

	.factory('openQuestionnaireFactory', ['$resource', 'baseURL', function ($resource, baseURL) {
		return $resource(baseURL + "openQues/:id", null, {
			'update': {
				method: 'PUT'
			}
		});
	}])

	.factory('openUserFactory', ['$resource', 'baseURL', function ($resource, baseURL) {
		return $resource(baseURL + "openUser", null, {
			'update': {
				method: 'PUT'
			}
		});
	}])

	.factory('openMCQFactory', ['$resource', 'baseURL', function ($resource, baseURL) {
		return $resource(baseURL + "openMCQ/:id", null, {
			'update': {
				method: 'PUT'
			}
		});
	}])

	.factory('openMCQFactory2', ['$resource', 'baseURL', function ($resource, baseURL) {
		return $resource(baseURL + "openMCQ/getAll", null, {
			'update': {
				method: 'PUT'
			}
		});
	}])

	.factory('openMCQUserFactory', ['$resource', 'baseURL', function ($resource, baseURL) {
		return $resource(baseURL + "openMCQUser/:id", null, {
			'update': {
				method: 'PUT'
			}
		});
	}])

	.factory('libraryFactory', ['$resource', 'baseURL', function ($resource, baseURL) {
		return $resource(baseURL + "library/:num/:num2", null, {
			'update': {
				method: 'PUT'
			}
		});
	}])

	.factory('additionalDataFactory', ['$resource', 'baseURL', function ($resource, baseURL) {
		var retD = {};

		retD.rounds_feedback_default = {
			q1: 'Mention both Positives and Negatives\n\nSpecific role competencies or values company wants candidate to be assessed on',
			q2: 'Coordinator’s Observations:\n[Confidence, communication, profile specific patterns, coordination and keeping informed, seriousness & commitment]',
			q3: '',
			q4: 'Please check for Job changes, endorsements from Linkedin, Strengths'
		};

		retD.RQ_notes_default = {
			q1: 'Probing questions: What do you mean by it ? Can you share instances ?\nCopy paste statements you want to probe on:\nRQ1:\nRQ2:\nRQ3:\nRQ4:',
			q2: '',
			q3: '',
			q41: 'Self-awareness',
			q42: 'Openness',
			q43: 'Personal mastery'
		};

		retD.sectionDescs = [["People like you prefer a workculture which values integrity,follows a step-by step approach and  there is a sense of responsibility and accountability amongst the employees.", " People like you are self-disciplined, responsible and committed individuals who  dedicatedly work to achieve excellence in whatever you do.  You are rational , orderly and detail -oriented individuals.", "People like you get burdened by too much responsibility because you think that other people wont be able do justice to their projects.You see the world in white and black and emphasize only on one correct way of doing things."],
		["People like you prefer a friendly workplace where employees get care and support. You value cooperative environment at work.", "People like you love working with people, have high energy and are very expressive.You are helper, generous and have an intuitive ability to know how to best support others and  can empathically listen to another person.", " People like you become extremely distressed when someone whose opinion or affection you care about perceives you in a negative way. You may try to become  indispensable;  trying too hard to get others' approval and appreciation."],
		["People like you prefer a workplace where employees are given chance to achieve greater things in their professional career and a place which values recognizing its employees for their work.", "People like you are ambitious, self-reliant and result-oriented individuals. You are able to motivate people to achieve set goals through your oratory skills. You prove to be really good at marketing products.", " People like you get so engrossed  into meeting goals that you start considering any kind of emotions as an obstacles to your performance. You may start attaching your self worth to your achievements which forces you to showcase only succesful image to people."],
		["People like you prefer a workplace where employees are valued for the creativity theyr bring into their work. You value authentic connections at workplace and seek for deeper meaning in whatever you do.", "People like you are creative, genuine and intuitive and able to see those things which other people can't see. You have a gift of sensing aesthetic sensibilities and develop warm and authentic relationships.", "People like you are ususally over sensitive. One of the biggest challenges you face is learning to let go of feelings from the past. You may feel hurt or attacked when people don’t understand you."],
		["People like you prefer a workplace which is high on innovation and experimentation.", "People like you are very inquisitive, intelligent and always asking questions to know the things in depth. You like to brainstorm on ideas and developing theories. You are very good at percieving the cause and effects of a project.", "People like you become more absorbed in thoughts and prefer to keep people at distance and may come across as rude and cold to others. You may become more passive observers and find difficulty in take  actions."],
		["People like you prefer a workplace which  is structured and organized and offers a predictable environment to work in.", "People like you are responsible,reliable ,committed and faithful to family and friends. You prove to be excellent trouble shooters and also anticipate problems in advance.", "People like you generally have self-doubt and underestimate yourself a lot. You tend to exhaust yourself by worrying and scanning for danger."],
		["People like you prefer a workplace which provides freedom to work in their own own ways to its employees. You also seek for a place where you can have fun with your colleagues along with work", "People like you are naturally cheerful and good humored who believes in living life to the fullest. You are multitalented who learn fast and have many abilities in many diverse areas. You have curious and agile minds and can quickly generate new ideas.", "People like you keep planning for more activities and want to keep  options open and thus leaving projects unfinished. You feel confined when told to work under guidelines and find it difficult to deliver on time."],
		["People like you prefer a workplace which focus on the empowerment of its employees. You value independence and courage to speak what one feels like sharing.", " People like you have enormous willpower, vitality and possess a can do  attitude . You take the initiative and make things happen with a great passion for life. You are honest and direct and dont let others' opinions change your mind.", "People like you do not want to get controlled, or allow others to have power over you.You hide your vulnerabilities in order to come across as strong person. You may become blunt in your conversations which may sacre people away."],
		["People like you search for peace and harmony and try to avoid tension and conflict. You value workplaces where there is harmony, mutual respect and everyone is heard.", "People like you are easygoing, adaptive and flexible. You often seek ways to remove conflicts between others. You are friendly and generally express yourself indirectly rather than boldly or directly as a way to create and maintain positive relationships and reduce potential discord between yourself and others.", "People like you are extremely uncomfortable with conflict when it is directed toward you and even more uncomfortable when you feel angry with someone else. You don't express opinions or preferences that could cause disagreements and generally engage in activities that comfort you, rather than focusing on their own desires or priorities. Most likely you avoid taking strong stands."]];		// 9(type)x3(sections) 2d-array to store section descriptions

		var doc = new jsPDF('p', 'pt', 'a4');    //595 X 842
		var img = new Image();
		img.src = 'images/pdf-logo.png';

		var arrowImg = new Image();
		arrowImg.src = 'images/arrow.png';
		var smallArrowImg = new Image();
		smallArrowImg.src = 'images/small_arrow.png';
		var smallArrowImg2 = new Image();
		smallArrowImg2.src = 'images/small_arrow_v.png';

		var low = new Image();
		low.src = 'images/120.png';
		var med = new Image();
		med.src = 'images/240.png';
		var high = new Image();
		high.src = 'images/360.png';
		var weaklyP = new Image();
		weaklyP.src = 'images/weakly.png';
		var partiallyP = new Image();
		partiallyP.src = 'images/partially.png';
		var stronglyP = new Image();
		stronglyP.src = 'images/strongly.png';

		arrowImg.onload = function () { arrowImg.width = 50; arrowImg.height = 250; };
		smallArrowImg.onload = function () { smallArrowImg.width = 25; smallArrowImg.height = 30; };
		smallArrowImg2.onload = function () { smallArrowImg2.width = 25; smallArrowImg2.height = 30; };

		low.onload = function () { low.width = 100; low.height = 100; };
		med.onload = function () { med.width = 100; med.height = 100; };
		high.onload = function () { high.width = 100; high.height = 100; };

		weaklyP.onload = function () { weaklyP.width /= 1.5; weaklyP.height /= 1.5; };
		partiallyP.onload = function () { partiallyP.width /= 1.5; partiallyP.height /= 1.5; };
		stronglyP.onload = function () { stronglyP.width /= 1.5; stronglyP.height /= 1.5; };

		var contentBox = new Image();
		contentBox.src = 'images/box.png';
		contentBox.onload = function () { contentBox.width /= 2; contentBox.height /= 2; };

		var main_circle = new Image();

		var q1l, q1ml, q1m, q1hm, q1h, q2l, q2ml, q2m, q2hm, q2h, q3l, q3ml, q3m, q3hm, q3h, q4l, q4ml, q4m, q4hm, q4h;

		for (var zt = 1; zt <= 4; zt++) {
			eval("q" + zt + "l = new Image()");
			eval("q" + zt + "ml = new Image()");
			eval("q" + zt + "m = new Image()");
			eval("q" + zt + "hm = new Image()");
			eval("q" + zt + "h = new Image()");

			eval("q" + zt + "l.src = 'images/paei/q" + zt + "l.png'");
			eval("q" + zt + "ml.src = 'images/paei/q" + zt + "ml.png'");
			eval("q" + zt + "m.src = 'images/paei/q" + zt + "m.png'");
			eval("q" + zt + "hm.src = 'images/paei/q" + zt + "hm.png'");
			eval("q" + zt + "h.src = 'images/paei/q" + zt + "h.png'");

			eval("q" + zt + "l.onload = function(){	q" + zt + "l.width = 200;	q" + zt + "l.height = 200;	}");
			eval("q" + zt + "ml.onload = function(){	q" + zt + "m.width = 200;	q" + zt + "m.height = 200;	}");
			eval("q" + zt + "m.onload = function(){	q" + zt + "m.width = 200;	q" + zt + "m.height = 200;	}");
			eval("q" + zt + "hm.onload = function(){	q" + zt + "h.width = 200;	q" + zt + "h.height = 200;	}");
			eval("q" + zt + "h.onload = function(){	q" + zt + "h.width = 200;	q" + zt + "h.height = 200;	}");
		}

		main_circle.src = 'images/paei/circlev5.png';

		main_circle.onload = function () { main_circle.width = 400; main_circle.height = 400; };

		var cur_time;
		var total_months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		var pg_num = 1;

		var firstMD;

		function printScoreContent(coords, repData, title, score, indx) {
			coords.x = 45;

			var xyz = doc.splitTextToSize(title, 135);
			doc.setFontType("bold");
			doc.text(coords.x, coords.y, xyz);
			doc.setFontType("normal");
			coords.x = 205;
			if (score)
				doc.text(coords.x, coords.y, '' + score + ' / 3.0');
			else
				doc.text(coords.x, coords.y, '0');
			doc.setDrawColor(208, 208, 208);
			doc.setLineWidth(8);
			coords.x = 260;
			doc.line(coords.x, coords.y - 4, coords.x + 285, coords.y - 4);
			if (score >= 0 && score <= 1)
				doc.setDrawColor(255, 68, 68);
			else if (score > 1 && score < 2)
				doc.setDrawColor(255, 152, 0);
			else if (score >= 2 && score <= 3)
				doc.setDrawColor(0, 200, 81);
			doc.line(coords.x, coords.y - 4, coords.x + (score * 95), coords.y - 4);
			coords.y += 15;
			if (score >= 0 && score <= 1)
				xyz = doc.splitTextToSize(repData.assessor.rubric[indx][0], 285);
			else if (score > 1 && score < 2)
				xyz = doc.splitTextToSize(repData.assessor.rubric[indx][1], 285);
			else if (score >= 2 && score <= 3)
				xyz = doc.splitTextToSize(repData.assessor.rubric[indx][2], 285);
			doc.text(coords.x, coords.y, xyz);

			coords.x = 45;
			coords.y += ((xyz.length) * 12) + 15;
		}

		function parseTags(htmlStr) {
			var b = htmlStr.match(/<b>/ig);
			var i = htmlStr.match(/<i>/ig);
			return { b: b ? b.length : 0, i: i ? i.length : 0, str: htmlStr.replace(/<b>/ig, ' <b> ').replace(/<i>/ig, ' <i> ').replace(/<\/b>/ig, ' </b> ').replace(/<\/i>/ig, ' </i> ').replace(/<div>/ig, ' <div> ').replace(/<\/div>/ig, ' </div> ').replace(/<br>/ig, ' <br> ') };
		}

		function isEmptyPage(recPage, repData) {
			var c = 0;
			while (c < repData.assessor.recommend.length) {
				if (repData.assessor.recommend[c].page == recPage)
					return false;
				c++;
			}

			return true;
		}

		function getProfileCompetencyMapping(compArray, competencies, cID) {
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
					return competencies[indx]['competency'];
				}
			}
			else
				return '';
		};

		function footer(page) {
			doc.setFontType("bold");
			doc.setTextColor(150, 150, 150);
			doc.setFontSize(8);
			doc.text(55, 780, "Page " + page);
			doc.text(497, 780, total_months[cur_time.getMonth()] + ' ' + cur_time.getDate() + ', ' + cur_time.getFullYear());
			doc.setDrawColor(220, 220, 220);
			doc.setLineWidth(1);
			doc.line(50, 765, 545, 765);
			doc.addImage(img, 243, 770, 100, 25);
			doc.setFontType("italic");
			doc.text(30 + (535 - Math.round(doc.getTextDimensions("Revealing the human potential.").w)) / 2, 807, "Revealing the human potential.");
			doc.setFontType("normal");
		}

		function executeAutomatedProfile(coords, userProf, sno) {
			var width, des;
			// if (sno == 3)
			// 	userProf = userProf.slice().sort(function (a, b) {
			// 		if (a.bsl_score < b.bsl_score) return 1;
			// 		else if (a.bsl_score > b.bsl_score) return -1;
			// 		else return 0;
			// 	});
			userProf
				.filter(function (key) { return key.keyword_id[5] == sno && key['assessor_checkbox']; })
				.forEach(function (key, indx) {
					if (coords.y > 750) {	//exceeds page height
						doc.addPage();
						pg_num++;
						footer(pg_num);
						coords.x = 45;
						coords.y = 70;
						// doc.setFontType("normal");
						sno == 2 ? doc.setTextColor(66, 133, 244) : doc.setTextColor(255, 100, 0);
						doc.setFontSize(11);
					}

					doc.setFontType('bold');
					give_me_color('none');
					doc.setLineWidth(1);
					sno == 2 ? doc.setTextColor(66, 133, 244) : doc.setTextColor(255, 100, 0);

					var kw = doc.splitTextToSize(key.report_keyword, 130);
					var i = 0;
					var ty = coords.y, maxY = kw.length, maxY2 = 1;
					while (i < kw.length) {
						// doc.setTextColor(256, 256, 256);
						// sno == 2 ? doc.setFillColor(66, 133, 244) : doc.setFillColor(255, 136, 0);
						// doc.roundedRect(coords.x - 6, coords.y - 12, 14 + parseInt((doc.getTextDimensions(kw[i])).w), 16, 3, 3, 'FD');
						doc.text(coords.x, coords.y, kw[i]);

						if (i != kw.length - 1) {
							coords.x = 45; coords.y += 16;
						}

						i++;
					}
					coords.y = ty;

					doc.text(180, coords.y, ': ');
					coords.x += 10;

					// doc.text(coords.x, coords.y, kw);
					coords.x = 190 + 20;
					// coords.y += 16;

					doc.setFontType('normal');
					doc.setTextColor(0, 0, 0);

					if (sno == 2)
						key.report_descriptions
							.filter(function (mini) { return mini.assessor_mini_checkbox; })
							.forEach(function (item, indx) {
								// give_me_automated_color(item.relate);
								width = parseInt((doc.getTextDimensions(item.mini_description)).w);
								if ((width + coords.x) > 550) {			//exceeds horizontally
									coords.x = 190 + 20;
									if (indx != 0) coords.y += 18;
									maxY2++;
								}
								doc.addImage(bullet, coords.x - 12, coords.y - 7, 4, 4);
								des = doc.splitTextToSize(item.mini_description, 345);
								var i = 0;
								while (i < des.length) {
									// doc.text(coords.x, coords.y - 10, coords.x + '|' + width);
									doc.text(coords.x, coords.y, des[i]);

									if (i != des.length - 1) {
										coords.x = 190 + 20; coords.y += 18;
									}

									i++;
								}

								coords.x += (width + 20);
							});

					if (sno == 3)
						if (key.report_descriptions)
							key.report_descriptions
								.forEach(function (item, indx) {
									if (coords.y > 750) {	//exceeds page height
										doc.addPage();
										pg_num++;
										footer(pg_num);
										coords.x = 210;
										coords.y = 70;
										doc.setTextColor(0, 0, 0);
										doc.setFontSize(11);
									}
									// give_me_automated_color(item.relate);
									width = parseInt((doc.getTextDimensions(item.mini_description)).w);
									if ((width + coords.x) > 550) {			//exceeds horizontal width
										coords.x = 190 + 20;
										if (indx != 0) coords.y += 18;
										maxY2++;
									}
									if (indx != 0) doc.addImage(bullet, coords.x - 12, coords.y - 7, 4, 4);
									des = doc.splitTextToSize(item.mini_description, indx != 0 ? 330 : 345);
									var i = 0;
									while (i < des.length) {
										// doc.text(coords.x, coords.y - 10, coords.x + '|' + width);
										// if (indx == 0) doc.setFontType('bold');
										doc.text(indx == 0 ? coords.x - 15 : coords.x, coords.y, des[i]);
										// if (indx == 0) doc.setFontType('normal');

										if (i != des.length - 1) {
											coords.x = 190 + 20; coords.y += 18;
										}

										i++;
									}

									coords.x += (width + 20);
								});

					coords.x = 45;

					if (maxY > maxY2)
						// coords.y += (maxY * 17 + 3);
						coords.y += (maxY * 13 + 20);
					else
						coords.y += 40;
				});
		}

		function printHighlightedText(coords, statement) {
			// console.log(coords, statement);
			var parsedData = parseTags(statement);

			var words = parsedData.str.split(' ').filter(function (word) { return word; });

			var isBold = 0, mw = 0;
			// coords.y -= 17;

			words.forEach(function (word) {
				switch (word) {
					case '<b>': doc.setFontType("bold"); isBold = 1; break;
					case '<i>': isBold ? doc.setFontType("bolditalic") : doc.setFontType("italic"); break;
					case '</b>': doc.setFontType("normal"); isBold = 0; break;
					case '</i>': doc.setFontType("normal"); break;
					case '<div>': coords.x = 45; coords.y += 17; break;
					case '</div>': break;
					case '<br>': coords.y -= 8; break;
					default:
						if (isBold) mw = doc.getTextDimensions(word).w > doc.getTextWidth(word) ? doc.getTextDimensions(word).w : doc.getTextWidth(word);
						else mw = doc.getTextDimensions(word).w < doc.getTextWidth(word) ? doc.getTextDimensions(word).w : doc.getTextWidth(word);

						if ((coords.x + mw) > 550) {
							coords.x = 45;
							coords.y += 13;
						}
						isBold ? coords.x += 2 : null;
						doc.text(coords.x, coords.y, word);
						coords.x += (mw + (isBold ? 6 : 5));
					// if (isBold) {
					// 	console.log(mw, word, doc.getStringUnitWidth(word) * 11, doc.getTextDimensions(word).w, doc.getTextWidth(word));
					// 	console.log('--------------------------------------');
					// }
				}
			});
		}

		retD.printPDF = function (name, profileData, secPer, totPer, whom, repData, temp_content, competencies, recForManager) {
			var i = 0, j = 0, k = 0, x = 30, y = 45, width, align_center, des, beforeY, maxY, secY;
			cur_time = new Date();

			doc = new jsPDF('p', 'pt', 'a4');
			pg_num = 1;

			if (whom == 2) {
				firstMD = function (index1) {
					var o = 0;
					while (o < profileData[index1].mini_descriptions.length) {
						if (profileData[index1].mini_descriptions[o].assessor_relate != '')
							return o;
						o++;
					}
				}
			}

			//scores
			function scores() {
				if (whom == 2 && repData.assessor.pdf_pages.scores) {
					footer(pg_num);

					var xyz, mxLen;

					//heading
					doc.setTextColor(0, 0, 0);
					doc.setFontSize(14);

					//doc.textWithLink('Click here', x, y, { url: 'http://www.google.com' });
					xyz = doc.splitTextToSize(name + "'s Values, Culture and Leadership Assessment", 515);

					if (xyz.length == 1) {
						width = doc.getTextDimensions(name + "'s Values, Culture and Leadership Assessment");
						//console.log(Math.round(width.w));
						align_center = (535 - Math.round(width.w)) / 2;

						doc.setFontType("bold");
						doc.text(x + align_center, y, name + "'s Values, Culture and Leadership Assessment");
					}
					else if (xyz.length > 1) {
						var c = 0;
						doc.setFontType("bold");
						while (c < xyz.length) {
							width = doc.getTextDimensions(xyz[c]);
							//console.log(Math.round(width.w));
							align_center = (535 - Math.round(width.w)) / 2;

							doc.text(x + align_center, y, xyz[c]);

							y += 15;
							c++;
						}
					}
					var boxX = x, boxY = y + 30;

					doc.setFontType("normal");

					y += 50;
					doc.setFontSize(11);

					doc.setFontType("normal");
					doc.text(50, y, "Position Applied for: ");
					doc.setFontType("bold");
					if (repData.assessor.position) {
						xyz = doc.splitTextToSize(repData.assessor.position, 130);
						doc.text(55 + doc.getTextDimensions("Position Applied for: ").w, y, xyz);

						mxLen = xyz.length;
					}
					else
						mxLen = 1;

					doc.setFontType("normal");
					doc.text(300, y, "Result: ");
					doc.setFontType("bold");
					if (repData.assessor.result)
						doc.text(305 + doc.getTextDimensions("Result: ").w, y, repData.assessor.result);

					var mxLen2 = 0;

					doc.setFontType("normal");
					doc.text(50, y + 14 + (mxLen) * 12, "Experience: ");
					doc.setFontType("bold");
					if (repData.work_details != undefined && repData.work_details.experience) {
						//				doc.text(65+doc.getTextDimensions("Experience: ").w, y+15+(mxLen)*12, repData.work_details.experience);
						xyz = doc.splitTextToSize(repData.work_details.experience, 160);
						doc.text(55 + doc.getTextDimensions("Experience: ").w, y + 15 + (mxLen) * 12, xyz);
						mxLen2 = xyz.length;
					}

					doc.setFontType("normal");
					doc.text(300, y + 14 + (mxLen) * 12, "Enneagram Profile: ");
					doc.setFontType("bold");
					doc.text(305 + doc.getTextDimensions("Enneagram Profile: ").w, y + 15 + (mxLen) * 12, "" + repData.profile.profile_number);


					doc.setFontType("normal");
					doc.text(300, y + 14 + (mxLen + mxLen2) * 12 + 14, "Personal Mastery Level: ");
					doc.setFontType("bold");
					if (repData.assessor.per_mast_lvl) {
						xyz = doc.splitTextToSize(repData.assessor.per_mast_lvl, 130);
						doc.text(303 + doc.getTextDimensions("Personal Mastery Level: ").w, y + 14 + (mxLen + mxLen2) * 12 + 14, xyz);
						if (xyz.length > mxLen2)
							mxLen2 = xyz.length;
					}

					x = 30;
					y += (14 + (mxLen + mxLen2) * 12 + 14);

					y += 45;

					//box start
					doc.setDrawColor(51, 181, 213);
					doc.setLineWidth(2);
					//horizontal lines
					doc.line(boxX, boxY, 565, boxY);
					doc.line(boxX, y - 30, 565, y - 30);
					//vertical lines
					doc.line(boxX, boxY, boxX, y - 30);
					doc.line(565, boxY, 565, y - 30);
					//box end

					//heading
					// doc.setTextColor(256, 256, 256);
					// doc.setFontSize(12);
					// doc.setLineWidth(18);
					// doc.setDrawColor(66, 133, 244);

					// doc.line(x, y - 3, 565, y - 3);
					// width = doc.getTextDimensions("Summary for Management");
					// //console.log(Math.round(width.w));
					// align_center = (535 - Math.round(width.w)) / 2;

					// doc.setFontType("bold");
					// doc.text(x + align_center, y, "Summary for Management");

					// y += 30;
					y += 10;
					x = 45;

					doc.setFontSize(11);
					doc.setTextColor(0, 0, 0);
					doc.setFontType("normal");

					if (repData.assessor.description) {
						var coords = { x: x, y: y };
						printHighlightedText(coords, repData.assessor.description);
						x = coords.x;
						y = coords.y;
					}
					else
						xyz.length = 0;

					// y += ((xyz.length) * 12);
					x = 30;
					// y += 30;
					y += 45;

					//heading
					doc.setTextColor(0, 0, 0);
					doc.setFontSize(12);

					width = doc.getTextDimensions("Scores");
					//console.log(Math.round(width.w));
					align_center = (535 - Math.round(width.w)) / 2;

					doc.setFontType("bold");
					doc.text(x + align_center, y, "Scores");

					doc.setFontSize(11);
					y += 35;

					coords = { x: x, y: y };
					printScoreContent(coords, repData, 'Self-awareness and Clarity', repData.assessor.slf_aware, 0);
					x = coords.x; y = coords.y;

					coords = { x: x, y: y };
					printScoreContent(coords, repData, 'Openness and Self-disclosure', repData.assessor.openness, 1);
					x = coords.x; y = coords.y;

					coords = { x: x, y: y };
					printScoreContent(coords, repData, 'Personal Mastery and Ability to Learn', repData.assessor.per_mast, 2);
					x = coords.x; y = coords.y;

					doc.setFontType("bold");
					doc.text(x + 80, y, "Total Scores:");
					x = 205;
					var ttl = 0;
					if (typeof (repData.assessor.slf_aware) == 'number')
						ttl += repData.assessor.slf_aware;
					if (typeof (repData.assessor.openness) == 'number')
						ttl += repData.assessor.openness;
					if (typeof (repData.assessor.per_mast) == 'number')
						ttl += repData.assessor.per_mast;
					doc.text(x, y, ttl + ' / 9.0');
					x = 270;
					if (repData.assessor.per_mast_lvl) {
						xyz = doc.splitTextToSize(repData.assessor.per_mast_lvl, 290);
						doc.text(x, y, xyz);
					}

					doc.setDrawColor(66, 133, 244);
					var c = 0;
					while (c < repData.assessor.addOnSectionsPDF.scores.length) {
						//temp-on
						doc.addPage();
						pg_num++;
						footer(pg_num);
						x = 30;
						y = 5;
						doc.setFontType("normal");
						doc.setFontSize(12);
						doc.setLineWidth(18);
						doc.setDrawColor(66, 133, 244);
						//temp-off
						doc.setLineWidth(18);
						doc.setTextColor(256, 256, 256);
						x = 30;
						y += 40;

						var tmpY = y;
						if (repData.assessor.addOnSectionsPDF.scores[c].desc)
							tmpY += doc.splitTextToSize(repData.assessor.addOnSectionsPDF.scores[c].desc, 505).length * 12;
						if (tmpY > 750) {	//exceeds page height
							doc.addPage();
							pg_num++;
							footer(pg_num);
							x = 30;
							y = 70;
							doc.setFontType("normal");
							doc.setTextColor(256, 256, 256);
							doc.setDrawColor(66, 133, 244);
							doc.setFontSize(11);
							doc.setLineWidth(18);
						}

						var i = 0;
						xyz = doc.splitTextToSize(repData.assessor.addOnSectionsPDF.scores[c].title, 535);

						beforeY = y;
						while (i < xyz.length) {
							doc.line(x, y - 3, 565, y - 3);
							y += 12;
							i++;
						}
						y = beforeY;

						doc.setFontType("bold");

						i = 0;
						while (i < xyz.length) {
							width = doc.getTextDimensions(xyz[i]);
							align_center = (535 - Math.round(width.w)) / 2;

							doc.text(x + align_center, y, xyz[i]);

							y += 12;
							i++;
						}
						doc.setFontType("normal");
						doc.setTextColor(0, 0, 0);
						doc.setFontSize(11);

						x = 45;
						y += 10;
						i = 0;

						if (repData.assessor.addOnSectionsPDF.scores[c].desc) {
							var coords = { x: x, y: y };
							printHighlightedText(coords, repData.assessor.addOnSectionsPDF.scores[c].desc);
							x = coords.x;
							y = coords.y;

							y += 5;
						}

						c++;
					}

					// if (repData.assessor.role_fitment_description && repData.assessor.pdf_pages.descriptions.role_fitment) {
					// 	x = 30;
					// 	y += 35;
					// 	//role-fitment
					// 	width = doc.getTextDimensions(repData.assessor.role_fitment_title);
					// 	align_center = (535 - Math.round(width.w)) / 2;

					// 	doc.setFontType("bold");
					// 	doc.text(x + align_center, y, repData.assessor.role_fitment_title);

					// 	y += 15;

					// 	doc.setFontSize(11);
					// 	doc.setFontType("normal");

					// 	var parsedData = parseTags(repData.assessor.role_fitment_description);
					// 	var words = parsedData.str.split(' ').filter(function (word) { return word; });
					// 	words.forEach(function (word) {
					// 		switch (word) {
					// 			case '<b>': doc.setFontType("bold"); break;
					// 			case '<i>': doc.setFontType("italic"); break;
					// 			case '</b>': doc.setFontType("normal"); break;
					// 			case '</i>': doc.setFontType("normal"); break;
					// 			case '<div>': x = 30; y += 12; break;
					// 			case '</div>': break;
					// 			case '<br>': break;
					// 			default:
					// 				if ((x + doc.getTextDimensions(word).w) > 565) {
					// 					x = 30;
					// 					y += 12;
					// 				}
					// 				doc.text(x, y, word);
					// 				x += (doc.getTextDimensions(word).w + 3);
					// 		}
					// 	});
					// }
					// if (repData.assessor.reason_for_change_description && repData.assessor.pdf_pages.descriptions.reason) {
					// 	x = 30;
					// 	y += 35;
					// 	//reason for change
					// 	width = doc.getTextDimensions(repData.assessor.reason_for_change_title);
					// 	align_center = (535 - Math.round(width.w)) / 2;

					// 	doc.setFontType("bold");
					// 	doc.text(x + align_center, y, repData.assessor.reason_for_change_title);

					// 	y += 15;

					// 	doc.setFontSize(11);
					// 	doc.setFontType("normal");

					// 	var parsedData = parseTags(repData.assessor.reason_for_change_description);
					// 	var words = parsedData.str.split(' ').filter(function (word) { return word; });
					// 	words.forEach(function (word) {
					// 		switch (word) {
					// 			case '<b>': doc.setFontType("bold"); break;
					// 			case '<i>': doc.setFontType("italic"); break;
					// 			case '</b>': doc.setFontType("normal"); break;
					// 			case '</i>': doc.setFontType("normal"); break;
					// 			case '<div>': x = 30; y += 12; break;
					// 			case '</div>': break;
					// 			case '<br>': break;
					// 			default:
					// 				if ((x + doc.getTextDimensions(word).w) > 565) {
					// 					x = 30;
					// 					y += 12;
					// 				}
					// 				doc.text(x, y, word);
					// 				x += (doc.getTextDimensions(word).w + 3);
					// 		}
					// 	});
					// }
				}
			}

			//paei
			function paei() {
				if (whom == 2 && repData.assessor.pdf_pages.paei) {
					doc.addPage();
					pg_num++;
					x = 30;
					y = 45;
					footer(pg_num);

					var xyz, keyCount = 0;

					//heading
					doc.setFontSize(12);
					doc.setDrawColor(66, 133, 244);
					doc.setTextColor(256, 256, 256);
					doc.setLineWidth(18);
					doc.line(x, y - 3, 565, y - 3);

					width = doc.getTextDimensions(name + "'s Leadership Competencies");
					align_center = (535 - Math.round(width.w)) / 2;

					doc.setFontType("bold");
					doc.text(x + align_center, y, name + "'s Leadership Competencies");

					doc.setFontSize(11);
					doc.setTextColor(0, 0, 0);
					doc.setFontType("normal");

					x = 45;
					y += 30;

					doc.text(x, y, doc.splitTextToSize("iDiscover's Leadership competencies framework is divided into four essential needs of every organization and corresponding leadership activities. These are:", 505));
					y += 31;
					x = 75;
					doc.addImage(bullet, x - 12, y - 7, 4, 4);
					doc.text(x, y, 'Producing');
					doc.setFontType("bold"); x += (doc.getTextDimensions('Producing').w + 3);
					doc.text(x, y, 'Results');
					doc.setFontType("normal");
					x = 280;
					doc.addImage(bullet, x - 12, y - 7, 4, 4);
					doc.text(x, y, 'Entrepreneuring');
					doc.setFontType("bold"); x += (doc.getTextDimensions('Entrepreneuring').w + 3);
					doc.text(x, y, 'Strategy');
					doc.setFontType("normal");
					y += 14;
					x = 75;
					doc.addImage(bullet, x - 12, y - 7, 4, 4);
					doc.text(x, y, 'Administering');
					doc.setFontType("bold"); x += (doc.getTextDimensions('Administering').w + 3);
					doc.text(x, y, 'Process');
					doc.setFontType("normal");
					x = 280;
					doc.addImage(bullet, x - 12, y - 7, 4, 4);
					doc.text(x, y, 'Integrating');
					doc.setFontType("bold"); x += (doc.getTextDimensions('Integrating').w + 3);
					doc.text(x, y, 'People');
					doc.setFontType("normal");
					y += 18;
					x = 45;
					doc.text(x, y, doc.splitTextToSize("When all four roles are properly executed, the organization is healthy and able to be effective and efficient in both short and long run.", 505));

					doc.setFontType("normal");
					// console.log(repData.assessor.score_competencies);
					//0 - A, 1 - I, 2 - E, 3 - P
					for (var zt = 1; zt <= 4; zt++) {
						// console.log(repData.assessor.score_competencies[zt - 1], Array.isArray(repData.assessor.score_competencies[zt - 1]), !repData.assessor.score_competencies[zt - 1]);
						if (Array.isArray(repData.assessor.score_competencies[zt - 1]) || !repData.assessor.score_competencies[zt - 1])
							repData.assessor.score_competencies[zt - 1] = 'l';

						// console.log("-> q" + zt + repData.assessor.score_competencies[zt - 1]);
						doc.addImage(eval("q" + zt + repData.assessor.score_competencies[zt - 1]), 120, 165, 230, 230);
					}

					doc.addImage(main_circle, 120, 165, 230, 230);

					doc.setTextColor(0, 0, 0);

					doc.setFillColor(149, 214, 63);
					doc.rect(400, 215, 20, 20, 'F');

					doc.text(435, 230, 'High');

					doc.setFillColor(255, 226, 42);
					doc.rect(400, 255, 20, 20, 'F');

					doc.text(435, 270, 'Medium');

					doc.setFillColor(251, 164, 64);
					doc.rect(400, 295, 20, 20, 'F');

					doc.text(435, 310, 'Low');

					//table
					x = 60;
					y = 420;

					doc.setFillColor(180, 180, 180);
					doc.setDrawColor(180, 180, 180);

					doc.setLineWidth(1);

					//row1
					doc.setFontSize(11);
					doc.setFontType("bold");

					y += 15;

					doc.text(120, y, 'Competency');			//col1
					doc.text(274, y, 'Score');				//col2
					doc.text(406, y, 'Description');		//col3

					y += 5;
					doc.setFontType("normal");
					doc.setFontSize(10);

					var atX, textX;

					//row2
					doc.line(x, y, 535, y);
					x = 70;
					y += 15;

					//col1
					doc.setFontType("bold");
					doc.text(x, y, '(P)roducing Results');
					doc.setFontType("italic");
					var zyx = doc.splitTextToSize("[Action orientation; Result orientation; Domain/ functional understanding; Problem solving; Independent decision making]", 170);
					doc.text(x, y + 15, zyx);
					maxY = zyx.length * 11 + 24 + y;
					doc.setFontType("normal");

					//col3
					x = 340;
					beforeY = y;

					if (repData.assessor.paei_desc && repData.assessor.paei_desc.p.length)
						for (var pp = 0; pp < repData.assessor.paei_desc.p.length; pp++) {
							var xyz = doc.splitTextToSize(repData.assessor.paei_desc.p[pp].statement, 175);
							doc.text(x, y, "-  " + xyz[0]);
							var lp = 1;
							while (lp < xyz.length) {
								y += 10;
								doc.text(x, y, "    " + xyz[lp]);
								lp++;
							}
							y += 12;
						}

					//col2
					doc.setFontSize(11);
					x = 250;

					if (repData.assessor.score_competencies[3] == 'l') {
						doc.setFillColor(251, 164, 64);
						atX = 280;
						textX = ['0|18|Low'];
					}
					else if (repData.assessor.score_competencies[3] == 'ml') {
						doc.setFillColor(251, 164, 64);
						atX = 274;
						textX = ['0|10|Low to', '-3|23|Medium'];
					}
					else if (repData.assessor.score_competencies[3] == 'm') {
						doc.setFillColor(255, 226, 42);
						atX = 271;
						textX = ['0|18|Medium'];
					}
					else if (repData.assessor.score_competencies[3] == 'hm') {
						doc.setFillColor(149, 214, 63);
						atX = 264;
						textX = ['0|10|Medium to', '15|23|High'];
					}
					else if (repData.assessor.score_competencies[3] == 'h') {
						doc.setFillColor(149, 214, 63);
						atX = 279;
						textX = ['0|18|High'];
					}

					if (maxY <= y) {
						doc.rect(x, beforeY - 15, 80, y - (beforeY - 15), 'F');
					}
					else {
						doc.rect(x, beforeY - 15, 80, maxY - (beforeY - 15), 'F');
						y = maxY;
					}

					textX.forEach(function (word) {
						doc.text(atX + parseInt(word.split('|')[0]), beforeY + parseInt(word.split('|')[1]), word.split('|')[2]);
					});

					doc.line(60, y, 535, y);

					//row3
					// doc.line(x - 10, y, 535, y);
					x = 70;
					y += 15;
					doc.setFontSize(10);

					//col1
					doc.setFontType("bold");
					doc.text(x, y, '(A)dministering Process');
					doc.setFontType("italic");
					var zyx = doc.splitTextToSize("[Time management/ Prioritization; Process-orientation; Planning; Delegating; Monitoring; Attention to details; Data orientation]", 170);
					doc.text(x, y + 15, zyx);
					maxY = zyx.length * 11 + 24 + y;
					doc.setFontType("normal");
					doc.setDrawColor(180, 180, 180);

					//col3
					x = 340;
					beforeY = y;

					if (repData.assessor.paei_desc && repData.assessor.paei_desc.a.length)
						for (var pp = 0; pp < repData.assessor.paei_desc.a.length; pp++) {
							var xyz = doc.splitTextToSize(repData.assessor.paei_desc.a[pp].statement, 175);
							doc.text(x, y, "-  " + xyz[0]);
							var lp = 1;
							while (lp < xyz.length) {
								y += 10;
								doc.text(x, y, "    " + xyz[lp]);
								lp++;
							}
							y += 12;
						}

					//col2
					doc.setFontSize(11);
					x = 250;

					if (repData.assessor.score_competencies[0] == 'l') {
						doc.setFillColor(251, 164, 64);
						atX = 280;
						textX = ['0|18|Low'];
					}
					else if (repData.assessor.score_competencies[0] == 'ml') {
						doc.setFillColor(251, 164, 64);
						atX = 274;
						textX = ['0|10|Low to', '-3|23|Medium'];
					}
					else if (repData.assessor.score_competencies[0] == 'm') {
						doc.setFillColor(255, 226, 42);
						atX = 271;
						textX = ['0|18|Medium'];
					}
					else if (repData.assessor.score_competencies[0] == 'hm') {
						doc.setFillColor(149, 214, 63);
						atX = 264;
						textX = ['0|10|Medium to', '15|23|High'];
					}
					else if (repData.assessor.score_competencies[0] == 'h') {
						doc.setFillColor(149, 214, 63);
						atX = 279;
						textX = ['0|18|High'];
					}

					if (maxY <= y) {
						doc.rect(x, beforeY - 15, 80, y - (beforeY - 15), 'F');
					}
					else {
						doc.rect(x, beforeY - 15, 80, maxY - (beforeY - 15), 'F');
						y = maxY;
					}

					textX.forEach(function (word) {
						doc.text(atX + parseInt(word.split('|')[0]), beforeY + parseInt(word.split('|')[1]), word.split('|')[2]);
					});

					doc.line(60, y, 535, y);

					//row4
					// doc.line(x - 10, y, 535, y);
					x = 70;
					y += 15;

					//calculate length vertically
					var coordY = y;
					var pageShift = false;

					beforeY = y;
					if (repData.assessor.paei_desc && repData.assessor.paei_desc.i.length)
						for (var pp = 0; pp < repData.assessor.paei_desc.e.length; pp++) {
							var xyz = doc.splitTextToSize(repData.assessor.paei_desc.e[pp].statement, 175);

							var lp = 1;
							while (lp < xyz.length) {
								y += 10;

								lp++;
							}
							y += 12;
						}
					if (y > 750) {	//exceeds page height
						doc.setFillColor(180, 180, 180);
						doc.setDrawColor(180, 180, 180);
						doc.rect(60, 420, 475, beforeY - 435, 'FB');
						doc.line(250, 420, 250, beforeY - 15);				//middle-left vertical line
						doc.line(330, 420, 330, beforeY - 15);				//middle-right vertical line

						doc.addPage();
						pg_num++;
						footer(pg_num);
						x = 70;
						y = 70;
						coordY = 70;
						pageShift = true;
						// doc.setFontType("normal");
						doc.setTextColor(0, 0, 0);
						doc.setFontSize(10);
					}
					else
						y = beforeY;

					//col1
					doc.setFontSize(10);
					doc.setFontType("bold");
					doc.text(x, y, '(E)ntrepreneuring Strategy');
					doc.setFontType("italic");
					var zyx = doc.splitTextToSize("[Strategy; Big picture thinking; Creativity/ Innovation; Risk taking; Optimism]", 170);
					doc.text(x, y + 15, zyx);
					maxY = zyx.length * 11 + 24 + y;
					doc.setFontType("normal");
					doc.setDrawColor(180, 180, 180);

					//col3
					x = 340;
					beforeY = y;

					if (repData.assessor.paei_desc && repData.assessor.paei_desc.e.length)
						for (var pp = 0; pp < repData.assessor.paei_desc.e.length; pp++) {
							var xyz = doc.splitTextToSize(repData.assessor.paei_desc.e[pp].statement, 175);
							doc.text(x, y, "-  " + xyz[0]);
							var lp = 1;
							while (lp < xyz.length) {
								y += 10;
								doc.text(x, y, "    " + xyz[lp]);
								lp++;
							}
							y += 12;
						}

					//col2
					doc.setFontSize(11);
					x = 250;

					if (repData.assessor.score_competencies[2] == 'l') {
						doc.setFillColor(251, 164, 64);
						atX = 280;
						textX = ['0|18|Low'];
					}
					else if (repData.assessor.score_competencies[2] == 'ml') {
						doc.setFillColor(251, 164, 64);
						atX = 274;
						textX = ['0|10|Low to', '-3|23|Medium'];
					}
					else if (repData.assessor.score_competencies[2] == 'm') {
						doc.setFillColor(255, 226, 42);
						atX = 271;
						textX = ['0|18|Medium'];
					}
					else if (repData.assessor.score_competencies[2] == 'hm') {
						doc.setFillColor(149, 214, 63);
						atX = 264;
						textX = ['0|10|Medium to', '15|23|High'];
					}
					else if (repData.assessor.score_competencies[2] == 'h') {
						doc.setFillColor(149, 214, 63);
						atX = 279;
						textX = ['0|18|High'];
					}

					if (maxY <= y) {
						doc.rect(x, beforeY - 15, 80, y - (beforeY - 15), 'F');
					}
					else {
						doc.rect(x, beforeY - 15, 80, maxY - (beforeY - 15), 'F');
						y = maxY;
					}

					textX.forEach(function (word) {
						doc.text(atX + parseInt(word.split('|')[0]), beforeY + parseInt(word.split('|')[1]), word.split('|')[2]);
					});

					doc.line(60, y, 535, y);

					//row5
					// doc.line(x - 10, y, 535, y);
					x = 70;
					y += 15;
					// pageShift = false;

					//calculate length vertically
					beforeY = y;
					if (repData.assessor.paei_desc && repData.assessor.paei_desc.i.length)
						for (var pp = 0; pp < repData.assessor.paei_desc.i.length; pp++) {
							var xyz = doc.splitTextToSize(repData.assessor.paei_desc.i[pp].statement, 175);

							var lp = 1;
							while (lp < xyz.length) {
								y += 10;

								lp++;
							}
							y += 12;
						}
					if (y > 750) {	//exceeds page height
						doc.setFillColor(180, 180, 180);
						doc.setDrawColor(180, 180, 180);
						doc.rect(60, 420, 475, beforeY - 435, 'FB');
						doc.line(250, 420, 250, beforeY - 15);				//middle-left vertical line
						doc.line(330, 420, 330, beforeY - 15);				//middle-right vertical line

						doc.addPage();
						pg_num++;
						footer(pg_num);
						x = 70;
						y = 70;
						coordY = 70;
						pageShift = true;
						// doc.setFontType("normal");
						doc.setTextColor(0, 0, 0);
						doc.setFontSize(10);
					}
					else
						y = beforeY;

					//col1
					doc.setFontSize(10);
					doc.setFontType("bold");
					doc.text(x, y, '(I)ntegrating People');
					doc.setFontType("italic");
					var zyx = doc.splitTextToSize("[Giving and taking feedback; Team player; Mentoring and coaching; Conflict management]", 170);
					doc.text(x, y + 15, zyx);
					maxY = zyx.length * 11 + 24 + y;
					doc.setFontType("normal");
					doc.setDrawColor(180, 180, 180);

					//col3
					x = 340;
					beforeY = y;

					if (repData.assessor.paei_desc && repData.assessor.paei_desc.i.length)
						for (var pp = 0; pp < repData.assessor.paei_desc.i.length; pp++) {
							var xyz = doc.splitTextToSize(repData.assessor.paei_desc.i[pp].statement, 175);
							doc.text(x, y, "-  " + xyz[0]);
							var lp = 1;
							while (lp < xyz.length) {
								y += 10;
								doc.text(x, y, "    " + xyz[lp]);
								lp++;
							}
							y += 12;
						}

					//col2
					doc.setFontSize(11);
					x = 250;

					if (repData.assessor.score_competencies[1] == 'l') {
						doc.setFillColor(251, 164, 64);
						atX = 280;
						textX = ['0|18|Low'];
					}
					else if (repData.assessor.score_competencies[1] == 'ml') {
						doc.setFillColor(251, 164, 64);
						atX = 274;
						textX = ['0|10|Low to', '-3|23|Medium'];
					}
					else if (repData.assessor.score_competencies[1] == 'm') {
						doc.setFillColor(255, 226, 42);
						atX = 271;
						textX = ['0|18|Medium'];
					}
					else if (repData.assessor.score_competencies[1] == 'hm') {
						doc.setFillColor(149, 214, 63);
						atX = 264;
						textX = ['0|10|Medium to', '15|23|High'];
					}
					else if (repData.assessor.score_competencies[1] == 'h') {
						doc.setFillColor(149, 214, 63);
						atX = 279;
						textX = ['0|18|High'];
					}

					if (maxY <= y) {
						doc.rect(x, beforeY - 15, 80, y - (beforeY - 15), 'F');
					}
					else {
						doc.rect(x, beforeY - 15, 80, maxY - (beforeY - 15), 'F');
						y = maxY;
					}

					textX.forEach(function (word) {
						doc.text(atX + parseInt(word.split('|')[0]), beforeY + parseInt(word.split('|')[1]), word.split('|')[2]);
					});

					//table box
					doc.setFillColor(180, 180, 180);
					doc.setDrawColor(180, 180, 180);

					doc.rect(60, !pageShift ? 420 : 55, 475, !pageShift ? y - 420 : y - 55, 'FB');

					doc.line(250, !pageShift ? 420 : 55, 250, y);				//middle-left vertical line
					doc.line(330, !pageShift ? 420 : 55, 330, y);				//middle-right vertical line


					var c = 0;
					while (c < repData.assessor.addOnSectionsPDF.paei.length) {
						doc.setLineWidth(18);
						doc.setTextColor(256, 256, 256);
						x = 30;
						y += 40;

						var tmpY = y;
						if (repData.assessor.addOnSectionsPDF.paei[c].desc)
							tmpY += doc.splitTextToSize(repData.assessor.addOnSectionsPDF.paei[c].desc, 505).length * 12;
						if (tmpY > 750) {	//exceeds page height
							doc.addPage();
							pg_num++;
							footer(pg_num);
							x = 30;
							y = 70;
							doc.setFontType("normal");
							doc.setTextColor(256, 256, 256);
							doc.setFontSize(11);
							doc.setLineWidth(18);
						}

						var i = 0;
						xyz = doc.splitTextToSize(repData.assessor.addOnSectionsPDF.paei[c].title, 535);

						beforeY = y;
						while (i < xyz.length) {
							doc.line(x, y - 3, 565, y - 3);
							y += 12;
							i++;
						}
						y = beforeY;

						doc.setFontType("bold");

						i = 0;
						while (i < xyz.length) {
							width = doc.getTextDimensions(xyz[i]);
							align_center = (535 - Math.round(width.w)) / 2;

							doc.text(x + align_center, y, xyz[i]);

							y += 12;
							i++;
						}
						doc.setFontType("normal");
						doc.setTextColor(0, 0, 0);

						x = 45;
						y += 10;
						i = 0;

						if (repData.assessor.addOnSectionsPDF.paei[c].desc) {
							var coords = { x: x, y: y };
							printHighlightedText(coords, repData.assessor.addOnSectionsPDF.paei[c].desc);
							x = coords.x;
							y = coords.y;

							y += 5;
						}

						c++;
					}
				}
			}

			//specific competencies
			function specific_competency() {
				if (whom == 2 && repData.assessor.pdf_pages.specific_competency) {
					doc.addPage();
					pg_num++;
					x = 30;
					y = 45;
					footer(pg_num);

					var xyz, keyCount = 0;

					//heading
					doc.setFontSize(12);
					doc.setLineWidth(18);
					doc.setDrawColor(66, 133, 244);
					doc.setTextColor(256, 256, 256);

					doc.line(x, y - 3, 565, y - 3);

					width = doc.getTextDimensions('Specific Competencies Requested by Manager');
					align_center = (535 - Math.round(width.w)) / 2;

					doc.setFontType("bold");
					doc.text(x + align_center, y, 'Specific Competencies Requested by Manager');

					doc.setFontType("normal");
					doc.setDrawColor(180, 180, 180);
					doc.setTextColor(0, 0, 0);

					y += 35;

					repData.assessor.specific_competency.forEach(function (item, indx) {
						x = 45;

						doc.setFontType("bold");
						doc.text(x, y, item['competency']);
						doc.setFontType("normal");

						x = 60;
						y += 25;
						doc.setFontSize(11);

						switch (item['score']) {
							case 'h': doc.text(x, y + 11, 'High'); break;
							case 'hm': doc.text(x, y + 11, 'Medium to High'); break;
							case 'm': doc.text(x, y + 11, 'Medium'); break;
							case 'ml': doc.text(x, y + 11, 'Low to Medium'); break;
							default: doc.text(x, y + 11, 'Low');
						}

						x = 200;
						y += 10;
						doc.setDrawColor(208, 208, 208);

						//vertical line
						doc.setFontSize(9);
						doc.setTextColor(208, 208, 208);
						doc.setLineWidth(1);
						doc.line(x, y - 19, x, y + 11); doc.text(x - 10, y - 22, 'Low');
						doc.line(x + 165, y - 19, x + 165, y + 11); doc.text(x + 148, y - 22, 'Medium');
						doc.line(x + 330, y - 19, x + 330, y + 11); doc.text(x + 320, y - 22, 'High');
						doc.setFontSize(11);
						doc.setTextColor(0, 0, 0);

						//horizontal line (bg)
						doc.setLineWidth(8);
						doc.line(x, y - 4, x + 330, y - 4);

						switch (item['score']) {
							case 'h':
								doc.setDrawColor(0, 200, 81);			//GREEN
								doc.line(x, y - 4, x + 330, y - 4);
								break;
							case 'hm':
								doc.setDrawColor(0, 200, 81);			//GREEN
								doc.line(x, y - 4, x + 247.5, y - 4);
								break;
							case 'm':
								doc.setDrawColor(255, 152, 0);			//YELLOW
								doc.line(x, y - 4, x + 165, y - 4);
								break;
							case 'ml':
								doc.setDrawColor(255, 68, 68);			//ORANGE
								doc.line(x, y - 4, x + 82.5, y - 4);
								break;
							default:
								doc.setDrawColor(255, 68, 68);			//ORANGE
								doc.line(x, y - 4, x + 41, y - 4);
						}

						// doc.line(x, y - 4, x + (repData.assessor.openness * 110), y - 4);

						// y += 25;
						doc.setLineWidth(1);
						doc.setDrawColor(208, 208, 208);
						// doc.line(60, y, 535, y);

						//desc
						x = 75;
						y += 30;

						xyz = doc.splitTextToSize(item['description'] || '', 445);
						doc.text(x, y, xyz);

						if (indx != repData.assessor.specific_competency.length - 1) {
							y += (20 + (xyz.length - 1) * 13);


							if ((y + 90 + doc.splitTextToSize(repData.assessor.specific_competency[indx + 1]['description']).length * 13) > 750) {	//exceeds page height
								doc.addPage();
								pg_num++;
								footer(pg_num);
								x = 30;
								y = 70;
								doc.setFontType("normal");
								doc.setTextColor(0, 0, 0);
							}
							else {
								doc.line(30, y, 565, y);
								y += 25;
							}
							doc.setFontSize(12);

						}
					});
				}
			}

			//profile views - section 2
			function values_strengths() {
				if (whom == 2 && repData.assessor.pdf_pages.values_strengths) {
					if (repData.assessor.pdf_pages.scores) {
						doc.addPage();
						pg_num++;
						x = 30;
						y = 45;
					}

					footer(pg_num);

					var xyz, keyCount = 0;

					//heading
					// doc.setTextColor(0, 0, 0);
					// doc.setFontSize(14);

					// width = doc.getTextDimensions(name + "'s Profile");
					// align_center = (535 - Math.round(width.w)) / 2;

					// doc.setFontType("bold");
					// doc.text(x + align_center, y, name + "'s Profile");

					doc.setFontType("normal");

					doc.setLineWidth(18);
					doc.setDrawColor(66, 133, 244);
					doc.setFontSize(11);

					// y += 50;
					// x = 110;

					//header line
					// doc.setFillColor(0, 0, 0);
					// doc.rect(x - 20, y - 10, 10, 10, 'F');
					// doc.text(x, y, "Relate Strongly/Partially");
					// x += (doc.getTextDimensions("Relate Strongly/Partially").w + 40);
					// doc.setFillColor(0, 200, 81);
					// doc.rect(x - 20, y - 10, 10, 10, 'F');
					// doc.text(x, y, "Improved Over Time");
					// x += (doc.getTextDimensions("Improved Over Time").w + 40);
					// doc.setFillColor(66, 133, 244);
					// doc.rect(x - 20, y - 10, 10, 10, 'F');
					// doc.text(x, y, "Never Exhibited");

					// y += 35;
					// x = 30;

					var rowMaxY = 70;

					keyCount = 0;

					//SECTION 2
					i = 0;
					doc.setTextColor(256, 256, 256);
					xyz = doc.splitTextToSize(name + "'s Key Strengths", 535);

					beforeY = y;
					while (i < xyz.length) {
						doc.line(x, y - 3, 565, y - 3);
						y += 13;
						i++;
					}
					y = beforeY;

					doc.setFontType("bold");

					i = 0;
					doc.setFontSize(12);

					while (i < xyz.length) {
						width = doc.getTextDimensions(xyz[i]);
						align_center = (535 - Math.round(width.w)) / 2;

						doc.text(x + align_center, y, xyz[i]);

						y += 13;
						i++;
					}
					doc.setFontType("normal");
					doc.setTextColor(0, 0, 0);
					doc.setFontSize(11);

					i = 0;
					rowMaxY = 70;

					x = 45;
					y += 25;

					var coords = { x: x, y: y };
					executeAutomatedProfile(coords, repData.assessor.profile_content, '2');
					x = coords.x; y = coords.y;

					doc.setDrawColor(66, 133, 244);
					var c = 0;
					while (c < repData.assessor.addOnSectionsPDF.values_strengths.length) {
						doc.setLineWidth(18);
						doc.setTextColor(256, 256, 256);
						x = 30;
						y += 40;

						var tmpY = y;
						if (repData.assessor.addOnSectionsPDF.values_strengths[c].desc)
							tmpY += doc.splitTextToSize(repData.assessor.addOnSectionsPDF.values_strengths[c].desc, 505).length * 12;
						if (tmpY > 750) {	//exceeds page height
							doc.addPage();
							pg_num++;
							footer(pg_num);
							x = 30;
							y = 70;
							doc.setFontType("normal");
							doc.setTextColor(256, 256, 256);
							doc.setFontSize(11);
							doc.setLineWidth(18);
						}

						var i = 0;
						xyz = doc.splitTextToSize(repData.assessor.addOnSectionsPDF.values_strengths[c].title, 535);

						beforeY = y;
						while (i < xyz.length) {
							doc.line(x, y - 3, 565, y - 3);
							y += 12;
							i++;
						}
						y = beforeY;

						doc.setFontType("bold");

						i = 0;
						while (i < xyz.length) {
							width = doc.getTextDimensions(xyz[i]);
							align_center = (535 - Math.round(width.w)) / 2;

							doc.text(x + align_center, y, xyz[i]);

							y += 12;
							i++;
						}
						doc.setFontType("normal");
						doc.setTextColor(0, 0, 0);

						x = 45;
						y += 10;
						i = 0;

						if (repData.assessor.addOnSectionsPDF.values_strengths[c].desc) {
							var coords = { x: x, y: y };
							printHighlightedText(coords, repData.assessor.addOnSectionsPDF.values_strengths[c].desc);
							x = coords.x;
							y = coords.y;

							y += 5;
						}

						c++;
					}
				}
			}

			//profile views - section 3
			function learning_need() {
				if (whom == 2 && repData.assessor.pdf_pages.learning_need) {
					if (repData.assessor.pdf_pages.scores) {
						doc.addPage();
						pg_num++;
						x = 30;
						y = 45;
					}

					footer(pg_num);

					var xyz, keyCount = 0;

					//heading
					// doc.setTextColor(0, 0, 0);
					// doc.setFontSize(14);

					// width = doc.getTextDimensions(name + "'s Profile");
					// align_center = (535 - Math.round(width.w)) / 2;

					// doc.setFontType("bold");
					// doc.text(x + align_center, y, name + "'s Profile");

					doc.setFontType("normal");

					doc.setLineWidth(18);
					doc.setDrawColor(255, 136, 0);
					doc.setFontSize(11);

					// y += 50;
					// x = 110;

					//header line
					// doc.setFillColor(0, 0, 0);
					// doc.rect(x - 20, y - 10, 10, 10, 'F');
					// doc.text(x, y, "Relate Strongly/Partially");
					// x += (doc.getTextDimensions("Relate Strongly/Partially").w + 40);
					// doc.setFillColor(0, 200, 81);
					// doc.rect(x - 20, y - 10, 10, 10, 'F');
					// doc.text(x, y, "Improved Over Time");
					// x += (doc.getTextDimensions("Improved Over Time").w + 40);
					// doc.setFillColor(66, 133, 244);
					// doc.rect(x - 20, y - 10, 10, 10, 'F');
					// doc.text(x, y, "Never Exhibited");

					// y += 35;
					// x = 30;

					var rowMaxY = 70;

					keyCount = 0;

					//SECTION 3
					i = 0;
					doc.setTextColor(256, 256, 256);
					xyz = doc.splitTextToSize(name + "'s Learning Needs", 535);

					beforeY = y;
					while (i < xyz.length) {
						doc.line(x, y - 3, 565, y - 3);
						y += 13;
						i++;
					}
					y = beforeY;

					doc.setFontType("bold");

					i = 0;
					doc.setFontSize(12);

					while (i < xyz.length) {
						width = doc.getTextDimensions(xyz[i]);
						align_center = (535 - Math.round(width.w)) / 2;

						doc.text(x + align_center, y, xyz[i]);

						y += 13;
						i++;
					}
					doc.setFontType("normal");
					doc.setTextColor(0, 0, 0);
					doc.setFontSize(11);

					i = 0;
					rowMaxY = 70;

					x = 45;
					y += 25;

					var coords = { x: x, y: y };
					executeAutomatedProfile(coords, repData.assessor.profile_content, '3');
					x = coords.x; y = coords.y;

					doc.setDrawColor(66, 133, 244);
					var c = 0;
					while (c < repData.assessor.addOnSectionsPDF.learning_need.length) {
						doc.setLineWidth(18);
						doc.setTextColor(256, 256, 256);
						x = 30;
						y += 40;

						var tmpY = y;
						if (repData.assessor.addOnSectionsPDF.learning_need[c].desc)
							tmpY += doc.splitTextToSize(repData.assessor.addOnSectionsPDF.learning_need[c].desc, 505).length * 12;
						if (tmpY > 750) {	//exceeds page height
							doc.addPage();
							pg_num++;
							footer(pg_num);
							x = 30;
							y = 70;
							doc.setFontType("normal");
							doc.setTextColor(256, 256, 256);
							doc.setFontSize(11);
							doc.setLineWidth(18);
						}

						var i = 0;
						xyz = doc.splitTextToSize(repData.assessor.addOnSectionsPDF.learning_need[c].title, 535);

						beforeY = y;
						while (i < xyz.length) {
							doc.line(x, y - 3, 565, y - 3);
							y += 12;
							i++;
						}
						y = beforeY;

						doc.setFontType("bold");

						i = 0;
						while (i < xyz.length) {
							width = doc.getTextDimensions(xyz[i]);
							align_center = (535 - Math.round(width.w)) / 2;

							doc.text(x + align_center, y, xyz[i]);

							y += 12;
							i++;
						}
						doc.setFontType("normal");
						doc.setTextColor(0, 0, 0);

						x = 45;
						y += 10;
						i = 0;

						if (repData.assessor.addOnSectionsPDF.learning_need[c].desc) {
							var coords = { x: x, y: y };
							printHighlightedText(coords, repData.assessor.addOnSectionsPDF.learning_need[c].desc);
							x = coords.x;
							y = coords.y;

							y += 5;
						}

						c++;
					}
				}
			}

			//profile views - section 1 && role_fitment
			function values_role_fitment() {
				if (whom == 2 && repData.assessor.pdf_pages.values_role_fitment) {
					doc.addPage();
					pg_num++;
					x = 30;
					y = 45;

					footer(pg_num);

					doc.setLineWidth(18);

					var xyz, keyCount = 0;

					if (profileData.filter(function (item, i) { return (profileData[i].keyword_id[5] == 1 && profileData[i].assessor_key_rating != 0 && profileData[i].assessor_checkbox); }).length > 0) {

						//heading
						doc.setTextColor(0, 0, 0);
						doc.setFontSize(14);

						width = doc.getTextDimensions(name + "'s Profile");
						align_center = (535 - Math.round(width.w)) / 2;

						doc.setFontType("bold");
						doc.text(x + align_center, y, name + "'s Profile");

						doc.setFontType("normal");

						doc.setDrawColor(66, 133, 244);

						y += 50;

						doc.addImage(stronglyP, 100, y - 25, 100, 25);
						doc.addImage(partiallyP, 250, y - 25, 100, 25);
						doc.addImage(weaklyP, 400, y - 25, 100, 25);

						y += 35;
						doc.setFontSize(11);

						var rowMaxY = 70;

						// y += 110;
						// y = rowMaxY > 70 ? y + rowMaxY - 80 : y;
						// x = 30;
						keyCount = 0;

						//SECTION 2
						i = 0;
						xyz = doc.splitTextToSize("Values & Work Culture Preferences", 535);

						beforeY = y;
						while (i < xyz.length) {
							doc.line(x, y - 3, 565, y - 3);
							y += 13;
							i++;
						}
						y = beforeY;

						doc.setFontType("bold");
						doc.setTextColor(0, 0, 0);

						i = 0;
						doc.setFontSize(12);

						while (i < xyz.length) {
							width = doc.getTextDimensions(xyz[i]);
							align_center = (535 - Math.round(width.w)) / 2;

							doc.text(x + align_center, y, xyz[i]);

							y += 13;
							i++;
						}
						doc.setFontType("normal");
						doc.setTextColor(0, 0, 0);
						doc.setFontSize(11);

						i = 0;
						rowMaxY = 70;

						for (i in profileData) {
							if (profileData[i].keyword_id[5] == 1 && profileData[i].assessor_key_rating != 0 && profileData[i].assessor_checkbox) {
								keyCount++;
							}
						}

						for (i in profileData) {
							if (profileData[i].keyword_id[5] == 1 && profileData[i].assessor_key_rating != 0 && profileData[i].assessor_checkbox) {
								//if exceeds horizontally
								if (x > 565) {
									y += 90;
									y = rowMaxY > 70 ? y + rowMaxY - 85 : y;
									x = 30;
									rowMaxY = 70;
								}

								//horizontal center align if 1 keyword left
								if (x == 30 && keyCount == 1) {
									x += 180;
								}

								//horizontal center align if 2 keywords left
								if (x == 30 && keyCount == 2) {
									x += 90;
								}

								beforeY = y;

								//image add
								if (profileData[i].assessor_key_rating >= 0 && profileData[i].assessor_key_rating <= 0.5) {
									xyz = doc.splitTextToSize(profileData[i].keyword, 105).length * 12 + doc.splitTextToSize(profileData[i].assessor_report_keyword, 105).length * 11;

									if (xyz <= 53) {
										doc.addImage(contentBox, x, y, 175, 70);
										doc.addImage(low, x + 10, y + 13, 40, 40);
										rowMaxY = rowMaxY < 70 ? 70 : rowMaxY;
									}

									else {
										doc.addImage(contentBox, x, y, 175, 70 + (xyz - 48));
										doc.addImage(low, x + 10, y + 13 + ((xyz - 48) / 2), 40, 40);
										rowMaxY = rowMaxY < 70 + (xyz - 48) ? (70 + (xyz - 48)) : rowMaxY;
									}

								}
								else if (profileData[i].assessor_key_rating > 0.5 && profileData[i].assessor_key_rating <= 1) {
									xyz = doc.splitTextToSize(profileData[i].keyword, 105).length * 12 + doc.splitTextToSize(profileData[i].assessor_report_keyword, 105).length * 11;

									if (xyz <= 53) {
										doc.addImage(contentBox, x, y, 175, 70);
										doc.addImage(med, x + 10, y + 13, 40, 40);
										rowMaxY = rowMaxY < 70 ? 70 : rowMaxY;
									}

									else {
										doc.addImage(contentBox, x, y, 175, 70 + (xyz - 48));
										doc.addImage(med, x + 10, y + 13 + ((xyz - 48) / 2), 40, 40);
										rowMaxY = rowMaxY < 70 + (xyz - 48) ? (70 + (xyz - 48)) : rowMaxY;
									}
								}
								else {
									xyz = doc.splitTextToSize(profileData[i].keyword, 105).length * 12 + doc.splitTextToSize(profileData[i].assessor_report_keyword, 105).length * 11;

									if (xyz <= 53) {
										doc.addImage(contentBox, x, y, 175, 70);
										doc.addImage(high, x + 10, y + 13, 40, 40);
										rowMaxY = rowMaxY < 70 ? 70 : rowMaxY;
									}

									else {
										doc.addImage(contentBox, x, y, 175, 70 + (xyz - 48));
										doc.addImage(high, x + 10, y + 13 + ((xyz - 48) / 2), 40, 40);
										rowMaxY = rowMaxY < 70 + (xyz - 48) ? (70 + (xyz - 48)) : rowMaxY;
									}
								}

								//vertical align
								if (xyz <= 45)
									y += ((50 - xyz) / 2);

								//keyword
								doc.setFontType("bold");
								doc.setFontSize(11);

								des = doc.splitTextToSize(profileData[i].keyword, 105);

								var c = 0;
								secY = y + 18;
								while (c < des.length) {
									width = doc.getTextDimensions(des[c]);
									align_center = (105 - Math.round(width.w)) / 2;

									doc.text(x + align_center + 60, secY, des[c]);

									secY += 10;
									c++;
								}

								if (des.length >= 1)
									y = y + ((des.length) * 12);

								//mini-description
								doc.setFontType("normal");
								doc.setFontSize(10);

								des = doc.splitTextToSize(profileData[i].assessor_report_keyword, 105);

								c = 0;
								secY = y + 18;
								while (c < des.length) {
									width = doc.getTextDimensions(des[c]);
									align_center = (105 - Math.round(width.w)) / 2;

									doc.text(x + align_center + 60, secY, des[c]);

									secY += 10;
									c++;
								}

								y = beforeY;
								x += 180;
								keyCount--;
							}
						}

						x = 30;
						y += 110;
						y = rowMaxY > 70 ? y + rowMaxY - 80 : y;
					}

					//Role Fitment
					const filteredSuitable = repData.assessor.role_fitment.suitable_work.filter(function (item) { return item.selected; });
					const filteredDifficult = repData.assessor.role_fitment.difficult_work.filter(function (item) { return item.selected; });
					if (filteredSuitable.length > 0 || filteredDifficult.length > 0) {
						i = 0;
						xyz = doc.splitTextToSize("Role Fitment", 535);

						beforeY = y;
						while (i < xyz.length) {
							doc.line(x, y - 3, 565, y - 3);
							y += 13;
							i++;
						}
						y = beforeY;

						doc.setFontType("bold");
						doc.setTextColor(0, 0, 0);

						i = 0;
						doc.setFontSize(12);

						while (i < xyz.length) {
							width = doc.getTextDimensions(xyz[i]);
							align_center = (535 - Math.round(width.w)) / 2;

							doc.text(x + align_center, y, xyz[i]);

							y += 13;
							i++;
						}
						doc.setFontType("normal");
						doc.setTextColor(0, 0, 0);

						x = 42;
						y += 18;

						if (filteredSuitable.length > 0) {
							doc.setFontSize(12);
							doc.text(x, y, "Suitable Work Settings");
							doc.setFontSize(11);
							y += 18;
							x = 54;

							filteredSuitable.forEach(function (item) {
								width = parseInt((doc.getTextDimensions(item.statement)).w);

								doc.addImage(bullet, x - 12, y - 7, 4, 4);
								des = doc.splitTextToSize(item.statement, 495);
								var i = 0;
								while (i < des.length) {
									doc.text(x, y, des[i]);

									if (i != des.length - 1) {
										y += 17;
									}

									i++;
								}

								y += 17;
								i++;
							});

							x = 42;
							y += 18;
						}

						if (filteredDifficult.length > 0) {
							doc.setFontSize(12);
							doc.text(x, y, "Difficult Work Settings");
							doc.setFontSize(11);
							y += 18;
							x = 54;

							filteredDifficult.forEach(function (item) {
								width = parseInt((doc.getTextDimensions(item.statement)).w);

								doc.addImage(bullet, x - 12, y - 7, 4, 4);
								des = doc.splitTextToSize(item.statement, 495);
								var i = 0;
								while (i < des.length) {
									doc.text(x, y, des[i]);

									if (i != des.length - 1) {
										y += 17;
									}

									i++;
								}

								y += 17;
								i++;
							});
						}
					}

					doc.setDrawColor(66, 133, 244);
					var c = 0;
					while (c < repData.assessor.addOnSectionsPDF.values_role_fitment.length) {
						doc.setLineWidth(18);
						doc.setTextColor(256, 256, 256);
						x = 30;
						y += 40;

						var tmpY = y;
						if (repData.assessor.addOnSectionsPDF.values_role_fitment[c].desc)
							tmpY += doc.splitTextToSize(repData.assessor.addOnSectionsPDF.values_role_fitment[c].desc, 505).length * 12;
						if (tmpY > 750) {	//exceeds page height
							doc.addPage();
							pg_num++;
							footer(pg_num);
							x = 30;
							y = 70;
							doc.setFontType("normal");
							doc.setTextColor(256, 256, 256);
							doc.setFontSize(11);
							doc.setLineWidth(18);
						}

						var i = 0;
						xyz = doc.splitTextToSize(repData.assessor.addOnSectionsPDF.values_role_fitment[c].title, 535);

						beforeY = y;
						while (i < xyz.length) {
							doc.line(x, y - 3, 565, y - 3);
							y += 12;
							i++;
						}
						y = beforeY;

						doc.setFontType("bold");

						i = 0;
						while (i < xyz.length) {
							width = doc.getTextDimensions(xyz[i]);
							align_center = (535 - Math.round(width.w)) / 2;

							doc.text(x + align_center, y, xyz[i]);

							y += 12;
							i++;
						}
						doc.setFontType("normal");
						doc.setTextColor(0, 0, 0);

						x = 45;
						y += 10;
						i = 0;

						if (repData.assessor.addOnSectionsPDF.values_role_fitment[c].desc) {
							var coords = { x: x, y: y };
							printHighlightedText(coords, repData.assessor.addOnSectionsPDF.values_role_fitment[c].desc);
							x = coords.x;
							y = coords.y;

							y += 5;
						}

						c++;
					}
				}
			}

			//Measure 1 - Personal Mastery
			function pm_m1() {
				if (whom == 2 && repData.assessor.pdf_pages.pm_m1) {

					doc.addPage();
					pg_num++;
					x = 30;
					y = 45;
					footer(pg_num);

					//RR heading
					doc.setTextColor(0, 0, 0);
					doc.setFontSize(14);
					doc.setFontType("bold");

					width = doc.getTextDimensions(name + "'s Personal Mastery Levels");
					align_center = (535 - Math.round(width.w)) / 2;

					doc.text(x + align_center, y, name + "'s Personal Mastery Levels");
					y += 30;

					doc.setFontType("normal");
					doc.setTextColor(128, 128, 128);
					doc.setFontSize(11);
					des = doc.splitTextToSize("Reactive-Responsive levels provides a measure of our growth trajectory. As we become more self-aware and self-observing, we grow from lower levels of consciousness (Reactive level) to higher levels of our consciousness (Responsive level).", 535);
					doc.text(x, y, des[0]);
					doc.text(x + 30, y + 12, des[1]);
					doc.text(x + 180, y + 24, des[2]);

					//console.log(des.length);
					y = y + ((des.length) * 12);
					y += 20;

					des = doc.splitTextToSize(name + " is at '" + repData.assessor.per_mast_lvl + "' Personal Mastery level.", 535);
					i = 0;
					while (i < des.length) {
						doc.text(x, y, des[i]);
						y += 12;
						i++;
					}
					y += 15;

					doc.text(x, y, "Below charts reflect candidate's:"); y += 18;
					doc.text(x, y, "  -  Measure 1: Current Personal Mastery Level"); y += 12;
					doc.text(x, y, "  -  Measure 2: Future Growth Potential"); y += 12;
					doc.text(x, y, "  -  Measure 3: Growth over last few years");

					y += 25;
					doc.setFontType('bold');
					doc.text(x, y, "Definitions of Personal Mastery Levels:"); y += 18;

					doc.text(x + 15, y, "Responsive");
					doc.setFontType('normal');
					doc.text(x + 90, y, doc.splitTextToSize("High level of personal mastery; Reflective and committed to self- development.", 430));
					y += 30;

					doc.setFontType('bold');
					doc.text(x + 15, y, "Moderate");
					doc.setFontType('normal');
					doc.text(x + 90, y, doc.splitTextToSize("Moderate level of personal mastery; Can improve and grow if given constructive feedback and learning space.", 430));
					y += 30;

					doc.setFontType('bold');
					doc.text(x + 15, y, "Reactive");
					doc.setFontType('normal');
					doc.text(x + 90, y, doc.splitTextToSize("Low level of personal mastery; Rigid in his attitude to change; Not shown any significant personal growth in the past.", 430));


					y = 370;
					doc.setFontType('bold');

					align_center = (535 - Math.round(doc.getTextDimensions("MEASURE 1 :").w)) / 2;
					doc.text(x + align_center, y, "MEASURE 1 :");
					y += 13;
					align_center = (535 - Math.round(doc.getTextDimensions("CURRENT PERSONAL MASTERY LEVEL").w)) / 2;
					doc.text(x + align_center, y, "CURRENT PERSONAL MASTERY LEVEL");

					doc.setFontType('normal');
					y = 400;

					x = 30;
					x += 80;

					doc.setTextColor(0, 0, 0);

					doc.setFillColor(221, 255, 165);
					doc.rect(x, y, 280, 70, 'F');
					doc.text(x + 115, y + 40, "Responsive");

					y += 75;

					doc.setFillColor(249, 255, 175);
					doc.rect(x, y, 280, 70, 'F');
					if (repData.assessor.per_mast_lvl != 'Moderate moving towards Responsive')
						doc.text(x + 120, y + 40, "Moderate");

					y += 75;

					doc.setFillColor(255, 229, 144);
					doc.rect(x, y, 280, 70, 'F');
					if (repData.assessor.per_mast_lvl != 'Reactive moving towards Moderate')
						doc.text(x + 120, y + 40, "Reactive");

					doc.setDrawColor(28, 117, 188);

					x = 400;
					y = 400;

					var ttl = 0;
					if (typeof (repData.assessor.slf_aware) == 'number')
						ttl += repData.assessor.slf_aware;
					if (typeof (repData.assessor.openness) == 'number')
						ttl += repData.assessor.openness;
					if (typeof (repData.assessor.per_mast) == 'number')
						ttl += repData.assessor.per_mast;

					doc.addImage(arrowImg, x, y, 25, 220);

					doc.text(x + 20, 410, "9.0");
					doc.text(x + 20, 618, "0.0");

					x = 455;

					align_center = (56 - Math.round(doc.getTextDimensions(ttl).w)) / 2;

					var exactPos = 0;

					switch (repData.assessor.per_mast_lvl) {
						case 'Responsive':
							exactPos = (24.4 * (9 - (7.5)));
							doc.setFontType('bold');
							doc.text(110 + 110, y + 28, "Current Level:");
							doc.setFontType('normal');
							doc.text(110 + 115, y + 40, "Responsive");
							doc.ellipse(x - 205, 435, 100, 30, 'D');
							break;
						case 'Moderate moving towards Responsive':
							exactPos = (24.4 * (9 - (5.8)));
							y += 65;
							doc.setFontType('bold');
							doc.text(110 + 110, y + 28, "Current Level:");
							doc.setFontType('normal');
							doc.text(110 + 60, y + 40, "Moderate moving to Responsive");
							doc.ellipse(x - 205, 485, 100, 40, 'D');
							break;
						case 'Moderate':
							exactPos = (24.4 * (9 - (4.5)));
							y += 75;
							doc.setFontType('bold');
							doc.text(110 + 110, y + 28, "Current Level:");
							doc.setFontType('normal');
							doc.text(110 + 120, y + 40, "Moderate");
							doc.ellipse(x - 205, 510, 100, 30, 'D');
							break;
						case 'Reactive moving towards Moderate':
							exactPos = (24.4 * (9 - (2.6)));
							y += 65 + 75;
							doc.setFontType('bold');
							doc.text(110 + 110, y + 28, "Current Level:");
							doc.setFontType('normal');
							doc.text(110 + 70, y + 40, "Reactive moving to Moderate");
							doc.ellipse(x - 205, 560, 100, 40, 'D');
							break;
						case 'Reactive':
							exactPos = (24.4 * (9 - (1.5)));
							y += 150;
							doc.setFontType('bold');
							doc.text(110 + 110, y + 28, "Current Level:");
							doc.setFontType('normal');
							doc.text(110 + 120, y + 40, "Reactive");
							doc.ellipse(x - 205, 585, 100, 30, 'D');
					}

					y = 400;
					doc.addImage(smallArrowImg, x - 10 - 25, y + exactPos, 25, 17);
					doc.text(x + align_center, y + exactPos + 6, ttl.toString());
					doc.text(x, y + exactPos + 18, "(out of 9.0)");

					x = 55;
					y = 650;
					doc.setTextColor(128, 128, 128);

					var xyz = doc.splitTextToSize("Currently " + name + " is at '" + repData.assessor.per_mast_lvl + "' Personal Mastery Level as highlighted in the above graph", 505);

					for (var kn = 0; kn < xyz.length; kn++) {
						align_center = (505 - Math.round(doc.getTextDimensions(xyz[kn]).w)) / 2;

						doc.text(x + align_center, y, xyz[kn]);

						y += 12;
					}

				}
			}

			function pm_m2() {
				//Measure 2 - Personal Mastery
				if (whom == 2 && repData.assessor.pdf_pages.pm_m2 && (repData.assessor.per_mast_lvl == "Responsive" || repData.assessor.per_mast_lvl == "Moderate" || repData.assessor.per_mast_lvl == "Moderate moving towards Responsive")) {

					doc.addPage();
					pg_num++;
					x = 30;
					y = 45;
					footer(pg_num);

					//RR heading
					doc.setTextColor(0, 0, 0);
					doc.setFontSize(14);
					doc.setFontType("bold");

					width = doc.getTextDimensions(name + "'s Personal Mastery Levels");
					align_center = (535 - Math.round(width.w)) / 2;

					doc.text(x + align_center, y, name + "'s Personal Mastery Levels");

					y = 100;
					doc.setFontSize(11);
					doc.setFontType("bold");
					doc.setTextColor(128, 128, 128);

					align_center = (535 - Math.round(doc.getTextDimensions("MEASURE 2 :").w)) / 2;
					doc.text(x + align_center, y, "MEASURE 2 :");
					y += 13;
					align_center = (535 - Math.round(doc.getTextDimensions("FUTURE GROWTH POTENTIAL").w)) / 2;
					doc.text(x + align_center, y, "FUTURE GROWTH POTENTIAL");

					doc.setFontType("normal");
					y = 135;

					x = 30;
					x += 80;

					doc.setTextColor(0, 0, 0);

					doc.setLineWidth(12);

					//responsive
					doc.setDrawColor(221, 255, 165);
					doc.setFillColor(221, 255, 165);
					//			doc.rect(x, y, 375, 70, 'F');
					doc.setFontType("bold");
					align_center = (355 - Math.round(doc.getTextDimensions("Future Growth Potential: Responsive").w)) / 2;
					doc.line(x, y + 10, x + 375, y + 10);
					doc.line(x, y + 20, x + 375, y + 20);
					doc.text(x + 10 + align_center, y + 21, "Future Growth Potential: Responsive");
					doc.setFontType("normal");
					//			doc.text(x+115, y+40, "Responsive");

					y += 25;

					for (var ij in repData.assessor.RRAddOns.responsive) {
						des = doc.splitTextToSize('- ' + repData.assessor.RRAddOns.responsive[ij].statement, 355);

						doc.line(x, y + 7, x + 375, y + 7);
						var p = 0;
						while (p < des.length) {
							y = y + 12;
							doc.line(x, y, x + 375, y);
							align_center = (355 - Math.round(doc.getTextDimensions(des[p]).w)) / 2;
							doc.text(x + 20 + align_center, y, des[p]);
							p++;
						}
						y += 3;
					}

					// for(var ij in repData.assessor.RRAddOns.moderate){
					// 	des = doc.splitTextToSize(repData.assessor.RRAddOns.moderate[ij].statement, 355);

					// 	doc.line(x, y+7, x+375, y+7);
					// 	var p = 0;
					// 	while(p < des.length){
					// 		y = y + 12;
					// 		doc.line(x, y, x+375, y);
					// 		align_center = (355 - Math.round(doc.getTextDimensions(des[p]).w))/2;
					// 		doc.text(x+20 + align_center, y, des[p]);
					// 		p++;
					// 	}
					// 	y+=3;
					// }

					y += 10;
					doc.line(x, y - 4, x + 375, y - 4);
					y += 7;


					//moderate
					doc.setDrawColor(249, 255, 175);
					doc.setFillColor(249, 255, 175);
					doc.rect(x, y, 375, 70, 'F');

					if (repData.assessor.per_mast_lvl == "Responsive") {
						align_center = (355 - Math.round(doc.getTextDimensions("Moderate").w)) / 2;
						doc.text(x + 10 + align_center, y + 40, "Moderate");
					}
					else {
						doc.setFontType('bold');
						align_center = (355 - Math.round(doc.getTextDimensions("Current Level:").w)) / 2;
						doc.text(x + 10 + align_center, y + 28, "Current Level:");
						doc.setFontType('normal');
						align_center = (355 - Math.round(doc.getTextDimensions(repData.assessor.per_mast_lvl).w)) / 2;
						doc.text(x + 10 + align_center, y + 40, repData.assessor.per_mast_lvl);
					}

					y += 75;

					//reactive
					doc.setFillColor(255, 229, 144);
					doc.rect(x, y, 375, 70, 'F');
					align_center = (355 - Math.round(doc.getTextDimensions("Reactive").w)) / 2;
					doc.text(x + 10 + align_center, y + 40, "Reactive");

					if (repData.assessor.per_mast_lvl != "Responsive")
						doc.addImage(smallArrowImg2, 285, y - 75 - 15, 20, 24);

					y += 100;

					x = 455;

					var exactPos = 0;

					// switch(repData.assessor.per_mast_lvl){
					// 	case 'Responsive': 
					// 		exactPos = (24.4*(9-(7.5)));
					// 		doc.text(110+110, y+28, "Current Level:");
					// 		doc.text(110+115, y+40, "Responsive");
					// 		break;
					// 	case 'Moderate moving towards Responsive': 
					// 		exactPos = (24.4*(9-(5.8)));
					// 		y+=65;
					// 		doc.text(110+110, y+28, "Current Level:");
					// 		doc.text(110+60, y+40, "Moderate moving to Responsive");
					// 		break;
					// 	case 'Moderate': 
					// 		exactPos = (24.4*(9-(4.5)));
					// 		y+=75;
					// 		doc.text(110+110, y+28, "Current Level:");
					// 		doc.text(110+120, y+40, "Moderate");
					// 		break;
					// 	case 'Reactive moving towards Moderate': 
					// 		exactPos = (24.4*(9-(2.6)));
					// 		y+=65 + 75;
					// 		doc.text(110+110, y+28, "Current Level:");
					// 		doc.text(110+70, y+40, "Reactive moving to Moderate");
					// 		break;
					// 	case 'Reactive': 
					// 		exactPos = (24.4*(9-(1.5)));
					// 		y+=150;
					// 		doc.text(110+110, y+28, "Current Level:");
					// 		doc.text(110+120, y+40, "Reactive");
					// }

					// y=380;
					x = 55;
					doc.setTextColor(128, 128, 128);

					xyz = doc.splitTextToSize("Over time " + name + " can further move to 'Responsive' personal mastery level by working on learning needs", 505);

					for (var kn = 0; kn < xyz.length; kn++) {
						align_center = (505 - Math.round(doc.getTextDimensions(xyz[kn]).w)) / 2;

						doc.text(x + align_center, y, xyz[kn]);

						y += 12;
					}

				}

				//Measure 2 - Personal Mastery
				if (whom == 2 && repData.assessor.pdf_pages.pm_m2 && (repData.assessor.per_mast_lvl == "Reactive" || repData.assessor.per_mast_lvl == "Reactive moving towards Moderate")) {

					doc.addPage();
					pg_num++;
					x = 30;
					y = 45;
					footer(pg_num);

					//RR heading
					doc.setTextColor(0, 0, 0);
					doc.setFontSize(14);
					doc.setFontType("bold");

					width = doc.getTextDimensions(name + "'s Personal Mastery Levels");
					align_center = (535 - Math.round(width.w)) / 2;

					doc.text(x + align_center, y, name + "'s Personal Mastery Levels");

					y = 100;
					doc.setFontSize(11);
					doc.setFontType("bold");
					doc.setTextColor(128, 128, 128);

					align_center = (535 - Math.round(doc.getTextDimensions("MEASURE 2 :").w)) / 2;
					doc.text(x + align_center, y, "MEASURE 2 :");
					y += 13;
					align_center = (535 - Math.round(doc.getTextDimensions("FUTURE GROWTH POTENTIAL").w)) / 2;
					doc.text(x + align_center, y, "FUTURE GROWTH POTENTIAL");

					doc.setFontType("normal");
					y = 135;

					x = 30;
					x += 80;

					doc.setTextColor(0, 0, 0);

					doc.setLineWidth(12);

					//responsive
					doc.setFillColor(221, 255, 165);
					doc.rect(x, y, 375, 70, 'F');
					align_center = (355 - Math.round(doc.getTextDimensions("Responsive").w)) / 2;
					doc.text(x + 10 + align_center, y + 40, "Responsive");

					y += 72;

					//moderate
					doc.setDrawColor(249, 255, 175);
					doc.setFillColor(249, 255, 175);
					// doc.rect(x, y, 375, 70, 'F');
					doc.setFontType("bold");
					align_center = (355 - Math.round(doc.getTextDimensions("Future Growth Potential: Moderate").w)) / 2;
					doc.line(x, y + 10, x + 375, y + 10);
					doc.line(x, y + 20, x + 375, y + 20);
					doc.text(x + 10 + align_center, y + 21, "Future Growth Potential: Moderate");
					doc.setFontType("normal");

					y += 25;

					for (var ij in repData.assessor.RRAddOns.moderate) {
						des = doc.splitTextToSize('- ' + repData.assessor.RRAddOns.moderate[ij].statement, 355);

						doc.line(x, y + 7, x + 375, y + 7);
						var p = 0;
						while (p < des.length) {
							y = y + 12;
							doc.line(x, y, x + 375, y);
							align_center = (355 - Math.round(doc.getTextDimensions(des[p]).w)) / 2;
							doc.text(x + 20 + align_center, y, des[p]);
							p++;
						}
						y += 3;
					}

					y += 10;
					doc.line(x, y - 4, x + 375, y - 4);
					y += 7;

					//reactive
					doc.setDrawColor(255, 229, 144);
					doc.setFillColor(255, 229, 144);
					doc.rect(x, y, 375, 70, 'F');
					doc.setFontType('bold');
					align_center = (355 - Math.round(doc.getTextDimensions("Current Level:").w)) / 2;
					doc.text(x + 10 + align_center, y + 28, "Current Level:");
					doc.setFontType('normal');
					align_center = (355 - Math.round(doc.getTextDimensions(repData.assessor.per_mast_lvl).w)) / 2;
					doc.text(x + 10 + align_center, y + 40, repData.assessor.per_mast_lvl);

					doc.addImage(smallArrowImg2, 285, y - 15, 20, 24);

					y += 100;

					x = 455;

					var exactPos = 0;
					x = 55;
					doc.setTextColor(128, 128, 128);

					xyz = doc.splitTextToSize("Over time " + name + " can further move to 'Moderate' personal mastery level by working on learning needs", 505);

					for (var kn = 0; kn < xyz.length; kn++) {
						align_center = (505 - Math.round(doc.getTextDimensions(xyz[kn]).w)) / 2;

						doc.text(x + align_center, y, xyz[kn]);

						y += 12;
					}

				}
			}

			function pm_m3() {
				//Measure 3 - Personal Mastery
				if (whom == 2 && repData.assessor.pdf_pages.pm_m3 && (repData.assessor.per_mast_lvl == "Responsive" || repData.assessor.per_mast_lvl == "Moderate moving towards Responsive")) {

					doc.addPage();
					pg_num++;
					x = 30;
					y = 45;
					footer(pg_num);

					//RR heading
					doc.setTextColor(0, 0, 0);
					doc.setFontSize(14);
					doc.setFontType("bold");

					width = doc.getTextDimensions(name + "'s Personal Mastery Levels");
					align_center = (535 - Math.round(width.w)) / 2;

					doc.text(x + align_center, y, name + "'s Personal Mastery Levels");

					y = 100;
					doc.setFontSize(11);
					doc.setFontType("bold");
					doc.setTextColor(128, 128, 128);

					align_center = (535 - Math.round(doc.getTextDimensions("MEASURE 3 :").w)) / 2;
					doc.text(x + align_center, y, "MEASURE 3 :");
					y += 13;
					align_center = (535 - Math.round(doc.getTextDimensions("GROWTH OVER LAST FEW YEARS").w)) / 2;
					doc.text(x + align_center, y, "GROWTH OVER LAST FEW YEARS");

					doc.setFontType("normal");
					y = 135;

					x = 30;
					x += 80;

					doc.setTextColor(0, 0, 0);

					doc.setLineWidth(12);

					//responsive
					doc.setDrawColor(221, 255, 165);
					doc.setFillColor(221, 255, 165);
					//			doc.rect(x, y, 375, 70, 'F');
					doc.setFontType("bold");
					if (repData.assessor.per_mast_lvl == "Responsive") {
						align_center = (355 - Math.round(doc.getTextDimensions("Growth over last few years: Responsive").w)) / 2;
						doc.line(x, y + 10, x + 375, y + 10);
						doc.line(x, y + 20, x + 375, y + 20);
						doc.text(x + 10 + align_center, y + 21, "Growth over last few years: Responsive");
					}
					else {
						align_center = (355 - Math.round(doc.getTextDimensions("Growth over last few years: Moving to Responsive").w)) / 2;
						doc.line(x, y + 10, x + 375, y + 10);
						doc.line(x, y + 20, x + 375, y + 20);
						doc.text(x + 10 + align_center, y + 21, "Growth over last few years: Moving to Responsive");
					}
					//			doc.text(x+115, y+40, "Responsive");

					y += 25;
					doc.setFontType("normal");

					for (var ij in repData.assessor.RRAddOns2.responsive) {
						des = doc.splitTextToSize('- ' + repData.assessor.RRAddOns2.responsive[ij].statement, 355);

						doc.line(x, y + 7, x + 375, y + 7);
						var p = 0;
						while (p < des.length) {
							y = y + 12;
							doc.line(x, y, x + 375, y);
							align_center = (355 - Math.round(doc.getTextDimensions(des[p]).w)) / 2;
							doc.text(x + 20 + align_center, y, des[p]);
							p++;
						}
						y += 3;
					}

					y += 10;
					doc.line(x, y - 4, x + 375, y - 4);
					y += 7;


					//moderate
					doc.setDrawColor(249, 255, 175);
					doc.setFillColor(249, 255, 175);
					doc.rect(x, y, 375, 70, 'F');
					// align_center = (355 - Math.round(doc.getTextDimensions("Current Level:").w)) / 2;
					// doc.text(x + 10 + align_center, y + 28, "Current Level:");
					align_center = (355 - Math.round(doc.getTextDimensions("Moderate").w)) / 2;
					doc.text(x + 10 + align_center, y + 40, "Moderate");

					y += 75;

					//reactive
					doc.setFillColor(255, 229, 144);
					doc.rect(x, y, 375, 70, 'F');
					align_center = (355 - Math.round(doc.getTextDimensions("Reactive").w)) / 2;
					doc.text(x + 10 + align_center, y + 40, "Reactive");

					if (repData.assessor.per_mast_lvl != "Responsive")
						doc.addImage(smallArrowImg2, 285, y - 75 - 15, 20, 24);

					y += 100;

					x = 455;

					var exactPos = 0;

					x = 55;
					doc.setTextColor(128, 128, 128);

					xyz = doc.splitTextToSize("In last few years, " + name + " has moved to 'Responsive' personal mastery levels as highlighted in the above graph", 505);

					for (var kn = 0; kn < xyz.length; kn++) {
						align_center = (505 - Math.round(doc.getTextDimensions(xyz[kn]).w)) / 2;

						doc.text(x + align_center, y, xyz[kn]);

						y += 12;
					}

				}

				//Measure 3 - Personal Mastery
				if (whom == 2 && repData.assessor.pdf_pages.pm_m3 && (repData.assessor.per_mast_lvl == "Moderate" || repData.assessor.per_mast_lvl == "Reactive moving towards Moderate")) {

					doc.addPage();
					pg_num++;
					x = 30;
					y = 45;
					footer(pg_num);

					//RR heading
					doc.setTextColor(0, 0, 0);
					doc.setFontSize(14);
					doc.setFontType("bold");

					width = doc.getTextDimensions(name + "'s Personal Mastery Levels");
					align_center = (535 - Math.round(width.w)) / 2;

					doc.text(x + align_center, y, name + "'s Personal Mastery Levels");

					y = 100;
					doc.setFontSize(11);
					doc.setFontType("bold");
					doc.setTextColor(128, 128, 128);

					align_center = (535 - Math.round(doc.getTextDimensions("MEASURE 3 :").w)) / 2;
					doc.text(x + align_center, y, "MEASURE 3 :");
					y += 13;
					align_center = (535 - Math.round(doc.getTextDimensions("GROWTH OVER LAST FEW YEARS").w)) / 2;
					doc.text(x + align_center, y, "GROWTH OVER LAST FEW YEARS");

					doc.setFontType("normal");
					y = 135;

					x = 30;
					x += 80;

					doc.setTextColor(0, 0, 0);

					doc.setLineWidth(12);

					//responsive
					doc.setFillColor(221, 255, 165);
					doc.rect(x, y, 375, 70, 'F');
					align_center = (355 - Math.round(doc.getTextDimensions("Responsive").w)) / 2;
					doc.text(x + 10 + align_center, y + 40, "Responsive");

					y += 72;

					//moderate
					doc.setDrawColor(249, 255, 175);
					doc.setFillColor(249, 255, 175);
					// doc.rect(x, y, 375, 70, 'F');
					doc.setFontType("bold");

					if (repData.assessor.per_mast_lvl == "Moderate") {
						align_center = (355 - Math.round(doc.getTextDimensions("Growth over last few years: Moderate").w)) / 2;
						doc.line(x, y + 10, x + 375, y + 10);
						doc.line(x, y + 20, x + 375, y + 20);
						doc.text(x + 10 + align_center, y + 21, "Growth over last few years: Moderate");
					}
					else {
						align_center = (355 - Math.round(doc.getTextDimensions("Growth over last few years: Moving to Moderate").w)) / 2;
						doc.line(x, y + 10, x + 375, y + 10);
						doc.line(x, y + 20, x + 375, y + 20);
						doc.text(x + 10 + align_center, y + 21, "Growth over last few years: Moving to Moderate");
					}

					y += 25;
					doc.setFontType("normal");

					for (var ij in repData.assessor.RRAddOns2.moderate) {
						des = doc.splitTextToSize('- ' + repData.assessor.RRAddOns2.moderate[ij].statement, 355);

						doc.line(x, y + 7, x + 375, y + 7);
						var p = 0;
						while (p < des.length) {
							y = y + 12;
							doc.line(x, y, x + 375, y);
							align_center = (355 - Math.round(doc.getTextDimensions(des[p]).w)) / 2;
							doc.text(x + 20 + align_center, y, des[p]);
							p++;
						}
						y += 3;
					}

					y += 10;
					doc.line(x, y - 4, x + 375, y - 4);
					y += 7;

					//reactive
					doc.setDrawColor(255, 229, 144);
					doc.setFillColor(255, 229, 144);
					doc.rect(x, y, 375, 70, 'F');
					// align_center = (355 - Math.round(doc.getTextDimensions("Current Level:").w)) / 2;
					// doc.text(x + 10 + align_center, y + 28, "Current Level:");
					align_center = (355 - Math.round(doc.getTextDimensions("Reactive").w)) / 2;
					doc.text(x + 10 + align_center, y + 40, "Reactive");

					doc.addImage(smallArrowImg2, 285, y - 15, 20, 24);

					y += 100;

					x = 455;

					var exactPos = 0;
					x = 55;
					doc.setTextColor(128, 128, 128);

					xyz = doc.splitTextToSize("In last few years, " + name + " has moved to 'Moderate' personal mastery levels as highlighted in the above graph", 505);

					for (var kn = 0; kn < xyz.length; kn++) {
						align_center = (505 - Math.round(doc.getTextDimensions(xyz[kn]).w)) / 2;

						doc.text(x + align_center, y, xyz[kn]);

						y += 12;
					}

				}

				//Measure 3 - Personal Mastery
				if (whom == 2 && repData.assessor.pdf_pages.pm_m3 && (repData.assessor.per_mast_lvl == "Reactive")) {

					doc.addPage();
					pg_num++;
					x = 30;
					y = 45;
					footer(pg_num);

					//RR heading
					doc.setTextColor(0, 0, 0);
					doc.setFontSize(14);
					doc.setFontType("bold");

					width = doc.getTextDimensions(name + "'s Personal Mastery Levels");
					align_center = (535 - Math.round(width.w)) / 2;

					doc.text(x + align_center, y, name + "'s Personal Mastery Levels");

					y = 100;
					doc.setFontSize(11);
					doc.setFontType("bold");
					doc.setTextColor(128, 128, 128);

					align_center = (535 - Math.round(doc.getTextDimensions("MEASURE 3 :").w)) / 2;
					doc.text(x + align_center, y, "MEASURE 3 :");
					y += 13;
					align_center = (535 - Math.round(doc.getTextDimensions("GROWTH OVER LAST FEW YEARS").w)) / 2;
					doc.text(x + align_center, y, "GROWTH OVER LAST FEW YEARS");

					doc.setFontType("normal");
					y = 135;

					x = 30;
					x += 80;

					doc.setTextColor(0, 0, 0);

					doc.setLineWidth(12);

					//responsive
					doc.setFillColor(221, 255, 165);
					doc.rect(x, y, 375, 70, 'F');
					align_center = (355 - Math.round(doc.getTextDimensions("Responsive").w)) / 2;
					doc.text(x + 10 + align_center, y + 40, "Responsive");

					y += 75;

					//moderate
					doc.setDrawColor(249, 255, 175);
					doc.setFillColor(249, 255, 175);
					doc.rect(x, y, 375, 70, 'F');
					align_center = (355 - Math.round(doc.getTextDimensions("Moderate").w)) / 2;
					doc.text(x + 10 + align_center, y + 40, "Moderate");

					y += 72;

					//reactive
					doc.setDrawColor(255, 229, 144);
					doc.setFillColor(255, 229, 144);
					// doc.rect(x, y, 375, 70, 'F');
					doc.setFontType("bold");
					align_center = (355 - Math.round(doc.getTextDimensions("Growth over last few years: Reactive").w)) / 2;
					doc.line(x, y + 10, x + 375, y + 10);
					doc.line(x, y + 20, x + 375, y + 20);
					doc.text(x + 10 + align_center, y + 21, "Growth over last few years: Reactive");
					doc.setFontType("normal");

					y += 25;

					for (var ij in repData.assessor.RRAddOns2.reactive) {
						des = doc.splitTextToSize('- ' + repData.assessor.RRAddOns2.reactive[ij].statement, 355);

						doc.line(x, y + 7, x + 375, y + 7);
						var p = 0;
						while (p < des.length) {
							y = y + 12;
							doc.line(x, y, x + 375, y);
							align_center = (355 - Math.round(doc.getTextDimensions(des[p]).w)) / 2;
							doc.text(x + 20 + align_center, y, des[p]);
							p++;
						}
						y += 3;
					}

					y += 10;
					doc.line(x, y - 4, x + 375, y - 4);
					y += 7;

					// doc.addImage(smallArrowImg2, 285, y - 15, 20, 24);

					y += 20;

					x = 455;

					var exactPos = 0;
					x = 55;
					doc.setTextColor(128, 128, 128);

					xyz = doc.splitTextToSize("In last few years, " + name + " has moved to 'Reactive' personal mastery levels as highlighted in the above graph", 505);

					for (var kn = 0; kn < xyz.length; kn++) {
						align_center = (505 - Math.round(doc.getTextDimensions(xyz[kn]).w)) / 2;

						doc.text(x + align_center, y, xyz[kn]);

						y += 12;
					}

				}
			}

			//add-on section
			function extras() {
				if (whom == 2 && repData.assessor.pdf_pages.extras) {
					doc.addPage();
					pg_num++;
					x = 30;
					y = 45;
					footer(pg_num);

					var xyz, mxLen;

					//heading
					doc.setTextColor(0, 0, 0);
					doc.setFontSize(14);
					doc.setFontType("normal");

					doc.setLineWidth(18);
					doc.setDrawColor(66, 133, 244);

					// y += 50;
					doc.setFontSize(11);

					var c = 0;

					var saveX = x, saveY = y;

					var tmpRec = recForManager.filter(function (item) { return item.selected; });

					if (tmpRec.length) {
						doc.setFontType("bold");
						doc.setTextColor(255, 255, 255);

						doc.line(x, y - 3, 565, y - 3);

						width = doc.getTextDimensions('Recommendations for Manager');
						align_center = (535 - Math.round(width.w)) / 2;

						doc.text(x + align_center, y, 'Recommendations for Manager');

						doc.setFontType("normal");
						doc.setTextColor(0, 0, 0);

						var compArray = competencies.map(function (comp) { return comp.competency_id });

						y += 32;

						// console.log(tmpRec);

						while (c < tmpRec.length) {

							// console.log(tmpRec[c].statement)
							doc.addImage(bullet, x + 18, y - 7, 4, 4);

							//competency
							if ('linked_competency' in tmpRec[c] && tmpRec[c].linked_competency && getProfileCompetencyMapping(compArray, competencies, tmpRec[c].linked_competency)) {
								doc.setFontType("bold");
								doc.text(x + 30, y, 'Competency - ' + getProfileCompetencyMapping(compArray, competencies, tmpRec[c].linked_competency));
								y += 14;
							}

							//brief
							doc.setFontType("normal");
							if ('brief' in tmpRec[c] && tmpRec[c].brief) {
								xyz = doc.splitTextToSize(tmpRec[c].brief, 490);

								i = 0;
								while (i < xyz.length) {
									doc.text(x + 30, y, xyz[i]);
									y += 12;
									i++;
								}

								y += 2;
							}

							//statement
							xyz = doc.splitTextToSize(tmpRec[c].statement, 490);

							i = 0;
							while (i < xyz.length) {
								doc.text(x + 30, y, xyz[i]);
								y += 12;
								i++;
							}

							y += 5;


							c++;
						}

						y += 30;
					}

					for (var recPage = 1; recPage <= 3; recPage++) {
						if (!isEmptyPage(recPage, repData)) {
							// console.log(!isEmptyPage(recPage, repData));
							c = 0;

							while (c < repData.assessor.recommend.length) {
								if (repData.assessor.recommend[c].page == recPage) {
									x = 30;

									var i = 0;
									xyz = doc.splitTextToSize(repData.assessor.recommend[c].title, 535);

									beforeY = y;
									while (i < xyz.length) {
										doc.line(x, y - 3, 565, y - 3);
										y += 12;
										i++;
									}
									y = beforeY;

									doc.setFontType("bold");
									doc.setTextColor(255, 255, 255);

									i = 0;
									while (i < xyz.length) {
										width = doc.getTextDimensions(xyz[i]);
										align_center = (535 - Math.round(width.w)) / 2;

										doc.text(x + align_center, y, xyz[i]);

										y += 12;
										i++;
									}
									doc.setFontType("normal");
									doc.setTextColor(0, 0, 0);

									x = 45;
									y += 20;
									i = 0;

									if (repData.assessor.recommend[c].desc) {
										var coords = { x: x, y: y };
										printHighlightedText(coords, repData.assessor.recommend[c].desc);
										x = coords.x;
										y = coords.y;

										y += 5;
									}

									// xyz = doc.splitTextToSize(repData.assessor.recommend[c].desc, 505);
									// doc.text(x + 15, y, xyz);

									// y += (xyz.length - 1) * 12;

									y += 40;
								}
								c++;
							}

							//new page
							if (recPage <= 2 && !isEmptyPage(recPage + 1, repData)) {
								doc.addPage();
								pg_num++;
								x = 30;
								y = 45;
								footer(pg_num);

								doc.setLineWidth(18);
								doc.setDrawColor(66, 133, 244);
								doc.setFontSize(11);
								x = saveX;
								y = saveY;
							}
						}
					}
				}
			}

			repData.assessor.pdf_pages_sequence.forEach(function (page_title) {
				// console.log(page_title);
				eval(page_title.split('|')[1] + '()');
			});

			doc.save('Trueself Report - ' + name + '.pdf');
		};

		var SDdoc = new jsPDF('l', 'pt', 'a4');    //842 x 595

		var SD_F = new Image();
		SD_F.src = 'images/SD-F.png';

		var bullet = new Image();
		bullet.src = 'images/bullet.png';

		// var check = new Image();
		// check.src = 'images/check.png';

		// hand.onload = function () { hand.width /= 2; hand.height /= 2; };

		// SD_F.onload = function () { SD_F.width /= 1.01; SD_F.height /= 1.01; };

		function give_me_color(relate) {
			switch (relate) {
				case 'donotexhibitanymore': SDdoc.setTextColor(0, 200, 81);
					break;
				case 'donotrelate': SDdoc.setTextColor(66, 133, 244);
					break;
				default: SDdoc.setTextColor(0, 0, 0);
			}
		}

		function executeProfile(coords, userProf, pnum) {
			var width, des;
			userProf.filter(function (key) { return key.keyword_id[5] == pnum && !key.new_keyword; })
				.forEach(function (key, indx) {
					// SDdoc.addImage(hand, coords.x, coords.y - 17, 25, 25);
					// SDdoc.addImage(check, coords.x, coords.y - 10, 12, 12);
					// coords.x += 35;

					SDdoc.setFontType('bold');
					give_me_color('none');

					var kw = SDdoc.splitTextToSize(key.keyword, 130);
					var i = 0;
					var ty = coords.y, maxY = kw.length, maxY2 = 1;
					while (i < kw.length) {
						SDdoc.text(coords.x, coords.y, kw[i]);

						if (i != kw.length - 1) {
							coords.x = 45; coords.y += 16;
						}

						i++;
					}
					coords.y = ty;
					SDdoc.text(180, coords.y, ': ');
					coords.x += 10;

					// SDdoc.text(coords.x, coords.y, kw);
					coords.x = 190 + 20;
					// coords.y += 16;

					SDdoc.setFontType('normal');

					key.mini_descriptions.forEach(function (item, indx) {
						give_me_color(item.relate);
						width = parseInt((SDdoc.getTextDimensions(item.mini_description)).w);
						if ((width + coords.x) > 797) {			//exceeds horizontally
							coords.x = 190 + 20;
							if (indx != 0) coords.y += 18;
							maxY2++;
						}
						SDdoc.addImage(bullet, coords.x - 12, coords.y - 7, 4, 4);
						des = SDdoc.splitTextToSize(item.mini_description, 592);
						var i = 0;
						while (i < des.length) {
							// SDdoc.text(coords.x, coords.y - 10, coords.x + '|' + width);
							SDdoc.text(coords.x, coords.y, des[i]);

							if (i != des.length - 1) {
								coords.x = 190 + 20; coords.y += 18;
							}

							i++;
						}

						coords.x += (width + 20);
					});
					coords.x = 45;

					if (maxY > maxY2)
						coords.y += (maxY * 17 + 3);
					else
						coords.y += 20;
				});
		}

		retD.sub_heading = [
			"Principled, purposeful, self-controlled & perfectionist",
			"Caring, generous, people-pleasing & intrusive",
			"Ambitious, self-developing, efficient & image-conscious",
			"Intuitive, expressive, individualistic & temperamental",
			"Perceptive, innovative, secretive & detached",
			"Committed, responsible, anxious & suspicious",
			"Social, optimistic, versatile and spontaneous",
			"Self-confident, decisive, willful & confrontational",
			"Calm, reassuring, agreeable & complacent (self- satisfied)"
		];

		retD.basic_fear = [
			"Of making mistake, of being corrupt or evil, of having something deeply, intrinsically wrong with them.",
			"Of being unwanted, unworthy of being loved, discarded, and deemed intrinsically unworthy.",
			"Of being worthless, fear of failure, since failure would make them feel that they have no value.",
			"Of having no identity or personal significance, being intrinsically defective.",
			"Being useless, helpless, incapable, depleted, and overtaken.",
			"Of being without support and guidance; being unable to survive.",
			"Of being deprived and in pain, not feeling whole.",
			"Of being harmed or controlled by others or being vulnerable.",
			"Of loss and separation, being controlled, and discord."
		];

		retD.key_motivation = [
			"Want to be right, to strive higher and improve everything, to be consistent with their ideals / to act in accordance with their conscience, to justify themselves or their position, to be absolutely guiltless, to be beyond criticism so as not to be condemned by anyone. Want to treat others fairly, to improve the world, to reproach others for not living up to their ideals.",
			"Want to be liked, to express their feelings for others, to be an important influence on others, to get others to respond to them, to be intimate with others, to be necessary to others, to control people (indirectly through their help), and to justify the demands they make on others and to vindicate (prove to be right) their claims about themselves.",
			"Want to be affirmed, to distinguish themselves from others, to have attention, to be valued and admired, to create a favorable impression and to impress others. Want to develop and improve themselves, want to feel competent, to convince others of reality of their image.",
			"Want to express themselves and their individuality, to create and surround themselves with beauty, to create something beautiful that will allow them to communicate themselves to others, to have others appreciate their unique identity and contribution, to maintain certain moods and feelings, to withdraw from people so that they can sort out and protect their feelings and self-image, to take care of emotional needs before attending to anything else, to indulge themselves to make up for what they are missing in the real world, to attract a 'rescuer'",
			"Want to possess knowledge, to understand the environment, to have everything figured out as a way of defending the self from threats from the environment, to observe everything, to master something to gain confidence (find a niche), to create an inner reality that feels more controllable than the real world, to shut out their intrusions, to challenge or scare off anyone who threatens their inner world or niche, to isolate from the outside world, to conserve their inner resources and energy.",
			"Want to have security, to feel supported by others, to have certitude and reassurance, to test the attitudes of others toward them, to fight against anxiety and insecurity. Want to be liked, to have approval, to assert themselves to overcome their fears, to have the authority figure come to their aid.",
			"Want to maintain their freedom and happiness, to enjoy themselves, to avoid missing out on worthwhile experiences, to keep themselves excited and occupied, to get whatever they want, to stay 'up' and in motion regardless of the consequences, to flee from or discharge anxiety and pain.",
			"Want to be self-reliant, to prove their strength and resist weakness, to dominate the environment, and to stay in control of the situation, to assert themselves, to prove themselves and their abilities, to be respected, to have the resource they need to 'run things,' to convince themselves of their importance, to fight for their survival, to be invulnerable.",
			"Want to create peace and harmony in their environment, to avoid conflicts and tension, to preserve things as they are, to resist whatever would upset or disturb them, being heard, to mediate conflicts and bring people together, to minimize problems, to defend the illusion that everything is okay in your world."
		];

		retD.SD_PDF = function (name, profNum, userProf, userBel) {
			if (profNum == 0) return;

			var x = 45, y = 50, width = 0, align_center = 0, des = [];
			pg_num = 1;

			SDdoc = new jsPDF('l', 'pt', 'a4');

			// SDdoc.addImage(SD_F, 0, 0, 842, 595);
			// SDdoc.addPage();

			SDdoc.setLineWidth(16);
			SDdoc.setFillColor(146, 159, 186);

			SDdoc.rect(8, 8, 262, 8, 'F');
			SDdoc.rect(280, 8, 10, 8, 'F');
			SDdoc.rect(300, 8, 10, 8, 'F');

			SDdoc.rect(8, 8, 8, 162, 'F');
			SDdoc.rect(8, 180, 8, 10, 'F');
			SDdoc.rect(8, 200, 8, 10, 'F');

			SDdoc.setTextColor(0, 0, 0);

			SDdoc.setFontSize(20);
			SDdoc.setFontType('bold');

			width = SDdoc.getTextDimensions("Profile " + profNum + ": " + name);
			align_center = (752 - Math.round(width.w)) / 2;
			SDdoc.text(x + align_center, y, "Profile " + profNum + ": " + name);

			y += 25;

			// y += 22;

			SDdoc.setFontSize(15);
			// width = SDdoc.getTextDimensions(retD.sub_heading[parseInt(profNum)-1]);
			// align_center = (752 - Math.round(width.w)) / 2;
			SDdoc.text(x, y, retD.sub_heading[parseInt(profNum) - 1]);

			SDdoc.setFontType('normal');
			y += 30;

			SDdoc.setFontSize(14);

			//basic fear
			SDdoc.setFontType('bold');
			SDdoc.text(x, y, "Basic Fear: ");
			x = 45; y += 16;
			SDdoc.setFontType('normal');
			des = SDdoc.splitTextToSize(retD.basic_fear[parseInt(profNum) - 1], 752);
			var i = 0;
			while (i < des.length) {
				SDdoc.text(x, y, des[i]);
				if (i != des.length - 1)
					y += 16;
				i++;
			}

			y += 20;

			//key motivation
			SDdoc.setFontType('bold');
			SDdoc.text(x, y, "Basic Desire & Key Motivation: ");
			x = 45; y += 16;
			SDdoc.setFontType('normal');
			des = SDdoc.splitTextToSize(retD.key_motivation[parseInt(profNum) - 1], 752);
			var i = 0;
			while (i < des.length) {
				SDdoc.text(x, y, des[i]);
				if (i != des.length - 1)
					y += 16;
				i++;
			}

			y += 30;

			SDdoc.setFontSize(17);
			SDdoc.setFontType('bold');

			width = SDdoc.getTextDimensions("STRENGTHS");
			align_center = (752 - Math.round(width.w)) / 2;
			SDdoc.text(x + align_center, y, "STRENGTHS");

			SDdoc.setFontSize(14);
			SDdoc.setFontType('normal');
			y += 25;

			var coords = { x: x, y: y };
			executeProfile(coords, userProf, '2');
			x = coords.x; y = coords.y;

			SDdoc.addPage();
			x = 45;
			y = 50;

			SDdoc.setLineWidth(16);
			SDdoc.setFillColor(146, 159, 186);

			SDdoc.rect(492, 579, 10, 8, 'F');
			SDdoc.rect(512, 579, 10, 8, 'F');
			SDdoc.rect(532, 579, 300, 8, 'F');

			SDdoc.rect(825, 357, 8, -10, 'F');
			SDdoc.rect(825, 377, 8, -10, 'F');
			SDdoc.rect(825, 587, 8, -200, 'F');

			SDdoc.setTextColor(0, 0, 0);
			SDdoc.setFontSize(17);
			SDdoc.setFontType('bold');

			width = SDdoc.getTextDimensions("CORE BELIEFS");
			align_center = (752 - Math.round(width.w)) / 2;
			SDdoc.text(x + align_center, y, "CORE BELIEFS");

			SDdoc.setFontSize(14);
			SDdoc.setFontType('normal');
			y += 25;
			x = 45;
			// y -= 16;
			var maxY = 0, ty = 0;

			userBel.forEach(function (stat, indx) {
				if (maxY < des.length) maxY = des.length;

				des = SDdoc.splitTextToSize(stat.statement, 364);

				// SDdoc.addImage(bullet, x, y - 7, 4, 4);
				x += 15;
				var i = 0;
				ty = y;
				while (i < des.length) {
					if ((indx % 2) == 1) x = 450;
					else x = 60;
					if (i == 0) SDdoc.addImage(bullet, x - 15, y - 7, 4, 4);
					SDdoc.text(x, y, des[i]);

					if (i != des.length - 1) y += 17;

					i++;
				}

				if ((indx % 2) == 1) { x = 450; y += 18; maxY = 0; }
				else { x = 45; y = ty; }
			});

			if (maxY == 0) y += 30;
			else y += (30 + ((des.length - 1) * 17));
			x = 45;

			SDdoc.setTextColor(0, 0, 0);
			SDdoc.setFontSize(17);
			SDdoc.setFontType('bold');

			width = SDdoc.getTextDimensions("LEARNING NEEDS");
			align_center = (752 - Math.round(width.w)) / 2;
			SDdoc.text(x + align_center, y, "LEARNING NEEDS");

			SDdoc.setFontSize(14);
			SDdoc.setFontType('normal');
			y += 25;

			var coords = { x: x, y: y };
			executeProfile(coords, userProf, '3');
			x = coords.x; y = coords.y;

			//footer
			x = 180; y = 570;
			give_me_color('none');
			SDdoc.setFillColor(0, 0, 0);
			SDdoc.rect(x - 20, 560, 10, 10, 'F');
			SDdoc.text(x, y, "Relate Strongly/Partially");
			x += (SDdoc.getTextDimensions("Relate Strongly/Partially").w + 40);
			SDdoc.setFillColor(0, 200, 81);
			SDdoc.rect(x - 20, 560, 10, 10, 'F');
			SDdoc.text(x, y, "Improved Over Time");
			x += (SDdoc.getTextDimensions("Improved Over Time").w + 40);
			SDdoc.setFillColor(66, 133, 244);
			SDdoc.rect(x - 20, 560, 10, 10, 'F');
			SDdoc.text(x, y, "Never Exhibited");

			SDdoc.save('Short Description - ' + name + '.pdf');
		};

		return retD;
	}])
	;