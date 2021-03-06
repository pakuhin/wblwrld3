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

/**
 * @overview Ops module for managing the members of of Webble World groups.
 *
 * Members of a group can be any kind of object (e.g., users, webbles etc.) - even
 * other groups (in which case a group that belongs to another one is its subgroup);
 * this module, however, is mostly used for adding "users" as members of "groups",
 * hence the addition of a notification "message" in the object's "task" list.
 *
 * @module ops
 * @author Giannis Georgalis <jgeorgal@meme.hokudai.ac.jp>
 */

var Promise = require("bluebird");

var util = require('../util');

module.exports = function(app, config, mongoose, gettext, auth) {

	var Group = mongoose.model('Group');

	////////////////////////////////////////////////////////////////////
	// Utility functions
	//
	function ensureObjectValid(req, obj) {

		if (!obj)
			throw new util.RestError(gettext("Requested object does not exist", 404));
	}
	function ensureGroupValid(req, group) {

		if (!group)
			throw new util.RestError(gettext("Requested Group does not exist", 404));

		if (!group.isUserAuthorized(req.user))
			throw new util.RestError(gettext("You cannot manage this group"), 403);
	}

	////////////////////////////////////////////////////////////////////
	// Public methods
	//
	return {

        /**
         * Adds or removes the given object to or from the given group.
         * @param {Request} req - The instance of an express.js request object that contains
         *     the attribute req.body.remove that indicates whether we want to add or remove
         *     the given object to/from the given group (false or true, respectively).
         * @param {Query|Object} groupQuery - A mongoose query that evaluates to a group-object OR a group-object.
         * @param {Query|Object} query - A mongoose query that evaluates to an object.
   	     * @returns {Promise} A promise that is resolved if the method succeeds and rejected if not.
         */
		modifyGroupMember: function (req, groupQuery, query) {

			return ('exec' in groupQuery ? Promise.resolve(groupQuery.exec()) : Promise.resolve(groupQuery)).then(function(group) {
				ensureGroupValid(req, group);

				return query.exec().then(function (obj) {
					ensureObjectValid(req, obj);

					var index = obj._sec.groups.indexOf(group._id);

					if (index != -1 && !req.body.remove)
						throw new util.RestError(gettext("Object is already a member of the group"));

					if (index == -1)
						obj._sec.groups.push(group._id);
					else
						obj._sec.groups.splice(index, 1);

					if (obj._tasks) {

						obj._tasks.push({
							text: group.name + ": " + (index == -1 ?
								gettext("You became a group member") : gettext("Your group membership was revoked"))
						});
					}
					return obj.save();
				});
			});
		},

        /**
         * Gets the list of the objects that belong to (are members of) the given group.
         * @param {Request} req - The instance of an express.js request object.
         * @param {Query|Object} groupQuery - A mongoose query that evaluates to a group-object OR a group-object.
         * @param {Query|Object} query - A mongoose query that evaluates to an array that contains all objects.
   	     * @returns {Promise} A promise that is resolved with an array of objects that are members of
         *     the given group.
         */
		getGroupMembers: function (req, groupQuery, query) {

			return ('exec' in groupQuery ? Promise.resolve(groupQuery.exec()) : Promise.resolve(groupQuery)).then(function(group) {
				ensureGroupValid(req, group);

				return query.where('_sec.groups').equals(group._id).exec().then(function (results) {
					ensureObjectValid(req, results);

					return results;
				});
			});
		},

        /**
         * Removes all the objects that belong to (are members of) the given group.
         * @param {Request} req - The instance of an express.js request object.
         * @param {Query|Object} groupQuery - A mongoose query that evaluates to a group-object OR a group-object.
         * @param {Query|Object} query - A mongoose query that evaluates to an array that contains all objects.
   	     * @returns {Promise} A promise that is resolved if the method succeeds and rejected if not.
         */
		clearGroupMembers: function (req, groupQuery, query) {

			return ('exec' in groupQuery ? Promise.resolve(groupQuery.exec()) : Promise.resolve(groupQuery)).then(function(group) {
				ensureGroupValid(req, group);

				return query.where('_sec.groups').equals(group._id).exec().then(function (results) {
					ensureObjectValid(req, results);

					return Promise.all(util.transform(results, function (obj) {

						var index = obj._sec.groups.indexOf(group._id);
						if (index != -1)
							obj._sec.groups.splice(index, 1);

						return obj.save();
					}));
				});
			});
		}
	};
};
