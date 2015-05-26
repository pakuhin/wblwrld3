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
// mongoshell.js
// Created by Giannis Georgalis on 12/19/13
//
var config = {"MONGODB_DB_NAME":"wblwrld3","MONGODB_DB_USERNAME":"webbler","MONGODB_DB_PASSWORD":"mySuperSecretMongoPass"};

// See also:
// http://docs.mongodb.org/manual/tutorial/write-scripts-for-the-mongo-shell/

// equivalent to use wblwrld3;
// Mongo() is provided by the mongodb shell
//
//var db = new Mongo().getDB(config.MONGODB_DB_NAME);

// equivalent to use wblwrld3;
db = db.getSiblingDB(config.MONGODB_DB_NAME);
db.createUser({ user: config.MONGODB_DB_USERNAME, pwd: config.MONGODB_DB_PASSWORD, roles: [ "readWrite", "dbAdmin" ] });
