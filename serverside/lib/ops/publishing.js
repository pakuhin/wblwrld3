//
// Webble World 3.0 (IntelligentPad system for the web)
//
// Copyright (c) 2010-2015 Micke Nicander Kuwahara, Giannis Georgalis, Yuzuru Tanaka
//     in Meme Media R&D Group of Hokkaido University, Japan. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Additional restrictions may apply. See the LICENSE file for more information.
//

//
// publishing.js
// Created by Giannis Georgalis on Fri Mar 27 2015 16:19:01 GMT+0900 (Tokyo Standard Time)
//


var util = require('../util');

module.exports = function(Q, app, config, mongoose, gettext, auth) {

	var Group = mongoose.model('Group');

	////////////////////////////////////////////////////////////////////
	// Utility functions
	//
	function ensureObjectValid(req, obj, notExistsCode) {

		if (!obj)
			throw new util.RestError(gettext("Requested object does not exist", notExistsCode || 404));

		if (!obj.isUserAuthorized(req.user))
			throw new util.RestError(gettext("You cannot modify this object"), 403); // 403, Forbidden

		if (obj._sec.groups && obj._sec.groups.length != 0 && !util.any(req.user._sec.groups, function(gId) {
			return obj._sec.groups.indexOf(gId) != -1;
		})) {
			throw new util.RestError(gettext("The object is published under groups you are not member of"), 403);
		}
	}

	function requestConfirmation(obj, group, msg) {

		return group.populate('_owner').populate('_contributors').execPopulate().then(function(g) {

			if (!g._owner && g._contributors.length == 0)
				throw new util.RestError(gettext("You cannot currently publish under this group"), 403);

			var user = g._owner || g._contributors[0];

			user._tasks.push({
				text: obj.repr() + ": " + msg,
				kind: 'confirm',

				url: '/api/groups/' + group._id + '/objects',
				op: 'put',
				payload: { obj: obj._id }
			});
			return user.save();
		});
	}

	function addObjectToGroup(obj, gId) {

		return Group.findById(gId).exec().then(function(group) {

			if (!group)
				throw new util.RestError(gettext("Group no longer exists"), 404);

			// Enforce publication_policy

			if (group.pub_policy === 'closed')
				throw new util.RestError(gettext("Group closed for maintainance"), 403);

			var index = obj._sec.groups.indexOf(gId);

			if (index == -1) { // Not trusted_by yet

				if (!group.pub_policy || group.pub_policy === 'open')
					obj._sec.groups.push(gId);
				else
					return requestConfirmation(obj, group, gettext("Allow new publication under the group:") + " " + group.name);
			}
			else {

				if (group.pub_policy === 'moderate_updates') { // Already trusted_by...

					obj._sec.groups.splice(index, 1);
					return requestConfirmation(obj, group, gettext("Allow updates under the group:") + " " + group.name);
				}
			}
			return null; // Default value just for making it explicit
		});
	}

	////////////////////////////////////////////////////////////////////
	// Public methods
	//
	return {

		publish: function (req, query, createNewObjFunc, checkAndupdateObjFunc) {

			return ('exec' in query ? Q.resolve(query.exec()) : Q.resolve(query))
				.then(function(obj) {

					if (!obj) {

						obj = createNewObjFunc();

						if (!obj._owner)
							obj._owner = req.user._id;
					}
					ensureObjectValid(req, obj);

					// Update Object
					//
					obj = checkAndupdateObjFunc(obj);

					// Publication under specific groups
					//
					var pub_promises = [];

					if (req.body.groups && req.body.groups.length) {

						if (!req.user._sec.groups || req.user._sec.groups.length == 0)
							throw new util.RestError(gettext("Wrong publication group"), 403);

						req.body.groups.forEach(function(gIndex) {

							if (gIndex < 0 || gIndex >= req.user._sec.groups.length)
								throw new util.RestError(gettext("Wrong publication group"), 403);

							pub_promises.push(addObjectToGroup(obj, req.user._sec.groups[gIndex]));
						});
					}
					else {

						obj._sec.groups.forEach(function(gId) {
							pub_promises.push(addObjectToGroup(obj, gId)); // Re-add to group to enforce pub policies
						});
					}

					obj._updated = Date.now();

					return Q.all(pub_promises).then(function() {
						return obj.save();
					});
				});
		},

		//**************************************************************

		unpublish: function (req, query) {

			return ('exec' in query ? Q.resolve(query.exec()) : Q.resolve(query))
				.then(function(obj) {
					ensureObjectValid(req, obj, 204); // 204 (No Content) per RFC2616

					return obj.remove();
				});
		}

		//**************************************************************

	};
};
