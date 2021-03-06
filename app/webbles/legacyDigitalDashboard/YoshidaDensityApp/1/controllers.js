//======================================================================================================================
// Controllers for HandsOnPortalDensityApp for Webble World v3.0 (2013)
// Created By: Jonas Sjobergh
//======================================================================================================================

//=======================================================================================
// WEBBLE CONTROLLER
// This is the Main controller for this Webble Template
// NOTE: This file must exist and be an AngularJS Controller declared as seen below.
//=======================================================================================
wblwrld3App.controller('densityAppWebbleCtrl', function($scope, $log, Slot, Enum, $location, $timeout) {
    // $scope is needed for angularjs to work properly and should not be removed. Slot is a Webble World
    // available Service and is needed for any form of Slot manipulation inside this template and should neither be
    // removed.
    // cleanupService is just a custom service used as an example, but any services needed (Core Services and Webble
    // specific) must be included in the controller call. If your Webble support multiple languages, include
    // gettextCatalog and gettext in your controller, if not, then they may be removed.
    // dbService is basically only needed to access API access keys, if such are not needed it can be removed.
    // Try to avoid running any code at the creation of the controller, unless you know it is completely independent
    // of any of the other files, this is due to file loading order. Instead make your first code calls inside the
    // coreCall_Init function which will be called as soon as all files including the DOM of the Webble is done loading.

    //=== PROPERTIES ====================================================================
    $scope.stylesToSlots = {
        densityAppWrapper: ['width', 'height', 'background-color', 'border', 'border-radius', 'opacity'],
    };

    $scope.customMenu = [];

    $scope.displayText = "Loading the 3D Density environment. Please wait...";

    var neededChildren = {};
    var loadedChildren = {};

    var setupDone = false;

    var listeners = [];

    var inPortal = false;

    $scope.doDebugLogging = true;
    function debugLog(message) {
	if($scope.doDebugLogging) {
	    $log.log("DensityApp: " + message);
	}
    };

    //=== EVENT HANDLERS ================================================================


    //=== METHODS & FUNCTIONS ===========================================================


    //===================================================================================
    // Webble template Initialization
    // If any initiation needs to be done when the webble is created it is here that
    // should be executed. the saved def object is sent as a parameter in case it
    // includes data this webble needs to retrieve.
    // If this function is empty and unused it can safely be deleted.
    // Possible content for this function is as follows:
    // *Add own slots
    // *Set the default slot
    // *Set Custom Child Container
    // *Create Value watchers for slots and other values
    //===================================================================================
    $scope.coreCall_Init = function(theInitWblDef){
        $scope.setDefaultSlot('');


	// ===============================================================================
	// -------- Guess if we are running in the Hands-on Portal or in Webble World ----
	// ===============================================================================

	var url = (window.location != window.parent.location)
            ? document.referrer
            : document.location;

	debugLog("I believe my parent is on URL: " + url);
	var urlLower = url.toString().toLowerCase();
	inPortal = false;

	if(urlLower.indexOf("/portal/") >= 0) {
	    inPortal = true;
	} else {
	    if(urlLower.indexOf("https://wws.meme.hokudai.ac.jp/#/app") >= 0) {
		inPortal = false;
	    } else {
		inPortal = true;
	    }
	}

	debugLog("In Portal: " + inPortal);

	// ===============================================================================
	// -------- When running in the Hands-on Portal, turn off menus etc. -------------
	// ===============================================================================

	if(inPortal) {
	    $scope.setExecutionMode(1);

	    $scope.setMWPVisibility(false);
	    $scope.setVCVVisibility(false);
	    $scope.setMenuModeEnabled(false);
	}

	$scope.set("root:opacity", 0.1);


	$scope.registerWWEventListener(Enum.availableWWEvents.loadingWbl, function(eventData){
	    var newVal = eventData.targetId;

	    // debugLog("loadingWebble! " + newVal);

	    if(setupDone) {
		// no need to do anything
	    } else {
		var thisChild = $scope.getWebbleByInstanceId(newVal);
		var name = thisChild.scope().theWblMetadata['displayname'];

		if(name && name !== "") {
		    addNewlyLoadedChild(newVal, name);  
		}
	    }

	});

	listeners.push($scope.registerWWEventListener(Enum.availableWWEvents.slotChanged, function(eventData){
	    mySlotChange(eventData);
	}));

	loadWebbleDefs();

	$(window).bind("resize", onResize); // to update the Webble sizes when the browser window is resized
    };
    //===================================================================================

    function mySlotChange(eventData) {
    }
    
    var addNewlyLoadedChild = function(webbleID, name) {
	// debugLog("addNewlyLoadedChild, " + webbleID + " " + name);
	if(!setupDone) {
	    
	    if(loadedChildren.hasOwnProperty(name)) {
		loadedChildren[name].push(webbleID);
	    } else {
		return;
	    }
	    
	    if(name.indexOf("DataSource") >= 0) {
	    	listeners.push($scope.registerWWEventListener(Enum.availableWWEvents.slotChanged, function(eventData){
	    	    dataSourceUpdated(loadedChildren["DigitalDashboardSmartDataSource"][0]);
	    	}, webbleID, 'ProvidedFormatChanged'));
	    	listeners.push($scope.registerWWEventListener(Enum.availableWWEvents.slotChanged, function(eventData){
	    	    dataSourceUpdated(loadedChildren["DigitalDashboardSmartDataSource"][0]);
	    	}, webbleID, 'DataChanged'));
	    }

	    $scope.getWebbleByInstanceId(webbleID).scope().set("root:opacity", 0);

	    // debugLog("check if we should duplicate " + name);
	    // check if this is a newly loaded template and if we should duplicate this
	    if(loadedChildren[name].length == 1) {
		if(neededChildren[name] > loadedChildren[name].length) {
		    var original = $scope.getWebbleByInstanceId(webbleID); // duplicate this Webble to get as many as we need
		    for(var copies = loadedChildren[name].length; copies < neededChildren[name]; copies++) {
			// debugLog("making more " + name + " Webbles.");
			original.scope().duplicate({x: 15, y: 15}, undefined);
		    }
		    
		    return; // wait for the duplicates to arrive
		}
	    }
	    
	    // debugLog(" check if we have everything");
	    // check if all the Webbles we need are here yet
	    var allHere = true;
	    for (var type in neededChildren) {
		if (neededChildren.hasOwnProperty(type)) {
		    // debugLog("check if we have " + type + ", want " + neededChildren[type] + ", have " + loadedChildren[type].length);
		    if(neededChildren[type] > loadedChildren[type].length) {
			// debugLog("not enough " + type);
			allHere = false;

			if(loadedChildren[type].length == 0) {
			    // debugLog("load one " + type);
			    $scope.downloadWebbleDef(type);
			}
			break;
		    }
		}
	    }

	    if(allHere) {
		// debugLog("all Webbles loaded.");
		setAllWebbleSlotsEtc();
	    }
	} 
    };

    function onResize() {	
	debugLog("onResize called");

	var windowWidth = $(window).width();
	var windowHeight = $(window).height();
	if(!inPortal) {
	    windowHeight -= 100;
	}

	var dataLeft = 250;
	var dataTop  = 10;
	var vizLeft = 5;
	var vizTop = 105;
	if(windowHeight < windowWidth) {
	    dataLeft = 5;
	    dataTop = 105
	    vizLeft = 250;
	    vizTop = 10
	}

	var fontSize = 11;

	if(loadedChildren["DigitalDashboardSmartDataSource"].length > 0) {
	    var datasrc = $scope.getWebbleByInstanceId(loadedChildren["DigitalDashboardSmartDataSource"][0]);	
	    datasrc.scope().set("root:top", dataTop);
	    datasrc.scope().set("root:left", dataLeft);
	}

	if(loadedChildren["DigitalDashboardPlugin3DDensityPlotAdv"].length > 0) {
	    var n = 256;
	    var cw = Math.max(1, Math.min(Math.ceil((windowWidth - vizLeft - 50) / 2 / (2*n)), Math.floor((windowHeight - vizTop - 60) / (2*n))));
	    var zoom = Math.max(200, Math.min(windowWidth - vizLeft - 2*cw * 256 - 50, windowHeight - vizTop - 60));

	    var viz = $scope.getWebbleByInstanceId(loadedChildren["DigitalDashboardPlugin3DDensityPlotAdv"][0]);	
	    viz.scope().set("root:top", vizTop);
	    viz.scope().set("root:left", vizLeft);
	    viz.scope().set("DrawingArea:width", cw * 256 * 2 + 20);
	    viz.scope().set("DrawingArea:height", cw * 256 * 2 + 20);
	    viz.scope().set("CellWidth", cw);
	    viz.scope().set("ZoomSpace", zoom);

	    debugLog("viz moved and set to " + vizTop + " " + vizLeft + " " + cw + " " + zoom);
	}
    }
	
    var setAllWebbleSlotsEtc = function() {
	if(setupDone) {
	    return;
	}

	var windowWidth = $(window).width();
	var windowHeight = $(window).height();
	if(!inPortal) {
	    windowHeight -= 100;
	}

	for (var t in loadedChildren) {
            if (loadedChildren.hasOwnProperty(t)) {
                for(var w = 0; w < loadedChildren[t].length; w++) {
                    $scope.getWebbleByInstanceId(loadedChildren[t][w]).scope().set("root:opacity", 1);
                }
            }
	}

	var dashboard = $scope.getWebbleByInstanceId(loadedChildren["DigitalDashboard"][0]);
	dashboard.scope().set("root:top", 10);
	dashboard.scope().set("root:left", 5);
	dashboard.scope().set("DrawingArea:width", 120);
	dashboard.scope().set("DrawingArea:height", 60);

	dashboard.scope().set("Colors", {"skin":{"text":"#FFFFFF","color":"#000000","border":"#DD6A3D","gradient":[{"pos":0,"color":"#000000"},{"pos":0.75,"color":"#000000"},{"pos":1,"color":"#000000"}]},"selection":{"color":"#FFFACD","border":"#FF2500","gradient":[{"pos":0,"color":"#FFFACD"},{"pos":1,"color":"#FFFFDD"}]},"groups":{"0":{"color":"#888888","gradient":[{"pos":0,"color":"#888888"},{"pos":0.75,"color":"#999999"}]},"1":{"color":"#0000FF","gradient":[{"pos":0,"color":"#CCCCFF"},{"pos":0.75,"color":"#0000FF"}]},"2":{"color":"#7FFF00","gradient":[{"pos":0,"color":"#E5FFCC"},{"pos":0.75,"color":"#7FFF00"}]},"3":{"color":"#8A2BE2","gradient":[{"pos":0,"color":"#E8D5F9"},{"pos":0.75,"color":"#8A2BE2"}]},"4":{"color":"#FF7F50","gradient":[{"pos":0,"color":"#FFE5DC"},{"pos":0.75,"color":"#FF7F50"}]},"5":{"color":"#DC143C","gradient":[{"pos":0,"color":"#F8D0D8"},{"pos":0.75,"color":"#DC143C"}]},"6":{"color":"#006400","gradient":[{"pos":0,"color":"#CCE0CC"},{"pos":0.75,"color":"#006400"}]},"7":{"color":"#483D8B","gradient":[{"pos":0,"color":"#DAD8E8"},{"pos":0.75,"color":"#483D8B"}]},"8":{"color":"#FF1493","gradient":[{"pos":0,"color":"#FFD0E9"},{"pos":0.75,"color":"#FF1493"}]},"9":{"color":"#1E90FF","gradient":[{"pos":0,"color":"#D2E9FF"},{"pos":0.75,"color":"#1E90FF"}]},"10":{"color":"#FFD700","gradient":[{"pos":0,"color":"#FFF7CC"},{"pos":0.75,"color":"#FFD700"}]},"11":{"color":"#8B4513","gradient":[{"pos":0,"color":"#E8DAD0"},{"pos":0.75,"color":"#8B4513"}]},"12":{"color":"#FFF5EE","gradient":[{"pos":0,"color":"#FFFDFC"},{"pos":0.75,"color":"#FFF5EE"}]},"13":{"color":"#00FFFF","gradient":[{"pos":0,"color":"#CCFFFF"},{"pos":0.75,"color":"#00FFFF"}]},"14":{"color":"#000000","gradient":[{"pos":0,"color":"#CCCCCC"},{"pos":0.75,"color":"#000000"}]}}});
	
	var dataLeft = 250;
	var dataTop  = 10;
	var vizLeft = 5;
	var vizTop = 105;
	if(windowHeight < windowWidth) {
	    dataLeft = 5;
	    dataTop = 105
	    vizLeft = 250;
	    vizTop = 10
	}

	var fontSize = 11;

	var datasrc = $scope.getWebbleByInstanceId(loadedChildren["DigitalDashboardSmartDataSource"][0]);	
	datasrc.scope().set("root:top", dataTop);
	datasrc.scope().set("root:left", dataLeft);
	datasrc.scope().set("Data", {});

	datasrc.scope().paste(dashboard);

	var n = 256;
	var cw = Math.max(1, Math.min(Math.ceil((windowWidth - vizLeft - 50) / 2 / (2*n)), Math.floor((windowHeight - vizTop - 60) / (2*n))));
	var zoom = Math.max(200, Math.min(windowWidth - vizLeft - 2*cw * 256 - 50, windowHeight - vizTop - 60));

	var viz = $scope.getWebbleByInstanceId(loadedChildren["DigitalDashboardPlugin3DDensityPlotAdv"][0]);	
	viz.scope().set("root:top", vizTop);
	viz.scope().set("root:left", vizLeft);
	viz.scope().set("CellWidth", cw);
	viz.scope().set("ZoomSpace", zoom);

	viz.scope().paste(dashboard);

        $timeout(function()
		 {
		     $scope.getWebbleByInstanceId(loadedChildren["DigitalDashboard"][0]).scope().set("Mapping",
												     {"plugins":[{"name":"Density Plot Advanced","grouping":true,"sets":[{"fields":[{"name":"3D Density Data","assigned":[{"sourceName":"SMART Data Source","dataSetName":"SMART Data Source: ","dataSetIdx":0,"fieldName":"3D Array"}],"template":false,"added":false}]}]}]}
												    )}, 
		 1);

	setupDone = true;

	$scope.displayText = "Density App Loaded";
    };
    
    function dataSourceUpdated(webbleID) {
        $timeout(function()
		 {
		     $scope.getWebbleByInstanceId(loadedChildren["DigitalDashboard"][0]).scope().set("Mapping",
												     {"plugins":[{"name":"Density Plot Advanced","grouping":true,"sets":[{"fields":[{"name":"3D Density Data","assigned":[{"sourceName":"SMART Data Source","dataSetName":"SMART Data Source: ","dataSetIdx":0,"fieldName":"3D Array"}],"template":false,"added":false}]}]}]}
												    )}, 
		 1);
    }

    var loadWebbleDefs = function() {
	neededChildren = {};
	loadedChildren = {};
	
	neededChildren["DigitalDashboard"] = 1;
	neededChildren["DigitalDashboardPlugin3DDensityPlotAdv"] = 1;
	neededChildren["DigitalDashboardSmartDataSource"] = 1;

	for(var w in neededChildren) {
	    loadedChildren[w] = [];
	}

	$scope.downloadWebbleDef("DigitalDashboard");
    };


    //===================================================================================
    // Webble template Interaction Object Activity Reaction
    // If this template has its own custom Interaction balls that needs to be taken care
    // of when activated, then it is here where that should be executed.
    // If this function is empty and unused it can safely be deleted.
    //===================================================================================
    $scope.coreCall_Event_InteractionObjectActivityReaction = function(event){
	var targetName = $(event.target).scope().getName();

	if (targetName != ""){
	    //=== [TARGET NAME] ====================================
	    //=============================================
	}
    };
    //===================================================================================


    //===================================================================================
    // Webble template Menu Item Activity Reaction
    // If this template has its own custom menu items that needs to be taken care of,
    // then it is here where that should be executed.
    // If this function is empty and unused it can safely be deleted.
    //===================================================================================
    $scope.coreCall_Event_WblMenuActivityReaction = function(itemName){
    };
    //===================================================================================


    //===================================================================================
    // Webble template Create Custom Webble Definition
    // If this template wants to store its own private data in the Webble definition it
    // can create that custom object here and return to the core.
    // If this function is empty and unused it can safely be deleted.
    //===================================================================================
    $scope.coreCall_CreateCustomWblDef = function(){
	var customWblDefPart = {

	};

	return customWblDefPart;
    };
    //===================================================================================


    //=== CTRL MAIN CODE ======================================================================

});
//=======================================================================================

// More Controllers may of course be added here if needed
//======================================================================================================================
