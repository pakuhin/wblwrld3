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
 * @overview Module loading utility functions.
 * @module lib/loader
 * @author Giannis Georgalis <jgeorgal@meme.hokudai.ac.jp>
 */

var Promise = require("bluebird");
var path = require('path');

var xfs = require('./xfs');

////////////////////////////////////////////////////////////////////////
// Utility functions

function filterAndhandleInorderScripts(allScripts, specificLoadOrderList, handlerCallback, initialValue) {
	
	if (specificLoadOrderList && specificLoadOrderList.length > 0) {
		
		return specificLoadOrderList.reduce(function (previousValue, script) {
			
			var index = allScripts.indexOf(script);
			
			if (index != -1) {
                
				allScripts.splice(index, 1);
				return handlerCallback(previousValue, script);
			}
			return previousValue;

		}, initialValue);
    }
    else
	    return initialValue;
}

////////////////////////////////////////////////////////////////////////
// Main API

/**
 * Loads and executes all Javascript files under "scriptDir" and its immediate sub-directories.
 * @param {string} scriptDir - The directory that contains Javascript files.
 * @param {Object} app - The express.js application object.
 * @param {Object} config - The configuration object (config.js).
 * @param {Object} mongoose - The mongoose library object.
 * @param {Callback} gettext - A function that essentially wraps any translatable strings.
 * @param {string[]} specificLoadOrderList - Whether some specific scripts should be executed in the
 *    specified order - e.g., ["one.js", "two.js"].
 * @param {*} extraArg0 - An extra argument to pass on when executing the loaded Javascript file.
 * @param {*} extraArg1 - An extra argument to pass on when executing the loaded Javascript file.
 * @returns {Promise} A promise that is resolved with an empty value if the loading and execution
 *     succeeds or is rejected if there's an error.
 */
module.exports.executeAllScripts = function (scriptDir, app, config, mongoose, gettext, specificLoadOrderList, extraArg0, extraArg1) {
	
	if (!path.isAbsolute(scriptDir))
		scriptDir = path.join(__dirname, "..", scriptDir);
    
    function handleScript(result, script) {

        return script.charAt(0) === '_' ? result : result.then(function () {
            return require(path.join(scriptDir, script))(app, config, mongoose, gettext, extraArg0, extraArg1);
        });
    }
	return xfs.getAllFiles(scriptDir, ".js", 1).then(function (allScripts) {
		
		return filterAndhandleInorderScripts(allScripts, specificLoadOrderList, handleScript, Promise.resolve()).then(function () {
			return allScripts.reduce(handleScript, Promise.resolve());
		});
	});
};

//**********************************************************************

/**
 * Loads and executes all Javascript files under "scriptDir" and its immediate sub-directories synchronously.
 * @param {string} scriptDir - The directory that contains Javascript files.
 * @param {Object} app - The express.js application object.
 * @param {Object} config - The configuration object (config.js).
 * @param {Object} mongoose - The mongoose library object.
 * @param {Callback} gettext - A function that essentially wraps any translatable strings.
 * @param {string[]} specificLoadOrderList - Whether some specific scripts should be executed in the
 *    specified order - e.g., ["one.js", "two.js"].
 * @param {*} extraArg0 - An extra argument to pass on when executing the loaded Javascript file.
 * @param {*} extraArg1 - An extra argument to pass on when executing the loaded Javascript file.
 */
module.exports.executeAllScriptsSync = function (scriptDir, app, config, mongoose, gettext, specificLoadOrderList, extraArg0, extraArg1) {
	
	if (!path.isAbsolute(scriptDir))
		scriptDir = path.join(__dirname, "..", scriptDir);
    
    function handleScript(result, script) {

        if (script.charAt(0) !== '_')
            result.push(require(path.join(scriptDir, script))(app, config, mongoose, gettext, extraArg0, extraArg1));
        return result;
    }
	var allScripts = xfs.getAllFilesSync(scriptDir, ".js", 1);
    var results = filterAndhandleInorderScripts(allScripts, specificLoadOrderList, handleScript, []);
    return allScripts.reduce(handleScript, results);
};
