//======================================================================================================================
// Controllers for DigitalDashboardPluginMap for Webble World v3.0 (2013)
// Created By: Jonas Sjobergh
//======================================================================================================================

//=======================================================================================
// WEBBLE CONTROLLER
// This is the Main controller for this Webble Template
// NOTE: This file must exist and be an AngularJS Controller declared as seen below.
//=======================================================================================
wblwrld3App.controller('mapPluginWebbleCtrl', function($scope, $log, $timeout, Slot, Enum) {

    //=== PROPERTIES ====================================================================

    $scope.stylesToSlots = {
        mapDrawingArea: ['width', 'height', 'background-color']
    };

    $scope.customMenu = [];

    $scope.customInteractionBalls = [];

    $scope.displayText = "Map";

    var myInstanceId = -1;
    
    var lastSeenGlobalSelections = [];

    var mouseIsDown = false;
    var mouseDownPos = null;
    var selectionRect = null;
    var shiftPressed = false;
    var ctrlPressed = false;
    var shouldClearSelections = true;

    var lowerLimit = 100;
    var upperLimit = 350;

    // graphics

    var selections = []; // the graphical ones

    var circles = [];
    var lines = [];

    // layout
    var leftMarg = 10;
    var topMarg = 10;
    var rightMarg = 10;
    var bottomMarg = 10;
    var fontSize = 11;

    var colorPalette = null;
    var useGlobalGradients = false;

    var quickRenderThreshold = 500;

    var textColor = "#000000";
    var currentColors = null;

    var lowValCol = "#0000FF";
    var highValCol = "#FF5500";

    var clickStart = null;

    // data from parent

    var lats1 = [];
    var lons1 = [];
    var lats2 = [];
    var lons2 = [];
    var vals1 = [];
    var isLines = [];
    var isHeatmap = [];

    var haveLines = false;
    var haveDots = false;
    var haveHeatmap = false;
    var alwaysVote = false;

    var dotSize = 5;
    var lineWidth = 2;
    var transparency = 1;

    var Ns = [];
    var N = 0;

    var limits = {'minX':0, 'maxX':0, 'minY':0, 'maxY':0};
    var unique = 0; // number of data points with non-null values
    var NULLs = 0;

    var localSelections = []; // the data to send to the parent

    var noofGroups = 1;
    var drawH = 1;
    var drawW = 1;

    var internalSelectionsInternallySetTo = {};

    var myCanvas = null;
    var myCtx = null;
    var dropCanvas = null;
    var dropCtx = null;

    // map stuff

    var map = null;
    var mapDiv = null;

    var mapZoom = 8;

    var mapCenterLat = 43.0667;
    var mapCenterLon = 141.35;

    var mapLeftLon = 0;
    var mapRightLon = 0;
    var mapTopLat = 0;
    var mapBottomLat = 0;

    var dropXfr = {'left':leftMarg, 'top':topMarg, 'right':leftMarg*2, 'bottom':topMarg * 2, "forParent":{'idSlot':'DataIdSlot', 'name':'Start Longitude', 'type':'longitude', 'slot':'Longitude1'}, "label":"Line src lon", "rotate":false};
    var dropYfr = {'left':2, 'top':topMarg, 'right':leftMarg, 'bottom':topMarg * 2, "forParent":{'idSlot':'DataIdSlot', 'name':'Start Latitude', 'type':'latitude', 'slot':'Latitude1'}, "label":"Line src lat", "rotate":true};
    var dropXto = {'left':leftMarg, 'top':topMarg, 'right':leftMarg*2, 'bottom':topMarg * 2, "forParent":{'idSlot':'DataIdSlot', 'name':'End Longitude', 'type':'longitude', 'slot':'Longitude2'}, "label":"Line dst lon", "rotate":false};
    var dropYto = {'left':2, 'top':topMarg, 'right':leftMarg, 'bottom':topMarg * 2, "forParent":{'idSlot':'DataIdSlot', 'name':'End Latitude', 'type':'latitude', 'slot':'Latitude2'}, "label":"Line dst lat", "rotate":true};
    var dropXpt = {'left':leftMarg, 'top':topMarg, 'right':leftMarg*2, 'bottom':topMarg * 2, "forParent":{'idSlot':'DataIdSlot', 'name':'Point Longitude', 'type':'longitude', 'slot':'Longitude1'}, "label":"Pt lon", "rotate":false};
    var dropYpt = {'left':2, 'top':topMarg, 'right':leftMarg, 'bottom':topMarg * 2, "forParent":{'idSlot':'DataIdSlot', 'name':'Point Latitude', 'type':'latitude', 'slot':'Latitude1'}, "label":"Pt lat", "rotate":true};

    var allDropZones = [dropXpt, dropXfr, dropXto, dropYpt, dropYfr, dropYto];

    //=== EVENT HANDLERS ================================================================


    $scope.fixDroppable = function () {
	$scope.theView.find('#theCanvas').droppable({ 
	    over: function(e, ui) {
		if(e.target.id == "theCanvas") {
		    updateDropZones(textColor, 1, true);
		}
	    },
	    out: function() {
		updateDropZones(textColor, 0.3, false);
	    },
	    tolerance: 'pointer',
	    drop: function(e, ui){
		// debugLog("drop location is: '" + e.target.id + "'");
		// debugLog("dropped item is: '" + ui.draggable.attr('id') + "'");

		if(e.target.id == "theCanvas") {

		    e.preventDefault();

		    var xpos = e.offsetX;
		    var ypos = e.offsetY;
		    var ok = false;
		    
		    var x = e.originalEvent.pageX - $(this).offset().left;
		    var y = e.originalEvent.pageY - $(this).offset().top; 
		    
		    xpos = x;
		    ypos = y;

		    for(var d = 0; !ok && d < allDropZones.length; d++) {
			var dropZone = allDropZones[d];
			
			if(xpos <= dropZone.right
			   && xpos >= dropZone.left
			   && ypos >= dropZone.top
			   && ypos < dropZone.bottom) {
			    f = dropZone.forParent;
			    ok = true;
			} 
		    } 
		    if(ok) {
			$scope.set('DataDropped', {"dataSourceField":ui.draggable.attr('id'), "pluginField":f});
		    } 
		}
		updateDropZones(textColor, 0.3, false);
	    }
	});
    };

    //=== METHODS & FUNCTIONS ===========================================================

    function mapMouseDown(e){
        if(e.which === 1){
            e.stopPropagation();
        }
    }
    
    function initializeMapAPI () {

	debugLog("initializeMapAPI");

	var currentPlace = new google.maps.LatLng(mapCenterLat, mapCenterLon);

        var mapOptions = {
            backgroundColor: "black",
            center: currentPlace,
            zoom: mapZoom
        };

	mapDiv = $scope.theView.parent().find("#mapDiv");
	mapDiv.bind('mousedown', mapMouseDown);
	
        map = new google.maps.Map(mapDiv[0], mapOptions);
        // placesService = new google.maps.places.PlacesService(map);
        infowindow = new google.maps.InfoWindow();

        google.maps.event.addListener(map,'center_changed',function() {
	    // debugLog("center_changed");

            var currentPlace = map.getCenter();

	    var newMapCenterLat = currentPlace.lat();
	    var newMapCenterLon = currentPlace.lng();
	    
	    if(newMapCenterLat != mapCenterLat 
	       || newMapCenterLon != mapCenterLon) {

		mapCenterLat = newMapCenterLat;
		mapCenterLon = newMapCenterLon;

		$scope.set('MapCenterLatitude', mapCenterLat);
		$scope.set('MapCenterLongitude', mapCenterLon);

		// debugLog("map center_changed calls updateGraphics");
		updateGraphics();
	    }
        });

        google.maps.event.addListener(map,'zoom_changed',function() {
	    // debugLog("zoom_changed");

	    var newMapZoom = map.getZoom();
	    if(newMapZoom != mapZoom) {
		mapZoom = newMapZoom;
		$scope.set('ZoomLevel', mapZoom);
		
		// debugLog("map zoom_changed calls updateGraphics");
		updateGraphics();
	    }
        });

	google.maps.event.addListener(map, 'mousemove', function (e) {
	    if (mouseIsDown) {
		if (selectionRect !== null)
		{
		    var bounds = new google.maps.LatLngBounds();
		    bounds.extend(mouseDownPos);
		    bounds.extend(e.latLng);
		    selectionRect.setBounds(bounds);
		} else {
		    var bounds = new google.maps.LatLngBounds();
		    bounds.extend(mouseDownPos);
		    bounds.extend(e.latLng);

		    var cols = $scope.gimme("GroupColors");
		    var col = "#FFEBCD";
		    var border = "#FFA500";

		    if(cols && cols.hasOwnProperty("selection")
		      ) {
			if(cols.selection.hasOwnProperty("color")) {
			    col = cols.selection.color;
			}
			if(cols.selection.hasOwnProperty("border")) {
			    border = cols.selection.border;
			}
		    }

		    selectionRect = new google.maps.Rectangle({
			map: map,
			bounds: bounds,
			fillOpacity: 0.25,
			strokeWeight: 0.95,
			strokeColor: border,
			fillColor: col,
			clickable: false
		    });
		}
	    }
	});

	google.maps.event.addListener(map, 'mousedown', function (e) {
	    mouseIsDown = true;
	    mouseDownPos = e.latLng;
	    
	    if(ctrlPressed) {
		shouldClearSelections = false;
	    } else {
		shouldClearSelections = true;
	    }

	    if (shiftPressed) {
		map.setOptions({
                    draggable: true
		});
            } else {
		map.setOptions({
                    draggable: false
		});
	    }
	    
	});

	google.maps.event.addListener(map, 'mouseup', function (e) {
	    if(selectionRect !== null) {
		// new selection
		newSelection(selectionRect, !shouldClearSelections);
	    }
	    mouseIsDown = false;
	    // map.setOptions({
	    // 	draggable: false
            // });	
	});

	google.maps.event.addListener(map, 'mouseout', function (e) {
	    if(selectionRect !== null) {
		// new selection
		newSelection(selectionRect, !shouldClearSelections);
	    }
	    mouseIsDown = false;
	    // map.setOptions({
	    // 	draggable: false
            // });	
	});
    }
    
    $(window).keydown(function (evt) {
        if (evt.which === 16) { // shift
            shiftPressed = true;

	    map.setOptions({
                draggable: true
	    });
        }
        if (evt.which === 17) { // ctrl
            ctrlPressed = true;
        }
	if(evt.which === 224 // firefox command key
	   || evt.which === 91 // safari/chrome left command key
	   || evt.which === 93 // safari/chrome right command key
	   // opera uses 17, which is covered by the normal code above
	  ) {
	    // apple command key
            ctrlPressed = true;
	}
    }).keyup(function (evt) {
        if (evt.which === 16) { // shift
            shiftPressed = false;

	    map.setOptions({
                draggable: false
	    });
        }
        if (evt.which === 17) { // ctrl
            ctrlPressed = false;
        }	
	if(evt.which === 224 // firefox command key
	   || evt.which === 91 // safari/chrome left command key
	   || evt.which === 93 // safari/chrome right command key
	   // opera uses 17, which is covered by the normal code above
	  ) {
	    // apple command key
            ctrlPressed = false;
	}
    });


    $scope.doDebugLogging = true;
    function debugLog(message) {
	if($scope.doDebugLogging) {
	    $log.log("DigitalDashboard Map: " + message);
	}
    }

    function saveSelectionsInSlot() {
	// debugLog("saveSelectionsInSlot");

	var result = {};
	result.selections = [];
	for(var sel = 0; sel < selections.length; sel++) {
	    var bounds = selections[sel].getBounds();
	    var ne = bounds.getNorthEast();
	    var sw = bounds.getSouthWest();

	    result.selections.push({'minX':sw.lat(), 'maxX':ne.lat(), 'minY':sw.lng(), 'maxY':ne.lng()});
	}

	internalSelectionsInternallySetTo = result;
	$scope.set('InternalSelections', result);
    };

    function setSelectionsFromSlotValue() {
	// debugLog("setSelectionsFromSlotValue");

	var slotSelections = $scope.gimme("InternalSelections");
	if(typeof slotSelections === 'string') {
	    slotSelections = JSON.parse(slotSelections);
	}

	if(JSON.stringify(slotSelections) == JSON.stringify(internalSelectionsInternallySetTo)) {
	    // debugLog("setSelectionsFromSlotValue got identical value");
	    return;
	}

	if(slotSelections.hasOwnProperty("selections")) {
	    clearSelections();
	    
	    var cols = $scope.gimme("GroupColors");
	    var col = "#FFEBCD";
	    var border = "#FFA500";
	    
	    if(cols && cols.hasOwnProperty("selection")) {
		if(cols.selection.hasOwnProperty("color")) {
		    col = cols.selection.color;
		}
		if(cols.selection.hasOwnProperty("border")) {
		    border = cols.selection.border;
		}
	    }

	    for(var sel = 0; sel < slotSelections.selections.length; sel++) {
		var newSel = slotSelections.selections[sel];
		
		var X1 = newSel.minX;
		var X2 = newSel.maxX;
		
		var Y1 = newSel.minY;
		var Y2 = newSel.maxY;
		

		var bounds = new google.maps.LatLngBounds();
		var p1 = new google.maps.LatLng(newSel.minX, newSel.minY);
		var p2 = new google.maps.LatLng(newSel.maxX, newSel.maxY);
		bounds.extend(p1);
		bounds.extend(p2);

		
		selectionRect = new google.maps.Rectangle({
		    map: map,
		    bounds: bounds,
		    fillOpacity: 0.25,
		    strokeWeight: 0.95,
		    strokeColor: border,
		    fillColor: col,
		    clickable: false
		});

		selections.push(selectionRect);
		selectionRect = null;
	    }
	}
	
	updateLocalSelections(false);
	saveSelectionsInSlot();
    };

    
    function updateLocalSelections(selectAll) {
	// debugLog("updateLocalSelections");

	var nullAsUnselected = $scope.gimme('TreatNullAsUnselected');
	var nullGroup = 0;
	if(!nullAsUnselected) {
	    nullGroup = selections.length + 1; // get unused groupId
	}

	var dirty = false;
	
	// debugLog("selections before sorting: " + JSON.stringify(selections));
	selections.sort(function(a,b){var neA = a.getBounds().getNorthEast(); var neB = b.getBounds().getNorthEast(); var swA = a.getBounds().getSouthWest(); var swB = b.getBounds().getSouthWest(); return ((neA.lat()-swA.lat()) * (neA.lng() - swA.lng())) - ((neB.lat()-swB.lat()) * (neB.lng() - swB.lng()));}); // sort selections so smaller (area) ones are checked first.
	// debugLog("selections after sorting: " + JSON.stringify(selections));

	for(var set = 0; set < lats1.length; set++) {
	    var lon1 = lons1[set];
	    var lat1 = lats1[set];
	    var lon2;
	    var lat2;
	    var val1;

	    if(isLines[set]) {
		lon2 = lons2[set];
		lat2 = lats2[set];
	    }
	    var selArray = localSelections[set];

	    for(var i = 0; i < Ns[set]; i++) {
		var groupId = 1;
		
		if(lon1[i] === null
		   || lat1[i] === null
		   || (isLines[set] && (lon2[i] === null || lat2[i] === null))) {
		    newVal = nullGroup;
		} else {
		    if(selectAll) {
			newVal = 1;
		    } else {
			var groupId = 0;
			
			for(var span = 0; span < selections.length; span++) {
			    var inside = false;

			    if(isLines[set]) {
				var bounds = new google.maps.LatLngBounds();
				var p1 = new google.maps.LatLng(lat1[i], lon1[i]);
				var p2 = new google.maps.LatLng(lat2[i], lon2[i]);
				bounds.extend(p1);
				bounds.extend(p2);
				
				if(bounds.intersects(selections[span].getBounds())) {
				    inside = true;
				}
			    } else {
				var p1 = new google.maps.LatLng(lat1[i], lon1[i]);
				if(selections[span].getBounds().contains(p1)) {
				    inside = true;
				}
			    }

			    if(inside) {
				groupId = span + 1;
				break;
			    }
			}
			newVal = groupId;
		    }
		}

		if(newVal != selArray[i]) {
		    dirty = true;
		    selArray[i] = newVal;
		}
	    }
	}

	if(dirty) {
	    $scope.set('LocalSelections', {'DataIdSlot':localSelections});
	    $scope.set('LocalSelectionsChanged', !$scope.gimme('LocalSelectionsChanged')); // flip flag to tell parent we updated something
	} else {
	    // debugLog("local selections had not changed");
	}
    };


    function resetVars() {
	lats1 = [];
	lons1 = [];
	lats2 = [];
	lons2 = [];
	vals1 = [];

	isLines = [];
	isHeatmap = [];
	haveLines = false;
	haveDots = false;
	haveHeatmap = false;
	alwaysVote = false;

	Ns = [];
	N = 0;
	
	limits = {'minX':0, 'maxX':0, 'minY':0, 'maxY':0};
	unique = 0;
	NULLs = 0;

	localSelections = [];
    }

    function parseData() {
    	debugLog("parseData");

    	// parse parents instructions on where to find data, check that at least one data set is filled
    	var atLeastOneFilled = false;

    	var parentInput = $scope.gimme('DataValuesSetFilled');
    	if(typeof parentInput === 'string') {
    	    parentInput = JSON.parse(parentInput);
    	}

    	resetVars();

    	if(parentInput.length > 0) {
    	    var haveX1 = false;
    	    var haveY1 = false;
    	    var haveX2 = false;
    	    var haveY2 = false;
	    var haveVal = false;
    	    var lineField = false;
	    var heatmap = false;

    	    for(var i = 0; i < parentInput.length; i++) {
    		if(parentInput[i].hasOwnProperty("name") && parentInput[i].name == "Point Latitude") {
    		    haveX1 = true;
    		    lineField = false;

    		    // if(parentInput[i].hasOwnProperty("description")) {
    		    // 	$scope.dataSetName = parentInput[i]["description"];
    		    // }
    		}

    		if(parentInput[i].hasOwnProperty("name") && parentInput[i].name == "Point Longitude") {
    		    haveY1 = true;
    		    lineField = false;

    		    // if(parentInput[i].hasOwnProperty("description")) {
    		    // 	$scope.dataSetName = parentInput[i]["description"];
    		    // }
    		}

		
    		if(parentInput[i].hasOwnProperty("name") && parentInput[i].name == "Start Latitude") {
    		    haveX1 = true;
    		    lineField = true;

    		    // if(parentInput[i].hasOwnProperty("description")) {
    		    // 	$scope.dataSetName = parentInput[i]["description"];
    		    // }
    		}

    		if(parentInput[i].hasOwnProperty("name") && parentInput[i].name == "Start Longitude") {
    		    haveY1 = true;
    		    lineField = true;

    		    // if(parentInput[i].hasOwnProperty("description")) {
    		    // 	$scope.dataSetName = parentInput[i]["description"];
    		    // }
    		}

    		if(parentInput[i].hasOwnProperty("name") && parentInput[i].name == "End Latitude") {
    		    haveX2 = true;
    		    lineField = true;

    		    // if(parentInput[i].hasOwnProperty("description")) {
    		    // 	$scope.dataSetName = parentInput[i]["description"];
    		    // }
    		}

    		if(parentInput[i].hasOwnProperty("name") && parentInput[i].name == "End Longitude") {
    		    haveY2 = true;
    		    lineField = true;

    		    // if(parentInput[i].hasOwnProperty("description")) {
    		    // 	$scope.dataSetName = parentInput[i]["description"];
    		    // }
    		}


    		if(parentInput[i].hasOwnProperty("name") && parentInput[i].name == 'Cell Latitude') {
    		    haveX1 = true;
    		    lineField = false;
		    heatmap = true;
    		}

    		if(parentInput[i].hasOwnProperty("name") && parentInput[i].name == 'Cell Longitude') {
    		    haveY1 = true;
    		    lineField = false;
		    heatmap = true;
    		}

    		if(parentInput[i].hasOwnProperty("name") && parentInput[i].name == 'Cell Value') {
    		    haveVal = true;
    		    lineField = false;
		    heatmap = true;
    		}

    	    }

    	    if(haveX1 && haveY1 && !lineField && !heatmap) {
    		atLeastOneFilled = true;
    	    }
    	    if(haveX1 && haveX2 && haveY1 && haveY2 && lineField) {
    		atLeastOneFilled = true;
    	    }

    	    if(haveX1 && haveY1 && heatmap && haveVal) {
    		atLeastOneFilled = true;
    	    }
    	}
	
    	// debugLog("read parent input ", atLeastOneFilled);
	
    	var dataIsCorrupt = false;

    	if(atLeastOneFilled) {
    	    var idArrays = $scope.gimme('DataIdSlot');
    	    lons1 = $scope.gimme('Longitude1');
    	    lats1 = $scope.gimme('Latitude1');
    	    lons2 = $scope.gimme('Longitude2');
    	    lats2 = $scope.gimme('Latitude2');
	    vals1 = $scope.gimme('Value1');

    	    if(idArrays.length != lons1.length
    	       || idArrays.length != lats1.length) {
    		dataIsCorrupt = true;
    	    }
    	    if(lineField) {
    		if(idArrays.length != lons2.length
    		   || idArrays.length != lats2.length) {
    		    dataIsCorrupt = true;
    		}
    	    }
	    if(heatmap) {
		if(idArrays.length != vals1.length) {
    		    dataIsCorrupt = true;
    		}
    	    }

    	    if(idArrays.length <= 0) {
    		dataIsCorrupt = true;
    	    }

    	    if(!dataIsCorrupt) {
    		var sources = lats1.length;
		
    		for(var source = 0; source < sources; source++) {
    		    var idArray = idArrays[source];
    		    var lon1 = lons1[source];
    		    var lat1 = lats1[source];
		    
    		    if(idArray.length != lon1.length
    		       || idArray.length != lat1.length) {
    			dataIsCorrupt = true;
    		    }
    		    if(lineField){ 
    			var lon2 = lons2[source];
    			var lat2 = lats2[source];
    			if(idArray.length != lon2.length
    			   || idArray.length != lat2.length) {
    			    dataIsCorrupt = true;
    			}
    		    }
		    if(heatmap) {
			var val1 = vals1[source];
			if(idArray.length != val1.length)
			{
    			    dataIsCorrupt = true;
    			}
    		    }
		    
    		    if(idArray.length <= 0) {
    			dataIsCorrupt = true;
    		    }
    		}
    	    }

    	    if(!dataIsCorrupt) {
    		Ns = [];
    		var firstNonNullData = true;
    		var minXVal = 0;
    		var maxXVal = 0;
    		var minYVal = 0;
    		var maxYVal = 0;
		var minVVal = 0;
		var maxVVal = 0;

    		for(var source = 0; source < lats1.length; source++) {
    		    var lon1 = lons1[source];
    		    var lat1 = lats1[source];
    		    var lon2;
    		    var lat2;
    		    if(lineField){ 
    			lon2 = lons2[source];
    			lat2 = lats2[source];
    		    }
		    if(heatmap) {
			val1 = vals1[source];
		    }
		    

    		    N += lat1.length;
    		    Ns.push(lat1.length);
		    
    		    localSelections.push([]);
    		    isLines.push(false);
		    isHeatmap.push(false);

    		    for(i = 0; i < Ns[source]; i++) {
    			localSelections[source].push(0);

    			if(lon1[i] !== null 
    			   && lat1[i] !== null
    			   && (!lineField 
    			       || (lon2[i] !== null && lat2[i] !== null))
			   && (!heatmap
			       || vals1[i] !== null)
    			  ) {
			    
    			    unique++;



    			    var x1 = lon1[i];
    			    var y1 = lat1[i];
    			    var x2;
    			    var y2;
			    var v;

			    if(isNaN(x1) || isNaN(y1)) {
				dataIsCorrupt = true; // only null values
			    }

    			    if(lineField) {
    				x2 = lon2[i];
    				y2 = lat2[i];

    				if(x1 != x2 || y1 != y2) {
    				    isLines[source] = true;
    				}

				if(isNaN(x2) || isNaN(y2)) {
				    dataIsCorrupt = true; // only null values
				}	
    			    }
			    
			    if(heatmap) {
				isHeatmap[source] = true;

				v = val1[i];
				if(isNaN(v)) {
				    dataIsCorrupt = true;
				}
			    }

    			    if(firstNonNullData) {
    				firstNonNullData = false;

    				if(lineField) {
    				    minXVal = Math.min(x1, x2);
    				    maxXVal = Math.max(x1, x2);
    				    minYVal = Math.min(y1, y2);
    				    maxYVal = Math.max(y1, y2);
    				} else {
    				    minXVal = x1;
    				    maxXVal = x1;
    				    minYVal = y1;
    				    maxYVal = y1;
    				}
				if(heatmap) {
				    minVVal = v;
				    maxVVal = v;
				}
    			    } else {
    				if(lineField) { 
    				    minXVal = Math.min(x1, x2, minXVal);
    				    maxXVal = Math.max(x1, x2, maxXVal);
    				    minYVal = Math.min(y1, y2, minYVal);
    				    maxYVal = Math.max(y1, y2, maxYVal);
    				} else {
    				    minXVal = Math.min(x1, minXVal);
    				    maxXVal = Math.max(x1, maxXVal);
    				    minYVal = Math.min(y1, minYVal);
    				    maxYVal = Math.max(y1, maxYVal);
    				}
				if(heatmap) {
				    minVVal = Math.min(v, minVVal);
				    maxVVal = Math.max(v, maxVVal);
				}
    			    }
    			} else {
    			    NULLs++;
    			}
    		    }
    		}

    		if(firstNonNullData) {
    		    dataIsCorrupt = true; // only null values
    		} else {
		    for(var source = 0; source < isLines.length; source++) {
    			if(isLines[source]) {
    			    haveLines = true;
    			} else {
			    if(heatmap) {
				haveHeatmap = true;
			    } else {
    				haveDots = true;
			    }
    			}
		    }

    		    limits = {};
    		    limits.minX = minXVal;
    		    limits.maxX = maxXVal;
    		    limits.minY = minYVal;
    		    limits.maxY = maxYVal;

		    if(heatmap) {
			limits.minVal = minVVal;
			limits.maxVal = maxVVal;


    			var allLons = {};
    			var allLats = {};
			var allLonLats = {};
			alwaysVote = false;

    			for(var set = 0; set < Ns.length; set++) {
    			    var lon1 = lons1[set];
    			    var lat1 = lats1[set];

    			    for(var i = 0; i < Ns[set]; i++) {
    				allLons[lon1[i]] = 1;
    				allLats[lat1[i]] = 1;

				if(!alwaysVote) {
				    var lonlat = lon1[i].toString() + " " + lat1[i].toString();
				    if(allLonLats.hasOwnProperty(lonlat)) {
					alwaysVote = true;
				    } else {
					allLonLats[lonlat] = true;
				    }
				}
    			    }
			}

    			var sortedLons = [];
    			for(var lon in allLons) {
    	    		    if(allLons.hasOwnProperty(lon)) {
				if(typeof lon === 'string') {
    	    			    sortedLons.push(parseFloat(lon));
				} else {
    	    			    sortedLons.push(lon);
				}
    	    		    }
    			}

    			sortedLons.sort(function(a, b){return a-b});
    			var minLonDiff = 0;
    			if(sortedLons.length > 1) {
    	    		    minLonDiff = sortedLons[1] - sortedLons[0];
    			}
    			for(var i = 2; i < sortedLons.length; i++) {
    	    		    minLonDiff = Math.min(sortedLons[i] - sortedLons[i-1], minLonDiff);
    			}

    			var sortedLats = [];
    			for(var lat in allLats) {
    	    		    if(allLats.hasOwnProperty(lat)) {
				if(typeof lat === 'string') {
    	    			    sortedLats.push(parseFloat(lat));
				} else {
    	    			    sortedLats.push(lat);
				}
    	    		    }
    			}
    			sortedLats.sort(function(a, b){return a-b});
    			var minLatDiff = 0;
    			if(sortedLats.length > 1) {
    	    		    minLatDiff = sortedLats[1] - sortedLats[0];
    			}
    			for(var i = 2; i < sortedLats.length; i++) {
    	    		    minLatDiff = Math.min(sortedLats[i] - sortedLats[i-1], minLatDiff);
    			}

			limits.minLatDiff = minLatDiff;
			limits.minLonDiff = minLonDiff;
			limits.minLatDiff2 = minLatDiff/2;
			limits.minLonDiff2 = minLonDiff/2;
		    }
    		    // debugLog("parseData limits: " + JSON.stringify(limits));
    		}
    	    }
	    
    	    if(dataIsCorrupt) {
    		debugLog("data is corrupt");
    		resetVars();
    	    }
    	} else {
    	    debugLog("no data");
    	}

    	if(unique > 0) {
    	    updateLocalSelections(false);

	    // debugLog("ParseData calls updateGraphics");
	    updateGraphics();

    	} else { // no data
    	    $scope.set('LocalSelections', {'DataIdSlot':[]});

	    // debugLog("ParseData calls updateGraphics");
	    updateGraphics();
	}

    }



    // ==========================================================
    // Drawing on a bitmap stuff
    // ==========================================================


    function blendRGBAs(r,g,b,alpha, offset, pixels) {
	if(pixels[offset+3] > 0 && alpha < 255) {
	    // something drawn here already, blend alpha

	    var oldA = pixels[offset+3] / 255.0;
	    var newA = alpha / 255.0;

	    var remainA = (1 - newA) * oldA;
	    
	    var outA = newA + remainA;
	    if(outA > 0) {
		var oldR = pixels[offset];
		var oldG = pixels[offset+1];
		var oldB = pixels[offset+2];

		var outR = Math.min(255, (oldR * remainA + newA * r) / outA);
		var outG = Math.min(255, (oldG * remainA + newA * g) / outA);
		var outB = Math.min(255, (oldB * remainA + newA * b) / outA);
	    } else {
		var outR = 0;
		var outG = 0;
		var outB = 0;
	    }
	    pixels[offset] = outR;
	    pixels[offset+1] = outG;
	    pixels[offset+2] = outB;
	    pixels[offset+3] = Math.min(255, outA * 255);
	} else {
	    pixels[offset] = r;
	    pixels[offset+1] = g;
	    pixels[offset+2] = b;
	    pixels[offset+3] = alpha;
	}
    }

    // This line drawing function was copied from http://kodierer.blogspot.jp/2009/10/drawing-lines-silverlight.html
    // The code is not original to me. I was very slightly modified by me.
    /// <summary>
    /// Draws a colored line by connecting two points using a DDA algorithm (Digital Differential Analyzer).
    /// </summary>
    function drawLineDDA(pixels, X1, Y1, X2, Y2, r, g, b, alpha, ArrayLineWidth)
    {
	var W = Math.floor(leftMarg + drawW);
	var H = Math.floor(topMarg + drawH);

	var ALW = Math.floor(ArrayLineWidth);

	var x1 = Math.round(X1);
	var y1 = Math.round(Y1);
	var x2 = Math.round(X2);
	var y2 = Math.round(Y2);

        // Distance start and end point
        var dx = x2 - x1 + 1;
        var dy = y2 - y1 + 1;

        // Determine slope (absoulte value)
        var len = dy >= 0 ? dy : -dy;
        var lenx = dx >= 0 ? dx : -dx;
	var fatX = true;
        if (lenx > len)
        {
            len = lenx;
	    fatX = false;
        }

        // Prevent divison by zero
        if (len != 0)
        {
            // Init steps and start
            var incx = dx / len;
            var incy = dy / len;
            var x = x1;
            var y = y1;

            // Walk the line!
            for (var i = 0; i < len; i++)
            {
		var ry = Math.round(y);
		var rx = Math.round(x);
		
		for(var w = 0; w < lineWidth; w++) {
		    if(ry >= topMarg && ry < H
		       && rx >= leftMarg && rx < W) {

			var offset = (ry * ALW + rx) * 4;

			blendRGBAs(r,g,b,alpha, offset, pixels);
		    }
		    if(fatX) {
			rx++;
		    } else {
			ry++;
		    }
		}
                x += incx;
                y += incy;
            }
        }
    }

    function drawLineDDAfullalpha(pixels, X1, Y1, X2, Y2, r, g, b, alpha, ArrayLineWidth)
    {
	var W = Math.floor(leftMarg + drawW);
	var H = Math.floor(topMarg + drawH);

	var ALW = Math.floor(ArrayLineWidth);

	var x1 = Math.round(X1);
	var y1 = Math.round(Y1);
	var x2 = Math.round(X2);
	var y2 = Math.round(Y2);

        // Distance start and end point
        var dx = x2 - x1 + 1;
        var dy = y2 - y1 + 1;

        // Determine slope (absoulte value)
        var len = dy >= 0 ? dy : -dy;
        var lenx = dx >= 0 ? dx : -dx;
	var fatX = true;
        if (lenx > len)
        {
            len = lenx;
	    fatX = false;
        }

        // Prevent divison by zero
        if (len != 0)
        {
            // Init steps and start
            var incx = dx / len;
            var incy = dy / len;
            var x = x1;
            var y = y1;

            // Walk the line!
            for (var i = 0; i < len; i++)
            {
		var ry = Math.round(y);
		var rx = Math.round(x);
		
		for(var w = 0; w < lineWidth; w++) {
		    if(ry >= topMarg && ry < H
		       && rx >= leftMarg && rx < W) {

			var offset = (ry * ALW + rx) * 4;

			pixels[offset] = r;
			pixels[offset+1] = g;
			pixels[offset+2] = b;
			pixels[offset+3] = alpha;
		    }
		    if(fatX) {
			rx++;
		    } else {
			ry++;
		    }
		}
                x += incx;
                y += incy;
            }
        }
    }


    function putPixel(X, Y, alpha, r, g, b, pixels, ArrayLineWidth) {
	var W = Math.floor(leftMarg + drawW);
	var H = Math.floor(topMarg + drawH);

	var ALW = Math.floor(ArrayLineWidth);

        var x = Math.round(X);
	var y = Math.round(Y);

        var startPixelIdx = (y * ALW + x) * 4;

	if (x >= leftMarg && x < W) {
            if(y >= topMarg && y < H)
            {
		blendRGBAs(r,g,b, alpha, startPixelIdx, pixels);
	    }
        }
    }

    function putPixelFullAlpha(X, Y, alpha, r, g, b, pixels, ArrayLineWidth) {
	var W = Math.floor(leftMarg + drawW);
	var H = Math.floor(topMarg + drawH);

	var ALW = Math.floor(ArrayLineWidth);

        var x = Math.round(X);
	var y = Math.round(Y);

        var startPixelIdx = (y * ALW + x) * 4;

	if (x >= leftMarg && x < W) {
            if(y >= topMarg && y < H)
            {
                pixels[startPixelIdx] = r;
                pixels[startPixelIdx + 1] = g;
                pixels[startPixelIdx + 2] = b;
                pixels[startPixelIdx + 3] = alpha;
	    }
        }
    }

    
    function fillRect(X1, Y1, X2, Y2, alpha, r, g, b, pixels, ArrayLineWidth) {
	var W = Math.floor(leftMarg + drawW);
	var H = Math.floor(topMarg + drawH);

	var ALW = Math.floor(ArrayLineWidth);

        var xpos = Math.round(X1);
	var ypos = Math.round(Y1);
	var xend = Math.round(X2);
	var yend = Math.round(Y2);

        for (var x = xpos; x <= xend; x++)
        {
	    if (x >= leftMarg && x < W) {
		for (var y = ypos; y <= yend; y++)
		{
                    if(y >= topMarg && y < H)
                    {
			var offset = (y * ALW + x) * 4;

			blendRGBAs(r,g,b, alpha, offset, pixels);
                    }
		}
	    }
        }
    }

    function fillRectFullAlpha(X1, Y1, X2, Y2, alpha, r, g, b, pixels, ArrayLineWidth) {
	var W = Math.floor(leftMarg + drawW);
	var H = Math.floor(topMarg + drawH);

	var ALW = Math.floor(ArrayLineWidth);

        var xpos = Math.round(X1);
	var ypos = Math.round(Y1);
	var xend = Math.round(X2);
	var yend = Math.round(Y2);

        for (var x = xpos; x <= xend; x++)
        {
	    if (x >= leftMarg && x < W) {
		for (var y = ypos; y <= yend; y++)
		{
                    if(y >= topMarg && y < H)
                    {
			var offset = (y * ALW + x) * 4;
                        pixels[offset] = r;
                        pixels[offset + 1] = g;
                        pixels[offset + 2] = b;
                        pixels[offset + 3] = alpha;
                    }
		}
	    }
        }
    }

    function drawDot(X, Y, DOTSIZE, alpha, r, g, b, pixels, ArrayLineWidth) {
	var W = Math.floor(leftMarg + drawW);
	var H = Math.floor(topMarg + drawH);

	var ALW = Math.floor(ArrayLineWidth);

        var xpos = Math.round(X);
	var ypos = Math.round(Y);
	var dotSize = Math.round(DOTSIZE);
	var halfDot = Math.round(DOTSIZE/2);

        var startPixelIdx = (ypos * ALW + xpos) * 4;

        var r2 = Math.ceil(dotSize * dotSize / 4.0);

        for (var x = -halfDot; x < halfDot + 1; x++)
        {
	    if (x + xpos >= leftMarg && x + xpos < W) {
		var x2 = x * x;
		
		for (var y = -halfDot; y < halfDot + 1; y++)
		{
                    if(y + ypos >= topMarg && y + ypos < H)
                    {
			var y2 = y * y;
			
			if (y2 + x2 <= r2)
			{
			    var offset = (y * ALW + x) * 4;

			    blendRGBAs(r,g,b, alpha, startPixelIdx + offset, pixels);
			}
                    }
		}
	    }
        }
    }

    function drawDotfullalpha(X, Y, DOTSIZE, alpha, r, g, b, pixels, ArrayLineWidth) {
	var W = Math.floor(leftMarg + drawW);
	var H = Math.floor(topMarg + drawH);

	var ALW = Math.floor(ArrayLineWidth);

        var xpos = Math.round(X);
	var ypos = Math.round(Y);
	var dotSize = Math.round(DOTSIZE);
	var halfDot = Math.round(DOTSIZE/2);

        var startPixelIdx = (ypos * ALW + xpos) * 4;

        var r2 = Math.ceil(dotSize * dotSize / 4.0);

        for (var x = -halfDot; x < halfDot + 1; x++)
        {
	    if (x + xpos >= leftMarg && x + xpos < W) {
		var x2 = x * x;
		
		for (var y = -halfDot; y < halfDot + 1; y++)
		{
                    if(y + ypos >= topMarg && y + ypos < H)
                    {
			var y2 = y * y;
			
			if (y2 + x2 <= r2)
			{
			    var offset = (y * ALW + x) * 4;
                            pixels[startPixelIdx + offset] = r;
                            pixels[startPixelIdx + offset + 1] = g;
                            pixels[startPixelIdx + offset + 2] = b;
                            pixels[startPixelIdx + offset + 3] = alpha;
			}
                    }
		}
	    }
        }
    }


    function getGradientColorForGroup(group, x1,y1, x2,y2, alpha, myCanvas, myCtx) {
    	if(useGlobalGradients) {
    	    if(myCanvas === null) {
    		var myCanvasElement = $scope.theView.parent().find('#theCanvas');
    		if(myCanvasElement.length > 0) {
    		    myCanvas = myCanvasElement[0];
		}
	    }

    	    var W = myCanvas.width;
    	    if(typeof W === 'string') {
    		W = parseFloat(W);
    	    }
    	    if(W < 1) {
    		W = 1;
    	    }

    	    var H = myCanvas.height;
    	    if(typeof H === 'string') {
    		H = parseFloat(H);
    	    }
    	    if(H < 1) {
    		H = 1;
    	    }
	    
    	    x1 = 0;
    	    y1 = 0;
    	    x2 = W;
    	    y2 = H;
    	}		
	
    	if(colorPalette === null || colorPalette === undefined) {
    	    colorPalette = {};
    	}
 	
    	group = group.toString();

    	if(!colorPalette.hasOwnProperty(group)) {
    	    if(currentColors.hasOwnProperty('groups')) {
    		var groupCols = currentColors.groups;
		
    		for(var g in groupCols) {
    		    if(groupCols.hasOwnProperty(g)) {
    			colorPalette[g] = 'black';
			
    			if(groupCols[g].hasOwnProperty('color')) {
    			    colorPalette[g] = groupCols[g].color;
    			}
    		    }
    		}
    	    }
    	}
	
    	if(currentColors.hasOwnProperty("groups")) {
    	    var groupCols = currentColors.groups;
	    
    	    if(groupCols.hasOwnProperty(group) && myCtx !== null && groupCols[group].hasOwnProperty('gradient') && (x1 != x2 || y1 != y2)) {
    		var OK = true;
		
		try {
    		    var grd = myCtx.createLinearGradient(x1,y1,x2,y2);
    		    for(var i = 0; i < groupCols[group].gradient.length; i++) {
    			var cc = groupCols[group].gradient[i];
    			if(cc.hasOwnProperty('pos') && cc.hasOwnProperty('color')) {
			    if(alpha !== undefined) {
    				grd.addColorStop(cc.pos, hexColorToRGBA(cc.color, alpha));
			    }
			    else {
    				grd.addColorStop(cc.pos, cc.color);
			    }
    			} else {
    			    OK = false;
    			}
		    }
    		} catch(e) {
		    OK = false;
		}
		
    		if(OK) {
    		    return grd;
    		}
    	    }
    	}
	
    	if(colorPalette === null || !colorPalette.hasOwnProperty(group)) {
    	    return 'black';
    	} else {
    	    return colorPalette[group];
    	}
    };

    function getColorForGroup(group) {
    	if(colorPalette === null) {
    	    colorPalette = {};
    	}

    	group = group.toString();

    	if(!colorPalette.hasOwnProperty(group)) {
    	    if(currentColors.hasOwnProperty("groups")) {
    		var groupCols = currentColors.groups;
		
    		for(var g in groupCols) {
    		    if(groupCols.hasOwnProperty(g)) {
    			colorPalette[g] = '#000000';
			
    			if(groupCols[g].hasOwnProperty('color')) {
    			    colorPalette[g] = groupCols[g].color;
    			}
    		    }
    		}
    	    }
    	}
	
    	if(colorPalette === null || !colorPalette.hasOwnProperty(group)) {
    	    return '#000000';
    	} else {
    	    return colorPalette[group];
    	}
    }

    function hexColorToRGBAvec(color, alpha) {
	var res = [];

	if(typeof color === 'string'
	   && color.length == 7) {
	    
	    var r = parseInt(color.substr(1,2), 16);
	    var g = parseInt(color.substr(3,2), 16);
	    var b = parseInt(color.substr(5,2), 16);
	    var a = Math.max(0, Math.min(255, Math.round(alpha * 255)));
	    return [r, g, b, a];
	}
	return [0, 0, 0, 255];
    }

    function hexColorToRGBA(color, alpha) {
	if(typeof color === 'string'
	   && color.length == 7) {
	    
	    var r = parseInt(color.substr(1,2), 16);
	    var g = parseInt(color.substr(3,2), 16);
	    var b = parseInt(color.substr(5,2), 16);

	    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
	}
	return color;
    }


    function drawCartesianPlot() {
    	if(unique <= 0) {
    	    return;
    	}

	if(mapDiv === null) {
	    debugLog("no mapDiv to draw on");
	    return;
	}

	if(!map) {
	    debugLog("map not loaded yet");
	    return;
	}

	// debugLog("draw!");
	
    	currentColors = $scope.gimme("GroupColors");
    	if(typeof currentColors === 'string') {
    	    currentColors = JSON.parse(currentColors);
    	}


    	var globalSelections = [];
    	var globalSelectionsPerId = $scope.gimme('GlobalSelections');
    	if(globalSelectionsPerId.hasOwnProperty('DataIdSlot')) {
    	    globalSelections = globalSelectionsPerId['DataIdSlot'];
    	}

	lastSeenGlobalSelections = [];
	for(var set = 0; set < globalSelections.length; set++) {
	    lastSeenGlobalSelections.push([]);
	    for(var i = 0; i < globalSelections[set].length; i++) {
		lastSeenGlobalSelections[set].push(globalSelections[set][i]);
	    }
	}

	var scale = Math.pow(2, mapZoom);

	try {
	    var mapBounds = map.getBounds();
	    var mapNE = mapBounds.getNorthEast();
	    var mapSW = mapBounds.getSouthWest();
	    var proj = map.getProjection();
	    var NEpx = proj.fromLatLngToPoint(mapNE);
	    var SWpx = proj.fromLatLngToPoint(mapSW);
	    var NSpxs = SWpx.y * scale - NEpx.y * scale; // subtracting small numbers gives loss of precision?
	    var WEpxs = NEpx.x * scale - SWpx.x * scale;

    	    var mapMinLat = mapSW.lat();
    	    var mapMaxLat = mapNE.lat();
    	    var mapMinLon = mapSW.lng();
    	    var mapMaxLon = mapNE.lng();

    	    var passDateLine = false;
    	    if(mapMinLon > mapMaxLon) {
    		passDateLine = true;
    	    }

	    var worldWidth = 256 * scale;

	    var mapWorldWraps = false;
	    if(drawW > worldWidth) {
		mapWorldWraps = true;
	    }
	    var currentPlace = map.getCenter();
    	    var pCenter = proj.fromLatLngToPoint(currentPlace);

	} catch(e) {
	    debugLog("No map to draw on yet");
	    $timeout(function(){updateSize(); 	debugLog("DrawCartesian timeout function calls updateGraphics"); updateGraphics();});
	    return;
	}


	var col;
	var fill;

	var zeroTransp = 0.33;
	if(transparency < 1) {
	    zeroTransp *= transparency;
	}

	if(myCanvas === null) {
    	    var canvasElement = $scope.theView.parent().find('#theCanvas');
    	    if(canvasElement.length > 0) {
    		myCanvas = canvasElement[0];
	    }
	}
	
	if(myCtx === null) {
	    myCtx = myCanvas.getContext("2d");
	}

	myCtx.clearRect(0,0, myCanvas.width, myCanvas.height);


	var drawPretty = true;
	if(unique > quickRenderThreshold) {
	    drawPretty = false;
	    var rgba0 = hexColorToRGBAvec(getColorForGroup(0), zeroTransp);
	    var rgbaText = hexColorToRGBAvec(textColor, 1.0);
	    var imData = myCtx.getImageData(0, 0, myCanvas.width, myCanvas.height);
	    var pixels = imData.data;
	} else {
    	    var col0 = hexColorToRGBA(getColorForGroup(0), zeroTransp, myCanvas, myCtx);
    	    var fill0 = getGradientColorForGroup(0, 0,0,drawW,drawH, zeroTransp, myCanvas, myCtx);
	}

	for(var pass = 0; pass < 2; pass++) {
    	    for(var set = 0; set < Ns.length; set++) {
    		var lon1 = lons1[set];
    		var lat1 = lats1[set];

    		var lon2;
    		var lat2;
    		if(isLines[set]) {
    		    lon2 = lons2[set];
    		    lat2 = lats2[set];
    		}

    		var selArray = [];
    		if(set < globalSelections.length) {
    		    selArray = globalSelections[set];
    		}

    		for(var i = 0; i < Ns[set]; i++) {

    		    if(lon1[i] === null
    		       || lat1[i] === null
    		       || (isLines[set] && (lon2[i] === null || lat2[i] === null))) {
    			continue;
    		    }
		    
                    var groupId = 0;
		    
    		    if(i < selArray.length) {
    			groupId = selArray[i];
    		    }
		    
    		    if((groupId == 0 && pass != 0) || 
		       (groupId != 0 && pass == 0)) {
			continue;
		    }

    		    if(isLines[set]) {

			var bounds = new google.maps.LatLngBounds();
			var p1 = new google.maps.LatLng(lat1[i], lon1[i]);
			var p2 = new google.maps.LatLng(lat2[i], lon2[i]);
			bounds.extend(p1);
			bounds.extend(p2);
			
			if(bounds.intersects(mapBounds)) {

			    var p1px = proj.fromLatLngToPoint(p1);
			    var p2px = proj.fromLatLngToPoint(p2);

			    if(true || mapWorldWraps) {
				var x1 = leftMarg + Math.floor(drawW/2 + p1px.x * scale - pCenter.x * scale);
				var x2 = leftMarg + Math.floor(drawW/2 + p2px.x * scale - pCenter.x * scale);
			    } else {
				if(passDateLine && (lon1[i] > 180)) {
    	    			    var x1 = Math.floor(leftMarg + drawW - (NEpx.x * scale - p1px.x * scale));
				} else {
    				    var x1 = leftMarg + Math.floor(p1px.x * scale - SWpx.x * scale);
				}
				if(passDateLine && (lon2[i] > 180)) {
    	    			    var x2 = Math.floor(leftMarg + drawW - (NEpx.x * scale - p2px.x * scale));
				} else {
    				    var x2 = leftMarg + Math.floor(p2px.x * scale - SWpx.x * scale);
				}
			    }

    			    var y1 = topMarg + (p1px.y * scale - NEpx.y * scale);
    			    var y2 = topMarg + (p2px.y * scale - NEpx.y * scale);

    			    // var x1 = leftMarg + (p1px.x * scale - SWpx.x * scale) / WEpxs * drawW;
    			    // var y1 = topMarg + (p1px.y * scale - NEpx.y * scale) / NSpxs * drawH;
    			    // var x2 = leftMarg + (p2px.x * scale - SWpx.x * scale) / WEpxs * drawW;
    			    // var y2 = topMarg + (p2px.y * scale - NEpx.y * scale) / NSpxs * drawH;
			    

			    var offset = 0;
			    while(x1 + offset <= leftMarg + drawW
				  || x2 + offset <= leftMarg + drawW) {
				if(drawPretty) {
				    if(pass == 0) {
					col = col0;
				    } else {
					col = hexColorToRGBA(getColorForGroup(groupId), transparency, myCanvas, myCtx); // getColorForGroup(groupId);
				    }
				    
    				    myCtx.save();
    				    myCtx.beginPath();
    				    myCtx.strokeStyle = col;
    				    myCtx.lineWidth = lineWidth;
    				    myCtx.moveTo(x1 + offset, y1);
    				    myCtx.lineTo(x2 + offset, y2);
    				    myCtx.stroke();
    				    myCtx.restore();
				} else {
				    if(pass == 0) {
					col = rgba0;
				    } else {
					col = hexColorToRGBAvec(getColorForGroup(groupId), transparency);
				    }

				    if(transparency >= 1 && pass > 0) {
					drawLineDDAfullalpha(pixels, x1 + offset, y1, x2 + offset, y2, col[0], col[1], col[2], col[3], myCanvas.width);
				    } else {
					drawLineDDA(pixels, x1 + offset, y1, x2 + offset, y2, col[0], col[1], col[2], col[3], myCanvas.width);
				    }
				    // drawLineDDA(pixels, x1, y1, x2, y2, col[0], col[1], col[2], col[3], myCanvas.width);
				}
				offset += worldWidth;
			    }

			    offset = -worldWidth;
			    while(x1 + offset >= leftMarg
				  || x2 + offset >= leftMarg) {
				if(drawPretty) {
				    if(pass == 0) {
					col = col0;
				    } else {
					col = hexColorToRGBA(getColorForGroup(groupId), transparency, myCanvas, myCtx); // getColorForGroup(groupId);
				    }
				    
    				    myCtx.save();
    				    myCtx.beginPath();
    				    myCtx.strokeStyle = col;
    				    myCtx.lineWidth = lineWidth;
    				    myCtx.moveTo(x1 + offset, y1);
    				    myCtx.lineTo(x2 + offset, y2);
    				    myCtx.stroke();
    				    myCtx.restore();
				} else {
				    if(pass == 0) {
					col = rgba0;
				    } else {
					col = hexColorToRGBAvec(getColorForGroup(groupId), transparency);
				    }

				    if(transparency >= 1 && pass > 0) {
					drawLineDDAfullalpha(pixels, x1 + offset, y1, x2 + offset, y2, col[0], col[1], col[2], col[3], myCanvas.width);
				    } else {
					drawLineDDA(pixels, x1 + offset, y1, x2 + offset, y2, col[0], col[1], col[2], col[3], myCanvas.width);
				    }
				    // drawLineDDA(pixels, x1, y1, x2, y2, col[0], col[1], col[2], col[3], myCanvas.width);
				}
				offset -= worldWidth;
			    }

			}
    		    } else { // dots

			var p1 = new google.maps.LatLng(lat1[i], lon1[i]);
			if(mapBounds.contains(p1)) {
			    var p1px = proj.fromLatLngToPoint(p1);

			    if(true || mapWorldWraps) {
				var x1 = leftMarg + Math.floor(drawW/2 + p1px.x * scale - pCenter.x * scale);
			    } else if(passDateLine && (lon1[i] > 180)) {
    	    			var x1 = Math.floor(leftMarg + drawW - (NEpx.x * scale - p1px.x * scale));
			    } else {
    				var x1 = leftMarg + (p1px.x * scale - SWpx.x * scale);
			    }
    			    var y1 = topMarg + (p1px.y * scale - NEpx.y * scale);
    			    // var x1 = leftMarg + (p1px.x * scale - SWpx.x * scale) / WEpxs * drawW;
    			    // var y1 = topMarg + (p1px.y * scale - NEpx.y * scale) / NSpxs * drawH;
			    
			    var offset = 0;
			    while(x1 + offset <= leftMarg + drawW) {
				if(drawPretty) {
				    if(pass == 0) {
    					if(!useGlobalGradients) {
    		     			    fill = getGradientColorForGroup(0, x1-dotSize,y1-dotSize,x1+dotSize,y1+dotSize, zeroTransp, myCanvas, myCtx);
    					} else {
					    fill = fill0;
					}
				    } else {
					if(transparency >= 1) {
    					    fill = getGradientColorForGroup(groupId, x1-dotSize,y1-dotSize,x1+dotSize,y1+dotSize, 1, myCanvas, myCtx);
					} else {
					    fill = getGradientColorForGroup(groupId, x1-dotSize,y1-dotSize,x1+dotSize,y1+dotSize, transparency, myCanvas, myCtx);
					}
				    }
				    
    				    myCtx.save();
    				    myCtx.beginPath();
    				    myCtx.arc(x1 + offset, y1, dotSize, 0, 2 * Math.PI, false);
    				    myCtx.fillStyle = fill;
    				    myCtx.fill();
    				    myCtx.lineWidth = 1;
    				    myCtx.strokeStyle = col;
    				    myCtx.stroke();
    				    myCtx.restore();
				} else {
				    if(transparency >= 1) {
					rgba = hexColorToRGBAvec(getColorForGroup(groupId), 1);
				    } else {
					rgba = hexColorToRGBAvec(getColorForGroup(groupId), transparency);
				    }

				    if(transparency >= 1 && pass > 0) {
					drawDotfullalpha(x1 + offset, y1, dotSize, rgba[3], rgba[0], rgba[1], rgba[2], pixels, myCanvas.width);
				    } else {
					drawDot(x1 + offset, y1, dotSize, rgba[3], rgba[0], rgba[1], rgba[2], pixels, myCanvas.width);
				    }
				}
				offset += worldWidth;
			    }


			    offset = -worldWidth;
			    while(x1 + offset >= leftMarg) {
				if(drawPretty) {
				    if(pass == 0) {
    					if(!useGlobalGradients) {
    		     			    fill = getGradientColorForGroup(0, x1-dotSize,y1-dotSize,x1+dotSize,y1+dotSize, zeroTransp, myCanvas, myCtx);
    					} else {
					    fill = fill0;
					}
				    } else {
					if(transparency >= 1) {
    					    fill = getGradientColorForGroup(groupId, x1-dotSize,y1-dotSize,x1+dotSize,y1+dotSize, 1, myCanvas, myCtx);
					} else {
					    fill = getGradientColorForGroup(groupId, x1-dotSize,y1-dotSize,x1+dotSize,y1+dotSize, transparency, myCanvas, myCtx);
					}
				    }
				    
    				    myCtx.save();
    				    myCtx.beginPath();
    				    myCtx.arc(x1 + offset, y1, dotSize, 0, 2 * Math.PI, false);
    				    myCtx.fillStyle = fill;
    				    myCtx.fill();
    				    myCtx.lineWidth = 1;
    				    myCtx.strokeStyle = col;
    				    myCtx.stroke();
    				    myCtx.restore();
				} else {
				    if(transparency >= 1) {
					rgba = hexColorToRGBAvec(getColorForGroup(groupId), 1);
				    } else {
					rgba = hexColorToRGBAvec(getColorForGroup(groupId), transparency);
				    }

				    if(transparency >= 1 && pass > 0) {
					drawDotfullalpha(x1 + offset, y1, dotSize, rgba[3], rgba[0], rgba[1], rgba[2], pixels, myCanvas.width);
				    } else {
					drawDot(x1 + offset, y1, dotSize, rgba[3], rgba[0], rgba[1], rgba[2], pixels, myCanvas.width);
				    }
				}
				offset -= worldWidth;
			    }
			}
    		    }
    		}
            }
    	}

	if(!drawPretty) {
	    myCtx.putImageData(imData, 0, 0);
	}
    }

    function adjustHeat(val) {
    	var vAdj = val;
	if(lowerLimit > upperLimit) { // use limits from data
    	    if(valSpan > 0) {
    		vAdj = (val - limits.minVal) / valSpan;
    	    } else {
		vAdj = 1;
	    }
	} else {
	    if(vAdj < lowerLimit) {
		vAdj = 0;
	    } else if(vAdj > upperLimit) {
		vAdj = 1;
	    } else {
		vAdj = (vAdj - lowerLimit) / (upperLimit - lowerLimit);
	    }
	}
	return vAdj;
    }


    function heatAndGroup2color(val, groupId) {
	var rgba = hexColorToRGBAvec(getColorForGroup(groupId), transparency);

    	var col1 = hexColorToRGBAvec($scope.gimme("HeatMapLowValueColor"), transparency);
    	var col2 = hexColorToRGBAvec($scope.gimme("HeatMapHighValueColor"), transparency);

    	var rest = 1 - val;
	
	var f = 0.33;
	var f1 = 1 - f;

    	var res = [Math.floor(rgba[0] * f + f1 * (col1[0] * rest + col2[0] * val)),
    		   Math.floor(rgba[1] * f + f1 * (col1[1] * rest + col2[1] * val)),
    		   Math.floor(rgba[2] * f + f1 * (col1[2] * rest + col2[2] * val)),
    		   rgba[3]];
    	return res;

	if(val > 0.5) {

    	    var res = [Math.floor(col1[0] * rest + col2[0] * val),
    		       Math.floor(col1[1] * rest + col2[1] * val),
    		       Math.floor(col1[2] * rest + col2[2] * val),
    		       rgba[3]];
    	    return res;

	} else {
	    
    	    var res = [Math.floor(col1[0] * rest + col2[0] * val),
    		       Math.floor(col1[1] * rest + col2[1] * val),
    		       Math.floor(col1[2] * rest + col2[2] * val),
    		       rgba[3]];
	    return res;
	}
    }


    function heat2color(val) {
    	var col1 = hexColorToRGBAvec($scope.gimme("HeatMapLowValueColor"), transparency);
    	var col2 = hexColorToRGBAvec($scope.gimme("HeatMapHighValueColor"), transparency);

    	var rest = 1 - val;

    	var res = [Math.floor(col1[0] * rest + col2[0] * val),
    		   Math.floor(col1[1] * rest + col2[1] * val),
    		   Math.floor(col1[2] * rest + col2[2] * val),
    		   col1[3]];
    	return res;
    }

    function gammaExp(c) {
    	if(c <= 0.04045) {
    	    return c / 12.92;
    	}
    	return Math.pow((c + 0.055) / 1.055, 2.4);
    }
    
    function colorToGrayscaleRGB(r,g,b) {
    	var rg = gammaExp(r);
    	var gg = gammaExp(g);
    	var bg = gammaExp(b);

    	var yg = 0.2124*rg + 0.7152*gg + 0.0722*bg;
	
    	if(yg <= 0.0031308) {
    	    return 12.92 * yg;
    	}
    	return 1.055 * Math.pow(yg, 1/2.4) - 0.055;
    }

    function colorToGrayscale(vec) {
    	var gray = Math.floor(colorToGrayscaleRGB(vec[0], vec[1], vec[2]));

    	var res = [gray, gray, gray, vec[3]];

    	return res;
    }

    function binLookup(ls, val, start, end) {

	if(start == end) {
	    if(ls[start] == val) {
		return start;
	    } else {
		return -1;
	    }
	} else {
	    var mid = Math.floor((start + end) / 2);
	    if(ls[mid] == val) {
		return mid;
	    }
	    if(ls[mid] < val) {
		return binLookup(ls, val, mid, end);
	    } else {
		return binLookup(ls, val, start, mid);
	    }
	}
    }

    function drawHeatmap() {
    	if(unique <= 0) {
    	    return;
    	}

    	if(mapDiv === null) {
    	    debugLog("no mapDiv to draw on");
    	    return;
    	}

    	if(!map) {
    	    debugLog("map not loaded yet");
    	    return;
    	}

    	debugLog("drawHeatmap");
	
    	currentColors = $scope.gimme("GroupColors");
    	if(typeof currentColors === 'string') {
    	    currentColors = JSON.parse(currentColors);
    	}


    	var globalSelections = [];
    	var globalSelectionsPerId = $scope.gimme('GlobalSelections');
    	if(globalSelectionsPerId.hasOwnProperty('DataIdSlot')) {
    	    globalSelections = globalSelectionsPerId['DataIdSlot'];
    	}

    	lastSeenGlobalSelections = [];
    	for(var set = 0; set < globalSelections.length; set++) {
    	    lastSeenGlobalSelections.push([]);
    	    for(var i = 0; i < globalSelections[set].length; i++) {
    		lastSeenGlobalSelections[set].push(globalSelections[set][i]);
    	    }
    	}

    	var scale = Math.pow(2, mapZoom);

    	try {
    	    var mapBounds = map.getBounds();
    	    var mapNE = mapBounds.getNorthEast();
    	    var mapSW = mapBounds.getSouthWest();
    	    var proj = map.getProjection();
    	    var NEpx = proj.fromLatLngToPoint(mapNE);
    	    var SWpx = proj.fromLatLngToPoint(mapSW);

    	    var mapMinLat = mapSW.lat();
    	    var mapMaxLat = mapNE.lat();
    	    var mapMinLon = mapSW.lng();
    	    var mapMaxLon = mapNE.lng();

    	    var passDateLine = false;
    	    if(mapMinLon > mapMaxLon) {
    		passDateLine = true;
    	    }

	    var worldWidth = 256 * scale;

	    var mapWorldWraps = false;
	    if(drawW > worldWidth) {
		mapWorldWraps = true;
	    }

	    var currentPlace = map.getCenter();
    	    var pCenter = proj.fromLatLngToPoint(currentPlace);

    	    // debugLog("lat " + mapMinLat + " to " + mapMaxLat);
    	    // debugLog("lon " + mapMinLon + " to " + mapMaxLon);

	    // debugLog("scale " + scale + ", can fit " + (drawW / worldWidth) + " worlds in window");

    	    var NSpxs = SWpx.y * scale - NEpx.y * scale; // subtracting small numbers gives loss of precision?
    	    var WEpxs = NEpx.x * scale - SWpx.x * scale;
    	} catch(e) {
    	    debugLog("No map to draw on yet");
    	    $timeout(function(){updateSize(); 	debugLog("drawHeatmap timeout function calls updateGraphics"); updateGraphics();});
    	    return;
    	}


    	var col;
    	var fill;

    	var zeroTransp = 0.3;
    	if(transparency < 1) {
    	    zeroTransp *= transparency;
    	}
    	var zeroTranspAlpha = Math.floor(255*zeroTransp);

    	if(myCanvas === null) {
    	    var canvasElement = $scope.theView.parent().find('#theCanvas');
    	    if(canvasElement.length > 0) {
    		myCanvas = canvasElement[0];
    	    }
    	}
	
    	if(myCtx === null) {
    	    myCtx = myCanvas.getContext("2d");
    	}

    	myCtx.clearRect(0,0, myCanvas.width, myCanvas.height);


    	var rgba0 = hexColorToRGBAvec(getColorForGroup(0), zeroTransp);
    	var rgbaText = hexColorToRGBAvec(textColor, 1.0);
    	var imData = myCtx.getImageData(0, 0, myCanvas.width, myCanvas.height);
    	var pixels = imData.data;

    	var valSpan = (limits.maxVal - limits.minVal);
    	var latPerPixel = (mapNE.lat() - mapSW.lat()) / myCanvas.height;
    	var lonPerPixel = (mapNE.lng() - mapSW.lng()) / myCanvas.width;

    	for(var set = 0; set < Ns.length; set++) {

    	    var selArray = [];
    	    if(set < globalSelections.length) {
    		selArray = globalSelections[set];
    	    }
    	    var lon1 = lons1[set];
    	    var lat1 = lats1[set];
    	    var val1 = vals1[set];


    	    // var pixelsAreBiggerThanCells = false;
    	    // if(limits.minLatDiff < latPerPixel ||
    	    //    limits.minLonDiff < lonPerPixel) {
    	    // 	pixelsAreBiggerThanCells = true;
    	    // }

    	    var votes = {};
	    
    	    for(var i = 0; i < Ns[set]; i++) {
    	    	var inside = false;
		
		// // this has problems when zoomed in so much that the grid size is bigger than the map window size
    	    	// if(mapMinLat <= lat1[i] 
    	    	//    && mapMaxLat >= lat1[i]) {
    	    	//     if(passDateLine) {
    	    	// 	if(lon1[i] >= mapMinLon
    	    	// 	   || lon1[i] <= mapMaxLon) {
    	    	// 	    inside = true;
    	    	// 	}
    	    	//     } else {
    	    	// 	if(lon1[i] >= mapMinLon 
    	    	// 	   && lon1[i] <= mapMaxLon) {
    	    	// 	    inside = true;
    	    	// 	}
    	    	//     }
    	    	// }

		if(mapWorldWraps) {
		    inside = true;
		} else {
		    var latInside = false;
    	    	    if((mapMinLat <= lat1[i] 
    	    		&& mapMaxLat >= lat1[i]) 
		       || (Math.abs(lat1[i] - mapMinLat) <= limits.minLatDiff
			   || Math.abs(lat1[i] - mapMaxLat) <= limits.minLatDiff)
		      ) {
			latInside = true;
		    }

		    var lonInside = false;
		    var normalizedLon = lon1[i]; // Google Maps API wants longitudes to be in -180 to 180, some data sets are in 0 to 360
		    while(normalizedLon < -180) {
			normalizedLon += 360;
		    }
		    while(normalizedLon > 180) {
			normalizedLon -= 360;
		    }
		    
		    
    	    	    if((!passDateLine 
			&& mapMinLon <= normalizedLon
    	    		&& mapMaxLon >= normalizedLon)
		       || (passDateLine 
			   && (mapMinLon <= normalizedLon
			       || mapMaxLon >= normalizedLon))
		       || (Math.abs(lon1[i] - mapMinLon) <= limits.minLonDiff
			   || Math.abs(lon1[i] - mapMaxLon) <= limits.minLonDiff)
		      ) {
			lonInside = true;
		    }

		    if(latInside && lonInside) {
			inside = true;
		    }
		}

		if(inside) {
    	    	    var p1 = new google.maps.LatLng(lat1[i], lon1[i]);
    	    	    var p1px = proj.fromLatLngToPoint(p1);

		    var x1 = 0;
		    if(true || mapWorldWraps) {
			x1 = leftMarg + Math.floor(drawW/2 + p1px.x * scale - pCenter.x * scale);
		    } else {
			if(passDateLine && (lon1[i] > 180)) {
    	    		    x1 = Math.floor(leftMarg + drawW - (NEpx.x * scale - p1px.x * scale));
			} else {
			    x1 = Math.floor(leftMarg + (p1px.x * scale - SWpx.x * scale));
			}
		    }

    	    	    // var x1 = Math.floor(leftMarg + (p1px.x * scale - SWpx.x * scale));
    	    	    // if(passDateLine && (lon1[i] > 180)) { // date line problem
    	    	    // 	x1 = Math.floor(leftMarg + drawW - (NEpx.x * scale - p1px.x * scale));
    	    	    // }

    	    	    var y1 = Math.floor(topMarg + (p1px.y * scale - NEpx.y * scale));

    	    	    var groupId = 0;
    	    	    if(i < selArray.length) {
    	    		groupId = selArray[i];
    	    	    }

    	    	    var v = val1[i];
		    
    	    	    var vAdj = adjustHeat(v);

    	    	    if(!votes.hasOwnProperty(x1)) {
    	    		votes[x1] = {};
    	    	    }
    	    	    if(!votes[x1].hasOwnProperty(y1)) {
    	    		votes[x1][y1] = {};
    	    	    }
    	    	    if(!votes[x1][y1].hasOwnProperty(groupId)) {
    	    		votes[x1][y1][groupId] = {};
    	    	    }
    	    	    if(!votes[x1][y1][groupId].hasOwnProperty(vAdj)) {
    	    		votes[x1][y1][groupId][vAdj] = 1;
    	    	    } else {
    	    		votes[x1][y1][groupId][vAdj] += 1;
    	    	    }
    	    	}
    	    }

	    var sortedXs = [];
	    // if(!pixelsAreBiggerThanCells) {
		var ys = {};
		for(var x in votes) {
    	    	    if(votes.hasOwnProperty(x)) {
			sortedXs.push(parseInt(x));

    	    		for(var y in votes[x]) {
    	    		    if(votes[x].hasOwnProperty(y)) {
				ys[y] = 1;
			    }
			}
		    }
		}
		sortedXs.sort(function(a, b){return a-b});
		
		var sortedYs = [];
    	    	for(var y in ys) {
    	    	    if(ys.hasOwnProperty(y)) {
			sortedYs.push(parseInt(y));
		    }
		}
		sortedYs.sort(function(a, b){return a-b});
	    // }

    	    for(var x in votes) {
    	    	if(votes.hasOwnProperty(x)) {
    	    	    for(var y in votes[x]) {
    	    		if(votes[x].hasOwnProperty(y)) {
    	    		    var noofvotes = 0;
			    
    	    		    var groupId = 0;
    	    		    var ls = [];

    	    		    for(var groupId in votes[x][y]) {
    	    		    	if(groupId > 0 && votes[x][y].hasOwnProperty(groupId)) {
    	    		    	    var trans = 0;
    	    		    	    var count = 0;

    	    		    	    for(var val in votes[x][y][groupId]) { // start with selected data
    	    		    		if(votes[x][y][groupId].hasOwnProperty(val)) {
    	    		    		    count += votes[x][y][groupId][val];
    	    		    		    trans += votes[x][y][groupId][val] * val;
    	    		    		}
    	    		    	    }
    	    		    	    if(count > 0) {
    			    		var tmp = [];
    			    		tmp.push(groupId);
    			    		tmp.push(count);
    			    		tmp.push(trans);
    	    		    		ls.push(tmp);
    	    		    		// ls.push([groupId, count, trans]);
    	    		    		noofvotes += count;
    	    		    	    }
    	    		    	}
    	    		    } // for groupId in votes[x][y]


    	    		    if(noofvotes <= 0) { // try with unselected data too
    	    		    	var groupId = 0;

    	    		    	if(votes[x][y].hasOwnProperty(groupId)) {
    	    		    	    var trans = 0;
    	    		    	    var count = 0;

    	    		    	    for(var val in votes[x][y][groupId]) { // start with selected data
    	    		    		if(votes[x][y][groupId].hasOwnProperty(val)) {
    	    		    		    count += votes[x][y][groupId][val];
    	    		    		    trans += votes[x][y][groupId][val] * val;
    	    		    		}
    	    		    	    }
    	    		    	    if(count > 0) {
    			    		var tmp = [];
    			    		tmp.push(groupId);
    			    		tmp.push(count);
    			    		tmp.push(trans);
    	    		    		ls.push(tmp);
    	    		    		// ls.push([groupId, count, trans]);
    	    		    		noofvotes += count;
    	    		    	    }
    	    		    	}
    	    		    }
			    
    	    		    if(noofvotes > 0) { // should always be true
    	    		    	var blendedCol = [];
				
    	    		    	for(var grIdx = 0; grIdx < ls.length; grIdx++) {
    	    		    	    // var groupCol = hexColorToRGBAvec(getColorForGroup(ls[grIdx][0]), 1);
				    
				    var groupCol = heatAndGroup2color(ls[grIdx][2] / ls[grIdx][1], ls[grIdx][0]);

    	    		    	    groupCol[3] = ls[grIdx][2] / noofvotes;
				    
    	    		    	    if(grIdx > 0) {
    	    		    		// need to blend
    	    		    		var oldA = blendedCol[3];
    	    		    		var newA = groupCol[3];
    	    		    		var remainA = (1 - newA) * oldA;
    	    		    		var outA = newA + remainA;
					
    	    		    		if(outA > 0) {
    	    		    		    for(var colIdx = 0; colIdx < 3; colIdx++) {
    	    		    			blendedCol[colIdx] = Math.min(255, (blendedCol[colIdx] * remainA + newA * groupCol[colIdx]) / outA);
    	    		    		    }
    	    		    		} else {
    	    		    		    blendedCol[0] = 0;
    	    		    		    blendedCol[1] = 0;
    	    		    		    blendedCol[2] = 0;
    	    		    		}
    	    		    		blendedCol[3] = outA;
    	    		    	    } else {
    	    		    		blendedCol = groupCol;
    	    		    	    }
    	    		    	}
    	    		    	// blendedCol[3] = Math.min(255, blendedCol[3] * 255 * transparency);
    	    		    	blendedCol[3] = Math.min(255, 255 * transparency);
    	    		    	var rgba = blendedCol;
				
				// var rgba2 = colorToGrayscale(rgba);
				// for(var colIdx = 0; colIdx < 3; colIdx++) {
				//     rgba[colIdx] = Math.floor(0.5*rgba2[colIdx] + 0.25*rgba[colIdx]);
				// }

				
    	    		    	// if(pixelsAreBiggerThanCells) {
    	    			//     putPixel(x,y, rgba[3], rgba[0], rgba[1], rgba[2], pixels, myCanvas.width);
    	    		    	// } else {
				    x = parseInt(x);
				    y = parseInt(y);

				    var xIdx = binLookup(sortedXs, x, 0, sortedXs.length);
				    var yIdx = binLookup(sortedYs, y, 0, sortedYs.length);
				    
				    var x1 = x;
				    var x2 = x;
				    if(xIdx > 0) {
					x1 = Math.floor((sortedXs[xIdx - 1] + x) / 2);
					if(mapWorldWraps && Math.abs(x - x1) > 5) {
					    x1 = x;
					}
				    } if(xIdx < sortedXs.length - 1) {
					x2 = Math.floor((sortedXs[xIdx + 1] + x) / 2);
					if(mapWorldWraps && Math.abs(x - x2) > 5) {
					    x2 = x;
					}
				    }
				    if(x1 < x) {
					x1++;
				    }
				    
				    var y1 = y;
				    var y2 = y;
				    if(yIdx > 0) {
					y1 = Math.floor((sortedYs[yIdx - 1] + y) / 2);
				    } if(yIdx < sortedYs.length - 1) {
					y2 = Math.floor((sortedYs[yIdx + 1] + y) / 2);
				    }
				    if(y1 < y) {
					y1++;
				    }
				
				if(mapWorldWraps) {
				    while(x2 < leftMarg) {
					x1 += worldWidth;
					x2 += worldWidth;
				    }
				    while(x1 > leftMarg + drawW) {
					x1 -= worldWidth;
					x2 -= worldWidth;
				    }

				    var offset = 0;
				    while(x2 + offset > leftMarg 
					  && x1 + offset < leftMarg + drawW) {
					fillRect(x1 + offset,y1, x2 + offset,y2, rgba[3], rgba[0], rgba[1], rgba[2], pixels, myCanvas.width);
					offset += worldWidth;
				    }

				    offset = -worldWidth;
				    while(x2 + offset > leftMarg 
					  && x1 + offset < leftMarg + drawW) {
					fillRect(x1 + offset,y1, x2 + offset,y2, rgba[3], rgba[0], rgba[1], rgba[2], pixels, myCanvas.width);
					offset -= worldWidth;
				    }

				} else {
				    
				    
				    fillRect(x1,y1, x2,y2, rgba[3], rgba[0], rgba[1], rgba[2], pixels, myCanvas.width);
				}
    	    		    	    // putPixel(x,y, rgba[3], rgba[0], rgba[1], rgba[2], pixels, myCanvas.width);
    			    	// }
    	    		    } // if noofvotes > 0
			    
    	    		} // if y really in votes[x]
    	    	    } // for y in votes[x]
    		} // if x really in votes
	    } // for x in votes
	    
	    

    // 	    // } else { // pixels are smaller than cells
    // 	    // 	var mapMinLatEx = mapMinLat - limits.minLatDiff2;
    // 	    // 	var mapMaxLatEx = mapMaxLat + limits.minLatDiff2;
    // 	    // 	var mapMinLonEx = mapMinLon - limits.minLonDiff2;
    // 	    // 	var mapMaxLonEx = mapMaxLon + limits.minLonDiff2;

    // 	    // 	for(var i = 0; i < Ns[set]; i++) {
    // 	    // 	    // paint all pixels this cell covers

    // 	    // 	    var lat = lat1[i];
    // 	    // 	    var lon = lon1[i];
    // 	    // 	    while(lon > 180) {
    // 	    // 		lon -= 360;
    // 	    // 	    }
    // 	    // 	    while(lon < -180) {
    // 	    // 		lon += 360;
    // 	    // 	    }

    // 	    // 	    var inside = false;

    // 	    // 	    if(mapMinLatEx <= lat 
    // 	    // 	       && mapMaxLatEx >= lat) {
    // 	    // 		if(passDateLine) {
    // 	    // 		    if(lon >= mapMinLonEx
    // 	    // 		       || lon <= mapMaxLonEx) {
    // 	    // 			inside = true;
    // 	    // 		    }
    // 	    // 		} else {
    // 	    // 		    if(lon >= mapMinLonEx 
    // 	    // 		       && lon <= mapMaxLonEx) {
    // 	    // 			inside = true;
    // 	    // 		    }
    // 	    // 		}
    // 	    // 	    }

    // 	    // 	    if(inside) {
    // 	    // 		var groupId = 0;
    // 	    // 		if(i < selArray.length) {
    // 	    // 		    groupId = selArray[i];
    // 	    // 		}

    // 	    // 		if(!alwaysVote || groupId > 0) {
			    
    // 	    // 		    var ln1 = lon - limits.minLonDiff2;
    // 	    // 		    var ln2 = lon + limits.minLonDiff2;

    // 	    // 		    var p1 = new google.maps.LatLng(lat + limits.minLatDiff2, ln1);
    // 	    // 		    var p2 = new google.maps.LatLng(lat - limits.minLatDiff2, ln2);

    // 	    // 		    var p1px = proj.fromLatLngToPoint(p1);
    // 	    // 		    var p2px = proj.fromLatLngToPoint(p2);

    // 	    // 		    var x1 = Math.max(leftMarg, Math.ceil(leftMarg + (p1px.x * scale - SWpx.x * scale)));
    // 	    // 		    if(passDateLine && ln1 < mapMinLon) { // date line problem
    // 	    // 			x1 = Math.ceil(leftMarg + drawW - (NEpx.x * scale - p1px.x * scale));
    // 	    // 		    }
    // 	    // 		    var y1 = Math.max(topMarg, Math.ceil(topMarg + (p1px.y * scale - NEpx.y * scale)));
    // 	    // 	    	    var x2 = Math.min(leftMarg + drawW, Math.floor(leftMarg + (p2px.x * scale - SWpx.x * scale)));
    // 	    // 		    if(passDateLine && ln2 < mapMinLon) { // date line problem
    // 	    // 			x2 = Math.floor(leftMarg + drawW - (NEpx.x * scale - p2px.x * scale));
    // 	    // 		    }
    // 	    // 	    	    var y2 = Math.min(topMarg * drawH, Math.floor(topMarg + (p2px.y * scale - NEpx.y * scale)));


    // 	    // 		    var v = val1[i];
    // 	    // 		    var vAdj = adjustHeat(v);

    // 	    // 		    // var rgba = heat2color(vAdj);
    // 	    // 		    // if(groupId <= 0) {
    // 	    // 		    // 	rgba = colorToGrayscale(rgba);
    // 	    // 		    // 	rgba[3] = zeroTranspAlpha;
    // 	    // 		    // }

    // 	    // 		    var rgba = hexColorToRGBAvec(getColorForGroup(groupId), transparency);
    // 	    // 		    rgba[3] = Math.floor(rgba[3] * vAdj);

    // 	    // 		    fillRect(x1,y1, x2,y2, rgba[3], rgba[0], rgba[1], rgba[2], pixels, myCanvas.width);
    // 	    // 		}
    // 	    // 	    }
    // 	    // 	}
    // 	    // }
    	}
	
    	myCtx.putImageData(imData, 0, 0);
    }

    // function drawHeatmapOld() {
    // 	if(unique <= 0) {
    // 	    return;
    // 	}

    // 	if(mapDiv === null) {
    // 	    debugLog("no mapDiv to draw on");
    // 	    return;
    // 	}

    // 	if(!map) {
    // 	    debugLog("map not loaded yet");
    // 	    return;
    // 	}

    // 	debugLog("drawHeatmap");
	
    // 	currentColors = $scope.gimme("GroupColors");
    // 	if(typeof currentColors === 'string') {
    // 	    currentColors = JSON.parse(currentColors);
    // 	}


    // 	var globalSelections = [];
    // 	var globalSelectionsPerId = $scope.gimme('GlobalSelections');
    // 	if(globalSelectionsPerId.hasOwnProperty('DataIdSlot')) {
    // 	    globalSelections = globalSelectionsPerId['DataIdSlot'];
    // 	}

    // 	lastSeenGlobalSelections = [];
    // 	for(var set = 0; set < globalSelections.length; set++) {
    // 	    lastSeenGlobalSelections.push([]);
    // 	    for(var i = 0; i < globalSelections[set].length; i++) {
    // 		lastSeenGlobalSelections[set].push(globalSelections[set][i]);
    // 	    }
    // 	}

    // 	var scale = Math.pow(2, mapZoom);

    // 	try {
    // 	    var mapBounds = map.getBounds();
    // 	    var mapNE = mapBounds.getNorthEast();
    // 	    var mapSW = mapBounds.getSouthWest();
    // 	    var proj = map.getProjection();
    // 	    var NEpx = proj.fromLatLngToPoint(mapNE);
    // 	    var SWpx = proj.fromLatLngToPoint(mapSW);

    // 	    var mapMinLat = mapSW.lat();
    // 	    var mapMaxLat = mapNE.lat();
    // 	    var mapMinLon = mapSW.lng();
    // 	    var mapMaxLon = mapNE.lng();

    // 	    var passDateLine = false;
    // 	    if(mapMinLon > mapMaxLon) {
    // 		passDateLine = true;
    // 	    }

    // 	    debugLog("lat " + mapMinLat + " to " + mapMaxLat);
    // 	    debugLog("lon " + mapMinLon + " to " + mapMaxLon);

    // 	    // if(NEpx.x > SWpx.x) {
    // 	    // 	var tmp = NEpx.x;
    // 	    // 	NEpx.x = SWpx.x;
    // 	    // 	SWpx.x = tmp;
    // 	    // }
    // 	    // if(NEpx.y < SWpx.y) {
    // 	    // 	var tmp = NEpx.y;
    // 	    // 	NEpx.y = SWpx.y;
    // 	    // 	SWpx.y = tmp;
    // 	    // }

    // 	    var NSpxs = SWpx.y * scale - NEpx.y * scale; // subtracting small numbers gives loss of precision?
    // 	    var WEpxs = NEpx.x * scale - SWpx.x * scale;
    // 	} catch(e) {
    // 	    debugLog("No map to draw on yet");
    // 	    $timeout(function(){updateSize(); 	debugLog("drawHeatmap timeout function calls updateGraphics"); updateGraphics();});
    // 	    return;
    // 	}


    // 	var col;
    // 	var fill;

    // 	var zeroTransp = 0.3;
    // 	if(transparency < 1) {
    // 	    zeroTransp *= transparency;
    // 	}
    // 	var zeroTranspAlpha = Math.floor(255*zeroTransp);

    // 	if(myCanvas === null) {
    // 	    var canvasElement = $scope.theView.parent().find('#theCanvas');
    // 	    if(canvasElement.length > 0) {
    // 		myCanvas = canvasElement[0];
    // 	    }
    // 	}
	
    // 	if(myCtx === null) {
    // 	    myCtx = myCanvas.getContext("2d");
    // 	}

    // 	myCtx.clearRect(0,0, myCanvas.width, myCanvas.height);


    // 	var rgba0 = hexColorToRGBAvec(getColorForGroup(0), zeroTransp);
    // 	var rgbaText = hexColorToRGBAvec(textColor, 1.0);
    // 	var imData = myCtx.getImageData(0, 0, myCanvas.width, myCanvas.height);
    // 	var pixels = imData.data;

    // 	var valSpan = (limits.maxVal - limits.minVal);
    // 	var latPerPixel = (mapNE.lat() - mapSW.lat()) / myCanvas.height;
    // 	var lonPerPixel = (mapNE.lng() - mapSW.lng()) / myCanvas.width;

    // 	for(var set = 0; set < Ns.length; set++) {

    // 	    var selArray = [];
    // 	    if(set < globalSelections.length) {
    // 		selArray = globalSelections[set];
    // 	    }
    // 	    var lon1 = lons1[set];
    // 	    var lat1 = lats1[set];
    // 	    var val1 = vals1[set];


    // 	    var pixelsAreBiggerThanCells = false;
    // 	    if(limits.minLatDiff < latPerPixel ||
    // 	       limits.minLonDiff < lonPerPixel) {
    // 	    	pixelsAreBiggerThanCells = true;
    // 	    }

    // 	    if(pixelsAreBiggerThanCells) {
    // 	    	var votes = {};
		
    // 	    	for(var i = 0; i < Ns[set]; i++) {
    // 		    var inside = false;
		    
    // 		    if(mapMinLat <= lat1[i] 
    // 		       && mapMaxLat >= lat1[i]) {
    // 			if(passDateLine) {
    // 			    if(lon1[i] >= mapMinLon
    // 			       || lon1[i] <= mapMaxLon) {
    // 				inside = true;
    // 			    }
    // 			} else {
    // 			    if(lon1[i] >= mapMinLon 
    // 			       && lon1[i] <= mapMaxLon) {
    // 				inside = true;
    // 			    }
    // 			}
    // 		    }

    // 		    if(inside) {
    // 			var p1 = new google.maps.LatLng(lat1[i], lon1[i]);
    // 			var p1px = proj.fromLatLngToPoint(p1);

    // 			var x1 = Math.floor(leftMarg + (p1px.x * scale - SWpx.x * scale));
    // 			if(passDateLine && (lon1[i] > 180)) { // date line problem
    // 			    x1 = Math.floor(leftMarg + drawW - (NEpx.x * scale - p1px.x * scale));
    // 			}
    // 			var y1 = Math.floor(topMarg + (p1px.y * scale - NEpx.y * scale));

    // 	    		var groupId = 0;
    // 	    		if(i < selArray.length) {
    // 	    		    groupId = selArray[i];
    // 	    		}
    // 	    		if(groupId > 0) {
    // 	    		    groupId = 1;
    // 	    		}

    // 	    		var v = val1[i];
			
    // 	    		var vAdj = adjustHeat(v);

    // 	    		if(!votes.hasOwnProperty(x1)) {
    // 	    		    votes[x1] = {};
    // 	    		}
    // 	    		if(!votes[x1].hasOwnProperty(y1)) {
    // 	    		    votes[x1][y1] = [{}, {}];
    // 	    		}
    // 	    		if(!votes[x1][y1][groupId].hasOwnProperty(vAdj)) {
    // 	    		    votes[x1][y1][groupId][vAdj] = 1;
    // 	    		} else {
    // 	    		    votes[x1][y1][groupId][vAdj] += 1;
    // 	    		}
    // 	    	    }
    // 	    	}

    // 	    	for(var x in votes) {
    // 	    	    if(votes.hasOwnProperty(x)) {
    // 	    		for(var y in votes[x]) {
    // 	    		    if(votes[x].hasOwnProperty(y)) {
    // 	    			var bestVal = 0;
    // 	    			var mostVotes = 0;

    // 	    			var groupId = 0;
    // 	    			for(var val in votes[x][y][1]) { // start with selected data
    // 	    			    if(votes[x][y][1].hasOwnProperty(val)) {
    // 	    				if(votes[x][y][1][val] > mostVotes) {
    // 	    				    mostVotes = votes[x][y][1][val];
    // 	    				    bestVal = val;
    // 	    				    groupId = 1;
    // 	    				}
    // 	    			    }
    // 	    			}

    // 	    			if(mostVotes <= 0) { // try with unselected data too
    // 	    			    for(var val in votes[x][y][0]) {
    // 	    				if(votes[x][y][0].hasOwnProperty(val)) {
    // 	    				    if(votes[x][y][0][val] > mostVotes) {
    // 	    					mostVotes = votes[x][y][0][val];
    // 	    					bestVal = val;
    // 	    					groupId = 0;
    // 	    				    }
    // 	    				}
    // 	    			    }
    // 	    			}
				
    // 	    			if(mostVotes > 0) { // should always be true
    // 	    			    // var rgba = heat2color(bestVal);

    // 	    			    // if(groupId <= 0) {
    // 	    			    // 	rgba = colorToGrayscale(rgba);
    // 	    			    // 	rgba[3] = zeroTranspAlpha;
    // 	    			    // }


    // 				    // var rgba = hexColorToRGBAvec(getColorForGroup(groupId), transparency);
    // 				    // rgba[3] = Math.floor(rgba[3] * bestVal);

    // 				    var rgba = heatAndGroup2color(bestVal, groupId);

    // 	    			    putPixel(x,y, rgba[3], rgba[0], rgba[1], rgba[2], pixels, myCanvas.width);
    // 	    			}
    // 	    		    }
    // 	    		}
    // 	    	    }
    // 	    	}
    // 	    } else { // pixels are smaller than cells
    // 		var mapMinLatEx = mapMinLat - limits.minLatDiff2;
    // 		var mapMaxLatEx = mapMaxLat + limits.minLatDiff2;
    // 		var mapMinLonEx = mapMinLon - limits.minLonDiff2;
    // 		var mapMaxLonEx = mapMaxLon + limits.minLonDiff2;

    // 	    	for(var i = 0; i < Ns[set]; i++) {
    // 	    	    // paint all pixels this cell covers

    // 		    var lat = lat1[i];
    // 		    var lon = lon1[i];
    // 		    while(lon > 180) {
    // 			lon -= 360;
    // 		    }
    // 		    while(lon < -180) {
    // 			lon += 360;
    // 		    }

    // 		    var inside = false;

    // 		    if(mapMinLatEx <= lat 
    // 		       && mapMaxLatEx >= lat) {
    // 			if(passDateLine) {
    // 			    if(lon >= mapMinLonEx
    // 			       || lon <= mapMaxLonEx) {
    // 				inside = true;
    // 			    }
    // 			} else {
    // 			    if(lon >= mapMinLonEx 
    // 			       && lon <= mapMaxLonEx) {
    // 				inside = true;
    // 			    }
    // 			}
    // 		    }

    // 		    if(inside) {
    // 	    		var groupId = 0;
    // 	    		if(i < selArray.length) {
    // 	    		    groupId = selArray[i];
    // 	    		}

    // 			if(!alwaysVote || groupId > 0) {
			    
    // 			    var ln1 = lon - limits.minLonDiff2;
    // 			    var ln2 = lon + limits.minLonDiff2;

    // 			    var p1 = new google.maps.LatLng(lat + limits.minLatDiff2, ln1);
    // 			    var p2 = new google.maps.LatLng(lat - limits.minLatDiff2, ln2);

    // 			    var p1px = proj.fromLatLngToPoint(p1);
    // 			    var p2px = proj.fromLatLngToPoint(p2);

    // 			    var x1 = Math.max(leftMarg, Math.ceil(leftMarg + (p1px.x * scale - SWpx.x * scale)));
    // 			    if(passDateLine && ln1 < mapMinLon) { // date line problem
    // 				x1 = Math.ceil(leftMarg + drawW - (NEpx.x * scale - p1px.x * scale));
    // 			    }
    // 	    		    var y1 = Math.max(topMarg, Math.ceil(topMarg + (p1px.y * scale - NEpx.y * scale)));
    // 	    	    	    var x2 = Math.min(leftMarg + drawW, Math.floor(leftMarg + (p2px.x * scale - SWpx.x * scale)));
    // 			    if(passDateLine && ln2 < mapMinLon) { // date line problem
    // 				x2 = Math.floor(leftMarg + drawW - (NEpx.x * scale - p2px.x * scale));
    // 			    }
    // 	    	    	    var y2 = Math.min(topMarg * drawH, Math.floor(topMarg + (p2px.y * scale - NEpx.y * scale)));


    // 	    		    var v = val1[i];
    // 			    var vAdj = adjustHeat(v);

    // 	    		    // var rgba = heat2color(vAdj);
    // 	    		    // if(groupId <= 0) {
    // 	    		    // 	rgba = colorToGrayscale(rgba);
    // 	    		    // 	rgba[3] = zeroTranspAlpha;
    // 	    		    // }



    // 			    // var rgba = hexColorToRGBAvec(getColorForGroup(groupId), transparency);
    // 			    // rgba[3] = Math.floor(rgba[3] * vAdj);

    // 			    var rgba = heatAndGroup2color(vAdj, groupId);

    // 	    		    fillRect(x1,y1, x2,y2, rgba[3], rgba[0], rgba[1], rgba[2], pixels, myCanvas.width);
    // 			}
    // 	    	    }
    // 	    	}
    // 	    }
    // 	}

    // 	myCtx.putImageData(imData, 0, 0);
    // }
	


    function checkColors(currentColors, lastColors) {
	if(currentColors == lastColors) {
	    return false;
	}

	if(!lastColors) {
	    return true;
	}

	if(!lastColors.hasOwnProperty("groups") && 
	   !currentColors.hasOwnProperty("groups"))
	{
	    return false;
	} else if(lastColors.hasOwnProperty("groups") 
		  && currentColors.hasOwnProperty("groups")) {
	    // check more

	    var groupCols = currentColors.groups;
	    var lastGroupCols = lastColors.groups;
	    
	    for(var g in groupCols) {
		if(!lastGroupCols.hasOwnProperty(g)) {
		    return true;
		}
	    }
	    for(var g in lastGroupCols) {
		if(!groupCols.hasOwnProperty(g)) {
		    return true;
		}
		
		if(groupCols[g].hasOwnProperty('color')
		   && (!lastGroupCols[g].hasOwnProperty('color')
		       || lastGroupCols[g].color != groupCols[g].color)) {
		    return true;
		}
		
		if(groupCols[g].hasOwnProperty('gradient')) {
		    if(!lastGroupCols[g].hasOwnProperty('gradient')
		       || lastGroupCols[g].gradient.length != groupCols[g].gradient.length) {
			return true;
		    }
		    
		    for(var i = 0; i < groupCols[g].gradient.length; i++) {
			var cc = groupCols[g].gradient[i];
			var cc2 = lastGroupCols[g].gradient[i];
			
			if(cc.hasOwnProperty('pos') != cc2.hasOwnProperty('pos')
			   || cc.hasOwnProperty('color') != cc2.hasOwnProperty('color')
			   || (cc.hasOwnProperty('pos') && cc.pos != cc2.pos)
			   || (cc.hasOwnProperty('color') && cc.color != cc2.color)) {
			    return true;
			}
		    }
		}
	    }
	} else {
	    return true;
	}

	return false;
    }
    
    function copyColors(colors) {
	var res = {};
	
	if(colors.hasOwnProperty('skin')) {
	    res.skin = {};
	    for(var prop in colors.skin) {
		res.skin[prop] = colors.skin[prop];
	    }
	}
	if(colors.hasOwnProperty('groups')) {
	    res.groups = {};
	    for(var prop in colors.groups) {
		res.groups[prop] = colors.groups[prop];
	    }
	}
	return res;
    }

    function updateGraphics() {
    	// debugLog("updateGraphics()");

	if(currentColors === null) {
    	    var colors = $scope.gimme("GroupColors");
    	    if(typeof colors === 'string') {
    		colors = JSON.parse(colors);
    	    }
	    currentColors = copyColors(colors);

	    if(!currentColors) {
		currentColors = {};
	    }
	}
	
	if(currentColors.hasOwnProperty("skin") && currentColors.skin.hasOwnProperty("text")) {
	    textColor = currentColors.skin.text;
	} else {
	    textColor = "#000000";
	}
	
	if(haveHeatmap) {
	    drawHeatmap();
	} else {
	    drawCartesianPlot();
	}
    }

    function getTextWidthCurrentFont(text) {
	if(dropCtx !== null && dropCtx !== undefined) {
	    var metrics = dropCtx.measureText(text);
	    return metrics.width;
	}
	return 0;
    }

    function updateDropZones(col, alpha, hover) {
	// update the data drop locations
	
	// debugLog("update the data drop zone locations");

	if(dropCanvas === null) {
   	    var myCanvasElement = $scope.theView.parent().find('#theDropCanvas');
    	    if(myCanvasElement.length > 0) {
    		dropCanvas = myCanvasElement[0];
    	    } else {
    		debugLog("no canvas to draw on!");
    		return;
    	    }
	}

	if(dropCtx === null) {
    	    dropCtx = dropCanvas.getContext("2d");
	}
	
	if(!dropCtx) {
	    debugLog("no canvas to draw drop zones on");
	    return;
	}

	if(dropCtx) {
	    var W = dropCanvas.width;
	    var H = dropCanvas.height;

	    var marg1 = 8;
	    if(drawW < 40) {
		marg1 = 0;
	    }
	    var marg2 = 8;
	    if(drawH < 40) {
		marg2 = 0;
	    }

	    dropYpt.left = 0;
	    dropYpt.top = topMarg + marg2;
	    dropYpt.right = leftMarg;
	    dropYpt.bottom = H - bottomMarg - marg2;

	    dropYfr.left = W - rightMarg;
	    dropYfr.top = topMarg + marg2;
	    dropYfr.right = W;
	    dropYfr.bottom = topMarg + Math.floor(drawH / 2) - 1 - marg2;

	    dropYto.left = W - rightMarg;
	    dropYto.top = topMarg + Math.floor(drawH / 2) + 1 + marg2;
	    dropYto.right = W;
	    dropYto.bottom = H - bottomMarg - marg2;

	    dropXpt.left = leftMarg + marg1;
	    dropXpt.top = H - bottomMarg;
	    dropXpt.right = W - rightMarg - marg1;
	    dropXpt.bottom = H;

	    dropXfr.left = leftMarg + marg1;
	    dropXfr.top = 0;
	    dropXfr.right = leftMarg + Math.floor(drawW / 2) - 1 - marg1;
	    dropXfr.bottom = topMarg;

	    dropXto.left = leftMarg + Math.floor(drawW / 2) + 1 + marg1;
	    dropXto.top = 0;
	    dropXto.right = W - rightMarg - marg1;
	    dropXto.bottom = topMarg;

	    dropCtx.clearRect(0,0, W,H);
	    
	    if(hover) {
		dropCtx.save();
		dropCtx.fillStyle = "rgba(0, 0, 0, 0.75)";
		dropCtx.fillRect(0,0, W, H);
		dropCtx.restore();
		
		var fnt = "bold " + (fontSize + 5) + "px Arial";
		dropCtx.font = fnt;
		dropCtx.fillStyle = textColor;
		dropCtx.fillStyle = "black";

		for(var d = 0; d < allDropZones.length; d++) {
		    var dropZone = allDropZones[d];

		    dropCtx.save();
		    var l = Math.max(0, dropZone.left - fontSize/2);
		    var t = Math.max(0, dropZone.top - fontSize/2);
		    var w = Math.min(W - l, dropZone.right - dropZone.left + fontSize / 2 + dropZone.left - l)
		    var h = Math.min(H - t, dropZone.bottom - dropZone.top + fontSize / 2 + dropZone.top - t )
		    dropCtx.clearRect(l, t, w, h);

		    dropCtx.fillStyle = "rgba(255, 255, 255, 0.75)";
		    dropCtx.fillRect(l, t, w, h);
		    dropCtx.restore();
		}
		for(var d = 0; d < allDropZones.length; d++) {
		    var dropZone = allDropZones[d];

		    dropCtx.save();
		    dropCtx.globalAlpha = alpha;
		    // dropCtx.strokeStyle = col;
		    dropCtx.strokeStyle = "black";
		    dropCtx.strokeWidth = 1;
		    dropCtx.lineWidth = 2;
		    dropCtx.setLineDash([2, 3]);
		    dropCtx.beginPath();
		    dropCtx.moveTo(dropZone.left, dropZone.top);
		    dropCtx.lineTo(dropZone.left, dropZone.bottom);
		    dropCtx.lineTo(dropZone.right, dropZone.bottom);
		    dropCtx.lineTo(dropZone.right, dropZone.top);
		    dropCtx.lineTo(dropZone.left, dropZone.top);
		    dropCtx.stroke();
		    if(hover) {
			var str = dropZone.label;
			var tw = getTextWidthCurrentFont(str);
			var labelShift = Math.floor(fontSize / 2);
			if(dropZone.rotate) {
			    if(dropZone.left > W / 2) {
    				dropCtx.translate(dropZone.left - labelShift, dropZone.top + Math.floor((dropZone.bottom - dropZone.top - tw) / 2));
			    } else {
    				dropCtx.translate(dropZone.right - labelShift, dropZone.top + Math.floor((dropZone.bottom - dropZone.top - tw) / 2));
			    }
    			    dropCtx.rotate(Math.PI/2);
			} else {
			    if(dropZone.top < H / 2) {
    				dropCtx.translate(dropZone.left + Math.floor((dropZone.right - dropZone.left - tw) / 2), dropZone.bottom + labelShift);
			    } else {
    				dropCtx.translate(dropZone.left + Math.floor((dropZone.right - dropZone.left - tw) / 2), dropZone.top + labelShift);
			    }
			}
			dropCtx.fillText(str, 0, 0);
		    }
		    dropCtx.restore();
		}
	    }
	}
    }

    function updateSize() {
	// debugLog("updateSize");

	fontSize = parseInt($scope.gimme("FontSize"));
	if(fontSize < 5) {
	    fontSize = 5;
	}

	var rw = $scope.gimme("mapDrawingArea:width");
    	if(typeof rw === 'string') {
    	    rw = parseFloat(rw);
    	}
    	if(rw < 1) {
    	    rw = 1;
    	}

	var rh = $scope.gimme("mapDrawingArea:height");
    	if(typeof rh === 'string') {
    	    rh = parseFloat(rh);
    	}
    	if(rh < 1) {
    	    rh = 1;
    	}

	var W = rw;
	var H = rh;

	drawW = W - leftMarg - rightMarg;
	drawH = H - topMarg - bottomMarg;

	if(mapDiv === null) {
	    mapDiv = $scope.theView.parent().find("#mapDiv");
	}
	if(mapDiv !== null) {
	    mapDiv.width = drawW;
	    mapDiv.height = drawH;
	    mapDiv.top = topMarg;
	    mapDiv.left = leftMarg;

	    if(map){
		var currentPlace = new google.maps.LatLng(mapCenterLat, mapCenterLon);
		map.panTo(currentPlace);
	    }
	}

	if(map) {
	    google.maps.event.trigger(map, "resize");
	}

	
	if(myCanvas === null) {
    	    var canvasElement = $scope.theView.parent().find('#theCanvas');
    	    if(canvasElement.length > 0) {
    		myCanvas = canvasElement[0];
	    }
	}
	
	if(myCtx === null) {
	    myCtx = myCanvas.getContext("2d");
	}

	myCanvas.width = W;
	myCanvas.height = H;

	if(dropCanvas === null) {
    	    var canvasElement = $scope.theView.parent().find('#theDropCanvas');
    	    if(canvasElement.length > 0) {
    		dropCanvas = canvasElement[0];
	    }
	}
	
	if(dropCtx === null) {
	    dropCtx = dropCanvas.getContext("2d");
	}
	if(dropCanvas) {
	    dropCanvas.width = W;
	    dropCanvas.height = H;
	}

	// debugLog("updateSize calls updateGraphics");
	updateGraphics();

	updateDropZones(textColor, 0.3, false);
    }

    function mySlotChange(eventData) {
    	// debugLog("mySlotChange() " + eventData.slotName + " = " + JSON.stringify(eventData.slotValue));
    	// debugLog("mySlotChange() " + eventData.slotName);

    	switch(eventData.slotName) {
	case "HeatMapValueMinLevel":
	    if(lowerLimit != eventData.slotValue) {
		lowerLimit = eventData.slotValue;
		if(haveHeatmap) {
		    // debugLog("HeatMapValueMinLevel change calls updateGraphics");
		    updateGraphics();
		}
	    }
	    break;
	case "HeatMapValueMaxLevel":
	    if(upperLimit != eventData.slotValue) {
		upperLimit = eventData.slotValue;
		if(haveHeatmap) {
		    // debugLog("HeatMapValueMaxLevel change calls updateGraphics");
		    updateGraphics();
		}
	    }
	    break;

	case "HeatMapLowValueColor":
	    lowValCol = eventData.slotValue;
	    if(haveHeatmap) {
		// debugLog("HeatMapLowValueColor change calls updateGraphics");
		updateGraphics();
	    }
	    break;
	case "HeatMapHighValueColor":
	    highValCol = eventData.slotValue;
	    if(haveHeatmap) {
		// debugLog("HeatMapHighValueColor change calls updateGraphics");
		updateGraphics();
	    }
	    break;

	case "SelectAll":
	    if(eventData.slotValue) {
		selectAll();
		$scope.set("SelectAll",false);
	    }
	    break;

	case "ZoomLevel":
	    var newZoom = parseInt(eventData.slotValue);
	    if(mapZoom != newZoom) {
		mapZoom = newZoom;
		if(map){
		    if(map.getZoom() != mapZoom){
			map.setZoom(mapZoom);
		    }
		}
	    }
	    break;

	case "MapCenterLatitude":
	    var newLat = parseFloat(eventData.slotValue);
	    if(newLat != mapCenterLat) {
		mapCenterLat = newLat;
		mapCenterLon = parseFloat($scope.gimme("MapCenterLongitude"));
		
		if(map){
		    var currentPlace = new google.maps.LatLng(mapCenterLat, mapCenterLon);
		    map.panTo(currentPlace);
		}
	    }
	    break;

	case "MapCenterLongitude":
	    var newLon = parseFloat(eventData.slotValue);
	    if(newLon != mapCenterLon) {
		mapCenterLat = parseFloat($scope.gimme("MapCenterLatitude"));
		mapCenterLon = newLon;
		
		if(map){
		    var currentPlace = new google.maps.LatLng(mapCenterLat, mapCenterLon);
		    map.panTo(currentPlace);
		}
	    }
	    break;

	case "InternalSelections":
	    if(eventData.slotValue != internalSelectionsInternallySetTo) {
		setSelectionsFromSlotValue();
	    }
	    break;

	case "QuickRenderThreshold":
	    var newThreshold = parseFloat($scope.gimme("QuickRenderThreshold"));
	    if(!isNaN(newThreshold) && isFinite(newThreshold) && newThreshold > 0) {
		if(newThreshold != quickRenderThreshold) {
		    var oldState = unique > quickRenderThreshold;
		    var newState = unique > newThreshold;
		    
		    quickRenderThreshold = newThreshold;
		    if(oldState != newState) {
			// debugLog("QuickRenderThreshold change calls updateGraphics");
			updateGraphics();
		    }
		}
	    }
	    break;

    	case "TreatNullAsUnselected":
    	    updateLocalSelections(false);
    	    break;

    	case "mapDrawingArea:height":
	    updateSize();
    	    break;
    	case "mapDrawingArea:width":
	    updateSize();
    	    break;
    	case "root:height":
	    updateSize();
    	    break;
    	case "root:width":
	    updateSize();
    	    break;
    	case "DotSize":
	    var newVal = parseInt($scope.gimme("DotSize"));
	    if(newVal < 1) {
		newVal = 1;
	    } 
	    if(newVal != dotSize) {
		dotSize = newVal;
		if(haveDots && !haveHeatmap) { 
		    // debugLog("DotSize change calls updateGraphics");
    		    updateGraphics();
		}
	    }
    	    break;
    	case "LineWidth":
	    var newVal = parseInt($scope.gimme("LineWidth"));
	    if(newVal < 1) {
		newVal = 1;
	    } 
	    if(newVal != lineWidth) {
		lineWidth = newVal;
		if(haveLines && !haveHeatmap) {
		    // debugLog("LineWidth change calls updateGraphics");
		    updateGraphics();
		}
	    }
    	    break;
    	case "Transparency":
	    var newVal = parseFloat($scope.gimme("Transparency"));
	    if(newVal < 0) {
		newVal = 0;
	    } 
	    if(newVal > 1) {
		newVal = 1;
	    }
	    if(newVal != transparency) {
		transparency = newVal;
		// debugLog("Transparency change calls updateGraphics");
    		updateGraphics();
	    }
    	    break;

    	case "PluginName":
    	    $scope.displayText = eventData.slotValue;
    	    break;
    	case "PluginType":
    	    if(eventData.slotValue != "VisualizationPlugin") {
    		$scope.set("PluginType", "VisualizationPlugin");
    	    }
    	    break;
    	case "GlobalSelections":
	    checkIfGlobalSelectionsActuallyChanged();
    	    break;
    	case "Highlights":
	    // debugLog("Highlights change calls updateGraphics");
    	    updateGraphics();
    	    break;
    	case "GroupColors":
	    colorPalette = null;
	    if(eventData.slotValue
	       && eventData.slotValue.hasOwnProperty('skin')
	       && eventData.slotValue.skin.hasOwnProperty('border')) {
		$scope.set("mapDrawingArea:background-color", eventData.slotValue.skin.border);
	    }

    	    var colors = $scope.gimme("GroupColors");
    	    if(typeof colors === 'string') {
    		colors = JSON.parse(colors);
    	    }
	    currentColors = copyColors(colors);

	    // debugLog("GroupColors change calls updateGraphics");
    	    updateGraphics();

	    updateDropZones(textColor, 0.3, false);
    	    break;
    	case "DataValuesSetFilled":
    	    parseData();
    	    break;
    	};
    };


    function checkIfGlobalSelectionsActuallyChanged () {
	// debugLog("check global selections");
    	var globalSelections = [];
	var globalSelectionsPerId = $scope.gimme('GlobalSelections');
	if(globalSelectionsPerId.hasOwnProperty('DataIdSlot')) {
	    globalSelections = globalSelectionsPerId['DataIdSlot'];
	}

	var dirty = false;
    	for(var set = 0; set < Ns.length; set++) {
	    var selArray = [];
	    if(set < globalSelections.length) {
		selArray = globalSelections[set];
	    }

	    var oldSelArray = [];
	    if(set < lastSeenGlobalSelections.length) {
		oldSelArray = lastSeenGlobalSelections[set];
	    }
	    
	    if(selArray.length != oldSelArray.length) {
		dirty = true;
		break;
	    }

    	    var lon1 = lons1[set];
    	    var lat1 = lats1[set];

    	    var lon2;
    	    var lat2;
    	    if(isLines[set]) {
    		var lon2 = lons2[set];
    		var lat2 = lats2[set];
    	    }

    	    for(var i = 0; i < Ns[set]; i++) {
    		if(lon1[i] === null
    		   || lat1[i] === null
    		   || (isLines[set] && (lon2[i] === null || lat2[i] === null))) {
    		    continue;
    		}

                var groupId = 0;
		if(i < selArray.length) {
		    groupId = selArray[i];
		}

                var oldGroupId = 0;
		if(i < oldSelArray.length) {
		    oldGroupId = oldSelArray[i];
		}
		
		if(groupId != oldGroupId) {
		    dirty = true;
		    break;
		}
	    }
	    
	    if(dirty) {
		break;
	    }
	}

	if(dirty) {
	    // debugLog("global selections dirty, redraw");
	    
	    // debugLog("GlobalSelections dirty calls updateGraphics");
	    updateGraphics();
	}
    }


    // ==============================
    // ------- Mouse Stuff ----------
    // ==============================

    function newSelection(rect, keepOld) {
	// debugLog("newSelection");

	if(unique > 0) {
	    if(!keepOld) {
		clearSelections();
	    }
	    selections.push(rect);
	    selectionRect = null;

	    updateLocalSelections(false);
	    saveSelectionsInSlot();
	}
    };

    function clearSelections() {
	for(var i = 0; i < selections.length; i++) {
	    selections[i].setMap(null);
	}
	selections = [];
    }

    function selectAll() {
	clearSelections();

	if(unique <= 0) {
	    // nothing to do
	} else {
	    var bounds = new google.maps.LatLngBounds();
	    var p1 = new google.maps.LatLng(limits.minX, limits.minY);
	    var p2 = new google.maps.LatLng(limits.maxX, limits.maxY);
	    bounds.extend(p1);
	    bounds.extend(p2);

	    var cols = $scope.gimme("GroupColors");
	    var col = "#FFEBCD";
	    var border = "#FFA500";
	    
	    if(cols && cols.hasOwnProperty("selection")) {
		if(cols.selection.hasOwnProperty("color")) {
		    col = cols.selection.color;
		}
		if(cols.selection.hasOwnProperty("border")) {
		    border = cols.selection.border;
		}
	    }
	    
	    selectionRect = new google.maps.Rectangle({
		map: map,
		bounds: bounds,
		fillOpacity: 0.25,
		strokeWeight: 0.95,
		strokeColor: border,
		fillColor: col,
		clickable: false
	    });

	    selections.push(selectionRect);
	    selectionRect = null;
	}

	updateLocalSelections(true);
	saveSelectionsInSlot();
    };

    function hexColorToRGBA(color, alpha) {
	if(typeof color === 'string'
	   && color.length == 7) {
	    
	    var r = parseInt(color.substr(1,2), 16);
	    var g = parseInt(color.substr(3,2), 16);
	    var b = parseInt(color.substr(5,2), 16);

	    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
	}
	return color;
    };


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

	$scope.addPopupMenuItemDisabled('EditCustomMenuItems');
	$scope.addPopupMenuItemDisabled('EditCustomInteractionObjects');
	$scope.addPopupMenuItemDisabled('AddCustomSlots');

	var ios = $scope.theInteractionObjects;
	for(var i = 0, io; i < ios.length; i++){
	    io = ios[i];
	    if(io.scope().getName() == 'Resize'){
		io.scope().setIsEnabled(false);
	    }
	    if(io.scope().getName() == 'Rotate'){
		io.scope().setIsEnabled(false);
	    }
	}

    	var myCanvasElement = $scope.theView.parent().find('#theCanvas');
    	if(myCanvasElement.length > 0) {
    	    myCanvas = myCanvasElement[0];
    	    ctx = myCanvas.getContext("2d");
    	} else {
    	    debugLog("no canvas to draw on!");
    	}

        $scope.addSlot(new Slot('ZoomLevel',
				mapZoom,
				"Zoom Level",
				'The zoom level of the map.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));

        $scope.addSlot(new Slot('MapCenterLatitude',
				mapCenterLat,
				"Map Center Latitude",
				'Where the map is centered.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));

        $scope.addSlot(new Slot('MapCenterLongitude',
				mapCenterLon,
				"Map Center Longitude",
				'Where the map is centered.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));



        $scope.addSlot(new Slot('InternalSelections',
				{},
				"Internal Selections",
				'Slot to save the internal state of what is selected.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));
	// $scope.getSlot('InternalSelections').setDisabledSetting(Enum.SlotDisablingState.AllVisibility);

        $scope.addSlot(new Slot('DataDropped',
				{},
				"Data Dropped",
				'Slot to notify parent that data has been dropped on this plugin using drag&drop.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));
	$scope.getSlot('DataDropped').setDisabledSetting(Enum.SlotDisablingState.AllVisibility);

        $scope.addSlot(new Slot('SelectAll',
				false,
				"Select All",
				'Slot to quickly reset all selections to select all available data.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));

        // internal slots specific to this Webble -----------------------------------------------------------

        $scope.addSlot(new Slot('FontSize',
				11,
				"Font Size",
				'The font size to use in the Webble interface.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));

        $scope.addSlot(new Slot('DotSize',
				dotSize,
				"Dot Size",
				'The size (in pixels) of the dots in the plot.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));

        $scope.addSlot(new Slot('LineWidth',
				lineWidth,
				"Line Width",
				'The width (in pixels) of the lines in the plot.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));

        $scope.addSlot(new Slot('Transparency',
				transparency,
				"Transparency",
				'The transparency, from 0 to 1, of the plots (if many items overlap, setting transparency closer to 0 may make it clearer).',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));

        $scope.addSlot(new Slot('HeatMapLowValueColor',
				lowValCol,
				"Heat Map Low Value Color",
				'The color to use for the low values in the heat map plot.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));
        $scope.addSlot(new Slot('HeatMapHighValueColor',
				highValCol,
				"Heat Map High Value Color",
				'The color to use for the high values in the heat map plot.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));
        $scope.addSlot(new Slot('HeatMapValueMaxLevel',
				upperLimit,
				"Heat Map Value Max Level",
				'The maximum value to truncate heat map values to.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));
        $scope.addSlot(new Slot('HeatMapValueMinLevel',
				lowerLimit,
				"Heat Map Value Min Level",
				'The minimum value truncate heat map values to.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));


        $scope.addSlot(new Slot('QuickRenderThreshold',
				500,
				"Quick Render Threshold",
				'The number of data items to accept before switching to faster (but less pretty) rendering.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));

        $scope.addSlot(new Slot('TreatNullAsUnselected',
				false,
				"Treat Null as Unselected",
				'Group data items with no value together with items that are not selected (otherwise they get their own group).',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));
	

        // Dashboard Plugin slots -----------------------------------------------------------

        $scope.addSlot(new Slot('PluginName',
				"Map",
				'Plugin Name',
				'The name to display in menus etc.',
				$scope.theWblMetadata['templateid'],
				undefined,                                 
				undefined
			       ));

        $scope.addSlot(new Slot('PluginType',
				"VisualizationPlugin",
				"Plugin Type",
				'The type of plugin this is. Should always be "VisualizationPlugin".',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));


        $scope.addSlot(new Slot('ExpectedFormat',
				[
				    [{'idSlot':'DataIdSlot', 'name':'Point Latitude', 'type':'latitude', 'slot':'Latitude1'},
				     {'idSlot':'DataIdSlot', 'name':'Point Longitude', 'type':'longitude', 'slot':'Longitude1'}],

				    [{'idSlot':'DataIdSlot', 'name':'Start Latitude', 'type':'latitude', 'slot':'Latitude1'},
				     {'idSlot':'DataIdSlot', 'name':'Start Longitude', 'type':'longitude', 'slot':'Longitude1'},
				     {'idSlot':'DataIdSlot', 'name':'End Latitude', 'type':'latitude', 'slot':'Latitude2'},
				     {'idSlot':'DataIdSlot', 'name':'End Longitude', 'type':'longitude', 'slot':'Longitude2'}],

				    [{'idSlot':'DataIdSlot', 'name':'Cell Latitude', 'type':'latitude', 'slot':'Latitude1'},
				     {'idSlot':'DataIdSlot', 'name':'Cell Longitude', 'type':'longitude', 'slot':'Longitude1'},
				     {'idSlot':'DataIdSlot', 'name':'Cell Value', 'type':'number', 'slot':'Value1'}]
				],
				"Expected Format",
				'The input this plugin accepts.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));

        $scope.addSlot(new Slot('Latitude1',
				[[1,1,3,4,3,1]],
				"Latitude 1",
				'The slot where the Y-axis input data should be put for dots, or the start position for lines.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));
	$scope.getSlot('Latitude1').setDisabledSetting(Enum.SlotDisablingState.AllVisibility);
	
        $scope.addSlot(new Slot('Longitude1',
				[[1,1,3,4,3,1]],
				"Longitude 1",
				'The slot where the X-axis input data should be put for dots, or the start position for lines.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));
	$scope.getSlot('Longitude1').setDisabledSetting(Enum.SlotDisablingState.AllVisibility);

        $scope.addSlot(new Slot('Value1',
				[[1,1,3,4,3,1]],
				"Valye 1",
				'The slot where the heat map intensity input data should be put for dots, or the start position for lines.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));
	$scope.getSlot('Value1').setDisabledSetting(Enum.SlotDisablingState.AllVisibility);

        $scope.addSlot(new Slot('Latitude2',
				[[1,1,3,4,3,1]],
				"Latitude 2",
				'The slot where the Y-axis input data end points for lines should be put.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));
	$scope.getSlot('Latitude2').setDisabledSetting(Enum.SlotDisablingState.AllVisibility);

        $scope.addSlot(new Slot('Longitude2',
				[[1,1,3,4,3,1]],
				"Longitude 2",
				'The slot where the X-axis input data end points for lines should be put.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));
	$scope.getSlot('Longitude2').setDisabledSetting(Enum.SlotDisablingState.AllVisibility);



	$scope.addSlot(new Slot('DataIdSlot',
				[[1,2,3,4,5,6]],
				"Data ID Slot",
				'The slot where the IDs of the input data items should be put.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));
	$scope.getSlot('DataIdSlot').setDisabledSetting(Enum.SlotDisablingState.AllVisibility);


        // Which data items have been selected locally (output from this webble)
        $scope.addSlot(new Slot('LocalSelections',
				{},
				"Local Selections",
				'Output Slot. A dictionary mapping data IDs to the group they are grouped into using only this plugin.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));
	$scope.getSlot('LocalSelections').setDisabledSetting(Enum.SlotDisablingState.AllVisibility);

	// set to indicate that the local selections have changed
        $scope.addSlot(new Slot('LocalSelectionsChanged',
				false,
				"Local Selections Changed",
				'Hack to work around problems in Webble World.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));

        // Which data items have been highlighted, locally (output from this webble)
        $scope.addSlot(new Slot('LocalHighlights',
				{},
				"Local Highlights",
				'Output Slot. A dictionary telling which data IDs should be highlighted.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));
	$scope.getSlot('LocalHighlights').setDisabledSetting(Enum.SlotDisablingState.AllVisibility);

	// set to indicate that the local Highlights have changed
        // $scope.addSlot(new Slot('LocalHighlightsChanged',
	// 			false,
	// 			'Local Highlights Changed',
	// 			'Hack to work around problems in Webble World.',
	// 			$scope.theWblMetadata['templateid'],
	// 			undefined,
	// 			undefined
	// 			));


        // Which data items have been selected, globally (input to this webble)
        $scope.addSlot(new Slot('GlobalSelections',
				{},
				"Global Selections",
				'Input Slot. A dictionary mapping data IDs to groups. Specifying what data items to draw in what colors.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));
	$scope.getSlot('GlobalSelections').setDisabledSetting(Enum.SlotDisablingState.AllVisibility);

	// set to indicate that the global selections have changed
        // $scope.addSlot(new Slot('GlobalSelectionsChanged',
	// 			false,
	// 			'Global Selections Changed',
	// 			'Hack to work around problems in Webble World.',
	// 			$scope.theWblMetadata['templateid'],
	// 			undefined,
	// 			undefined
	// 			));

        // Which data items have been highlighted globally
        $scope.addSlot(new Slot('Highlights',
				{},
				"Highlights",
				'Input Slot. A dictionary specifying which IDs to highlight.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));
	$scope.getSlot('Highlights').setDisabledSetting(Enum.SlotDisablingState.AllVisibility);

	// set to indicate that some settings were changed, so we probably need new data
        // $scope.addSlot(new Slot('HighlightsChanged',
	// 			false,
	// 			'Global Highlights Changed',
	// 			'Hack to work around problems in Webble World.',
	// 			$scope.theWblMetadata['templateid'],
	// 			undefined,
	// 			undefined
	// 			));

        // // colors of groups of data, and the background color theme
        $scope.addSlot(new Slot('GroupColors',
				{"skin":{"color":"#8FBC8F", "border":"#8FBC8F", "gradient":[{"pos":0, "color":"#E9F2E9"}, {"pos":0.75, "color":"#8FBC8F"}, {"pos":1, "color":"#8FBC8F"}]}, 
				 "selection":{"color":"#FFA500", "border":"#FFA500", "gradient":[{"pos":0, "color":"#FFEDCC"}, {"pos":1, "color":"#FFA500"}]}, 
				 "groups":{0:{"color":"#A9A9A9", "gradient":[{"pos":0, "color":"#EEEEEE"}, {"pos":0.75, "color":"#A9A9A9"}]},
					   1:{"color":"#0000FF", "gradient":[{"pos":0, "color":"#CCCCFF"}, {"pos":0.75, "color":"#0000FF"}]},
					   2:{"color":"#7FFF00", "gradient":[{"pos":0, "color":"#E5FFCC"}, {"pos":0.75, "color":"#7FFF00"}]},
					   3:{"color":"#8A2BE2", "gradient":[{"pos":0, "color":"#E8D5F9"}, {"pos":0.75, "color":"#8A2BE2"}]},
					   4:{"color":"#FF7F50", "gradient":[{"pos":0, "color":"#FFE5DC"}, {"pos":0.75, "color":"#FF7F50"}]},
					   5:{"color":"#DC143C", "gradient":[{"pos":0, "color":"#F8D0D8"}, {"pos":0.75, "color":"#DC143C"}]},
					   6:{"color":"#006400", "gradient":[{"pos":0, "color":"#CCE0CC"}, {"pos":0.75, "color":"#006400"}]},
					   7:{"color":"#483D8B", "gradient":[{"pos":0, "color":"#DAD8E8"}, {"pos":0.75, "color":"#483D8B"}]},
					   8:{"color":"#FF1493", "gradient":[{"pos":0, "color":"#FFD0E9"}, {"pos":0.75, "color":"#FF1493"}]},
					   9:{"color":"#1E90FF", "gradient":[{"pos":0, "color":"#D2E9FF"}, {"pos":0.75, "color":"#1E90FF"}]},
					   10:{"color":"#FFD700", "gradient":[{"pos":0, "color":"#FFF7CC"}, {"pos":0.75, "color":"#FFD700"}]},
					   11:{"color":"#8B4513", "gradient":[{"pos":0, "color":"#E8DAD0"}, {"pos":0.75, "color":"#8B4513"}]},
					   12:{"color":"#FFF5EE", "gradient":[{"pos":0, "color":"#FFFDFC"}, {"pos":0.75, "color":"#FFF5EE"}]},
					   13:{"color":"#00FFFF", "gradient":[{"pos":0, "color":"#CCFFFF"}, {"pos":0.75, "color":"#00FFFF"}]},
					   14:{"color":"#000000", "gradient":[{"pos":0, "color":"#CCCCCC"}, {"pos":0.75, "color":"#000000"}]}
					  }},
				"Group Colors",
				'Input Slot. Mapping group numbers to colors.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));

        // This tells us what fields of data the parent has filled for us, and what labels to use on axes for these fields.
        $scope.addSlot(new Slot('DataValuesSetFilled',
				[],
				"Data Values Set Filled",
				'Input Slot. Specifies which data slots were filled with data.',
				$scope.theWblMetadata['templateid'],
				undefined,
				undefined
			       ));

        // set to indicate that the data has been updated
        // $scope.addSlot(new Slot('DataValuesChanged',
	// 			false,
	// 			'Data Values Changed',
	// 			'Hack to work around problems in Webble World.',
	// 			$scope.theWblMetadata['templateid'],
	// 			undefined,
	// 			undefined
	// 			));


        $scope.setDefaultSlot('');

	myInstanceId = $scope.getInstanceId();

	$scope.registerWWEventListener(Enum.availableWWEvents.slotChanged, function(eventData){
	    mySlotChange(eventData);
	});

	updateSize();
	
	// debugLog("Init calls updateGraphics");
	updateGraphics();

	$scope.fixDroppable();

	$timeout(function(){initializeMapAPI(); updateSize(); 	debugLog("Init timeout function calls updateGraphics"); updateGraphics();});
    };
    //===================================================================================


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
