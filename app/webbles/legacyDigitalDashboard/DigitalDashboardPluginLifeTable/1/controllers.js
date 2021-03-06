//======================================================================================================================
// Controllers for DigitalDashboardPluginLifeTable for Webble World v3.0 (2013)
// Created By: Jonas Sjobergh
//======================================================================================================================

//=======================================================================================
// WEBBLE CONTROLLER
// This is the Main controller for this Webble Template
// NOTE: This file must exist and be an AngularJS Controller declared as seen below.
//=======================================================================================
wblwrld3App.controller('lifeTablePluginWebbleCtrl', function($scope, $log, Slot, Enum) {

    //=== PROPERTIES ====================================================================

    $scope.stylesToSlots = {
        DrawingArea: ['width', 'height']
    };

    $scope.customMenu = [];

    $scope.customInteractionBalls = [];

    $scope.displayText = "Life Table";

    var myInstanceId = -1;
    
    // graphics

    var myCanvasElement = null;
    var myCanvas = null;
    var ctx = null;
    var dropCanvas = null;
    var dropCtx = null;
    
    var hoverText = null;

    var dataName = "";

    var selectionCanvas = null;
    var selectionCtx = null;
    var selectionColors = null;
    var selectionTransparency = 0.33;

    var selectionHolderElement = null;
    var selectionRect = null;

    var selections = []; // the graphical ones

    // layout
    var leftMarg = 35;
    var topMarg = 20;
    var rightMarg = 30;
    var bottomMarg = 5;
    var fontSize = 11;

    var colorPalette = null;
    
    var useGlobalGradients = false;
    var usePercent = true;

    var clickStart = null;

    // data from parent

    var idArrays = [];
    // var diagnosisArrays = [];
    var deathArrays = [];
    var followUpArrays = [];
    var dataType = "number";

    var sources = 0;
    var Ns = [];
    var N = 0;

    var haveFollowUp = false;

    var limits = {'minX':0, 'maxX':0, 'minY':0, 'maxY':0};
    var unique = 0; // number of data points with non-null values
    var NULLs = 0;

    var localSelections = []; // the data to send to the parent

    var noofGroups = 1;
    var drawH = 1;
    var drawW = 1;

    var lastSeenData = "";

    var internalSelectionsInternallySetTo = {};

    var textColor = "#000000";

    var dropTTDeath = {'left':leftMarg, 'top':topMarg, 'right':leftMarg*2, 'bottom':topMarg * 2, "label":"Time to Death)", "rotate":true, "forParent":{'idSlot':'DataIdSlot', 'name':'Time to Death', 'type':'number', 'slot':'Death'}};
    var dropTTLFU = {'left':leftMarg, 'top':topMarg*2, 'right':leftMarg*2, 'bottom':topMarg * 3, "label":"Time to LFU)", "rotate":true, "forParent":{'idSlot':'DataIdSlot', 'name':'Time to Last Follow-Up', 'type':'number', 'slot':'FollowUp'}};
    var dropTofDeath = {'left':leftMarg, 'top':topMarg*3, 'right':leftMarg*2, 'bottom':topMarg * 4, "label":"Date of Death)", "rotate":true, "forParent":{'idSlot':'DataIdSlot', 'name':'Date of Death', 'type':'date', 'slot':'Death'}};
    var dropTofLFU = {'left':leftMarg, 'top':topMarg*4, 'right':leftMarg*2, 'bottom':topMarg * 5, "label":"Date of LFU)", "rotate":true, "forParent":{'idSlot':'DataIdSlot', 'name':'Date of Last Follow-Up', 'type':'date', 'slot':'FollowUp'}};

    // var dropTTDeath = {'left':leftMarg, 'top':topMarg, 'right':leftMarg*2, 'bottom':topMarg * 2, "label":"Time to Death (number)", "rotate":true, "forParent":{'idSlot':'DataIdSlot', 'name':'Time to Death', 'type':'number', 'slot':'Death'}};
    // var dropTTLFU = {'left':leftMarg, 'top':topMarg*2, 'right':leftMarg*2, 'bottom':topMarg * 3, "label":"Time to LFU (number)", "rotate":true, "forParent":{'idSlot':'DataIdSlot', 'name':'Time to Last Follow-Up', 'type':'number', 'slot':'FollowUp'}};
    // var dropTofDeath = {'left':leftMarg, 'top':topMarg*3, 'right':leftMarg*2, 'bottom':topMarg * 4, "label":"Date of Death (date)", "rotate":true, "forParent":{'idSlot':'DataIdSlot', 'name':'Date of Death', 'type':'date', 'slot':'Death'}};
    // var dropTofLFU = {'left':leftMarg, 'top':topMarg*4, 'right':leftMarg*2, 'bottom':topMarg * 5, "label":"Date of LFU (date)", "rotate":true, "forParent":{'idSlot':'DataIdSlot', 'name':'Date of Last Follow-Up', 'type':'date', 'slot':'FollowUp'}};

    var dropTofDia = {'left':leftMarg, 'top':topMarg*5, 'right':leftMarg*2, 'bottom':topMarg * 6, "label":"Date of Diagnosis", "rotate":false, "forParent":{'idSlot':'DataIdSlot', 'name':'Date of Diagnosis', 'type':'date', 'slot':'Diagnosis'}};

    var allDropZones = [dropTTDeath, dropTTLFU, dropTofDeath, dropTofLFU, dropTofDia];

    var dragZone = {'left':-1, 'top':-1, 'right':-1, 'bottom':-1, 'name':"", 'ID':""};
    var allDragNames = [dragZone];
    $scope.dragNdropRepr = "Nothing to drag.";
    $scope.dragNdropID = "No drag data.";


    //=== EVENT HANDLERS ================================================================

    $scope.fixDraggable = function () {
	$scope.theView.find('.dragSrc').draggable({
	    helper: function() {		
		return $("<div id=\"" + $scope.dragNdropID + "\">" + $scope.dragNdropRepr + "</div>");
	    },
	    cursorAt: {top: 5, left: 5}
	});
    };

    $scope.fixDroppable = function () {
	$scope.theView.find('.canvasStuffForDigitalDashboardLifeTable').droppable({ 
	    over: function(e, ui) {
		if(e.target.id == "selectionHolder") {
		    updateDropZones(textColor, 1, true);
		}
	    },
	    out: function() {
		updateDropZones(textColor, 0.3, false);
	    },
	    tolerance: 'pointer',
	    drop: function(e, ui){
		if(e.target.id == "selectionHolder") {

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

    $scope.doDebugLogging = true;
    function debugLog(message) {
	if($scope.doDebugLogging) {
	    $log.log("DigitalDashboard Life Table: " + message);
	}
    }

    function getTextWidth(text, font) {
	if(ctx !== null && ctx !== undefined) {
	    ctx.font = font;
	    var metrics = ctx.measureText(text);
	    return metrics.width;
	}
	return 0;
    }

    function getTextWidthCurrentFont(text) {
	if(ctx !== null && ctx !== undefined) {
	    var metrics = ctx.measureText(text);
	    return metrics.width;
	}
	return 0;
    }

    function number2text(v, span) {
	if(parseInt(Number(v)) == v) {
	    return v.toString();
	}

	if(Math.abs(v) < 1) {
	    return v.toPrecision(3);
	}
	if(span > 10) {
	    return Math.round(v);
	}
	if(span > 5 && Math.abs(v) < 100) {
	    return v.toPrecision(2);
	}
	return v.toPrecision(3);
    }

    function date2text(v) {
	var days = v / (24*3600*1000);
	if(days < 100) {
	    return parseInt(days) + " days";
	}
	if(days < 1000) {
	    return parseInt(days/30) + " months";
	}
	return (days/365).toPrecision(2) + " years";
    }

    function shortenName(n) {
	var ss = n.split(":");
	return ss[ss.length - 1];
    }

    function pixel2valX(p) {
	if(unique <= 0) {
	    return 0;
	}
	
	if(p < leftMarg) {
	    return limits.minX;
	}
	if(p > leftMarg + drawW) {
	    return limits.maxX;
	}
	return limits.minX + (p - leftMarg) / drawW * (limits.maxX - limits.minX);
    };

    function pixel2valY(p) {
	if(unique <= 0) {
	    return 0;
	}
	
	if(p < topMarg) {
	    return limits.maxY; // flip Y-axis
	}
	if(p > topMarg + drawH) {
	    return limits.minY; // flip Y-axis
	}
	return limits.minY + (drawH - (p - topMarg)) / drawH * (limits.maxY - limits.minY); // flip Y-axis
    };

    function val2pixelX(v) {
	if(unique <= 0) {
	    return 0;
	}
	
	if(v < limits.minX) {
	    return leftMarg;
	}
	if(v > limits.maxX) {
	    return leftMarg + drawW;
	}
	
	return leftMarg + (v - limits.minX) / (limits.maxX - limits.minX) * drawW;
    };

    function val2pixelY(v) {
	if(unique <= 0) {
	    return 0;
	}
	
	if(v < limits.minY) {
	    return topMarg + drawH; // flip Y-axis
	}
	if(v > limits.maxY) {
	    return topMarg; // flip Y-axis
	}
	
	return topMarg + drawH - ((v - limits.minY) / (limits.maxY - limits.minY) * drawH); // flip Y-axis
    };

    function saveSelectionsInSlot() {
    	// debugLog("saveSelectionsInSlot");

    	var result = {};
    	result.selections = [];
    	for(var sel = 0; sel < selections.length; sel++) {
    	    result.selections.push({'minX':selections[sel][0], 'maxX':selections[sel][1]});
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
    	    var newSelections = [];
	    
    	    if(unique > 0) {
    		for(var sel = 0; sel < slotSelections.selections.length; sel++) {
    		    var newSel = slotSelections.selections[sel];
		    
    		    var X1 = newSel.minX;
    		    var X2 = newSel.maxX;
		    
    		    if(X2 < limits.minX 
    		       || X1 > limits.maxX) {
    			// completely outside
    			continue;
    		    }
		    
    		    X1 = Math.max(limits.minX, X1);
    		    X2 = Math.min(limits.maxX, X2);

		    var x1 = val2pixelX(X1);
		    var x2 = val2pixelX(X2);
		    if(x2 - x1 > 1) {
    			newSelections.push([X1,X2, x1,x2]);
		    } else {
			// debugLog("setSelectionsFromSlotValue ignoring selection because it is too small.");
		    }
    		}

    		// debugLog("new selections: " + JSON.stringify(newSelections));
    		if(newSelections.length > 0) {
    		    selections = newSelections;
    		    updateLocalSelections(false);
    		    drawSelections();
    		}
    	    } else { // no data
    		for(var sel = 0; sel < slotSelections.selections.length; sel++) {
    		    var newSel = slotSelections.selections[sel];
		    
    		    var X1 = newSel.minX;
    		    var X2 = newSel.maxX;

    		    newSelections.push([X1,X2, 0,0]);
    		}
    		selections = newSelections;
    	    }
    	}
	
    	saveSelectionsInSlot();
    };

    function checkSelectionsAfterNewData() {
    	// debugLog("checkSelectionsAfterNewData");

    	var newSelections = [];

    	for(var sel = 0; sel < selections.length; sel++) {
    	    var newSel = selections[sel];
    	    var X1 = newSel[0];
    	    var X2 = newSel[1];

    	    if(X2 < limits.minX 
    	       || X1 > limits.maxX) {
    		// completely outside
    		continue;
    	    }
	    
    	    X1 = Math.max(limits.minX, X1);
    	    X2 = Math.min(limits.maxX, X2);
	    
	    var x1 = val2pixelX(X1);
	    var x2 = val2pixelX(X2);
	    if(x2 - x1 > 1) {
    		newSelections.push([X1,X2, x1,x2]);
	    } else {
		// debugLog("checkSelectionsAfterNewData ignoring selection because it is too small.");
	    }
    	}

    	if(newSelections.length > 0) {
    	    selections = newSelections;
    	    drawSelections();
    	    return false;
    	}
    	return true;
    };

    function updateLocalSelections(selectAll) {
    	// debugLog("updateLocalSelections");

    	var nullAsUnselected = $scope.gimme('TreatNullAsUnselected');
    	var nullGroup = 0;
    	if(!nullAsUnselected) {
    	    nullGroup = selections.length + 1; // get unused groupId
    	}

    	var dirty = false;
	
    	selections.sort(function(a,b){return (a[1]-a[0]) - (b[1]-b[0]);}); // sort selections so smaller ones are checked first.

    	for(var set = 0; set < Ns.length; set++) {
    	    var deathArray = deathArrays[set];
    	    var followUpArray = [];
    	    if(haveFollowUp) {
    		followUpArray = followUpArrays[set];
    	    }
    	    var selArray = localSelections[set];

    	    for(var i = 0; i < Ns[set]; i++) {
    		var newVal = 1;
		
    		if(deathArray[i] === null
    		   && (!haveFollowUp || followUpArray[i] === null)) {
    		    newVal = nullGroup;
    		} else {
    		    if(selectAll) {
    			newVal = 1;
    		    } else {
    			var groupId = 0;
			
    			for(var span = 0; span < selections.length; span++) {
    			    var valToUse = limits.maxX;			    
    			    if(deathArray[i] !== null) {
    				valToUse = deathArray[i];
    			    }
    			    if(selections[span][0] <= valToUse
    			       && valToUse <= selections[span][1]) {
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
    	idArrays = [];
    	// diagnosisArrays = [];
    	deathArrays = [];
    	followUpArrays = [];
    	dataType = "number";

    	sources = 0;
    	Ns = [];
	
    	haveFollowUp = false;

	dataName = "";
	dragZone = {'left':-1, 'top':-1, 'right':-1, 'bottom':-1, 'name':"", 'ID':""};

    	limits = {'minX':0, 'maxX':0, 'minY':0, 'maxY':0};
    	unique = 0; // number of data points with non-null values
    	NULLs = 0;

    	localSelections = []; // the data to send to the parent
    };

    function parseData() {
    	// debugLog("parseData");

    	// parse parents instructions on where to find data, check that at least one data set is filled
    	var atLeastOneFilled = false;

    	var parentInput = $scope.gimme('DataValuesSetFilled');
    	if(typeof parentInput === 'string') {
    	    parentInput = JSON.parse(parentInput);
    	}

    	lastSeenData = JSON.stringify(parentInput);
	
    	resetVars();

    	if(parentInput.length > 0) {
    	    var haveDeath = false;
    	    haveFollowUp = false;
    	    var haveDiagnosis = false;
    	    var first = true;
    	    var corrupt = false;
	    
    	    for(var i = 0; i < parentInput.length; i++) {
    		if(parentInput[i].hasOwnProperty("name") && parentInput[i].name == 'Time to Death') {
    		    haveDeath = true;
		    
    		    if(first) {
    			first = false;
    			if(parentInput[i].hasOwnProperty("type") && parentInput[i].type == "date") {
    			    // should not happen? with this name we should get "number"
    			    debugLog("Time to Death was Date, this should not happen.");
    			    dataType = 'date';
    			} else {
    			    dataType = 'number';
    			}
    		    } else {
    			var thisType = 'number';
    			if(parentInput[i].hasOwnProperty("type")) {
    			    thisType = parentInput[i].type;
    			}
    			if(thisType != dataType) {
    			    debugLog("The data type of field " + parentInput[i].name + " does not match the types of other fields.");
    			    corrupt = true;
    			}
    		    }

		    dragZone.name = "Data";
		    dropTTDeath.forParent.vizName = $scope.gimme("PluginName");
		    dragZone.ID = JSON.stringify(dropTTDeath.forParent);

    		    if(parentInput[i].hasOwnProperty("description")) {
			dataName = shortenName(parentInput[i]["description"]);
			dragZone.name = dataName;
		    }
		}
		
    		if(parentInput[i].hasOwnProperty("name") && parentInput[i].name == 'Time to Last Follow-Up') {
    		    haveFollowUp = true;
		    
    		    if(first) {
    			first = false;
    			if(parentInput[i].hasOwnProperty("type") && parentInput[i].type == "date") {
    			    // should not happen? with this name we should get "number"
    			    debugLog("Time to Last Follow-Up was Date, this should not happen.");
    			    dataType = 'date';
    			} else {
    			    dataType = 'number';
    			}
    		    } else {
    			var thisType = 'number';
    			if(parentInput[i].hasOwnProperty("type")) {
    			    thisType = parentInput[i].type;
    			}
    			if(thisType != dataType) {
    			    debugLog("The data type of field " + parentInput[i].name + " does not match the types of other fields.");
    			    corrupt = true;
    			}
    		    }
    		}



    		if(parentInput[i].hasOwnProperty("name") && parentInput[i].name == 'Date of Death') {
    		    haveDeath = true;
		    
    		    if(first) {
    			first = false;
    			dataType = 'date';
    		    } else {
    			var thisType = 'date';
    			if(thisType != dataType) {
    			    debugLog("The data type of field " + parentInput[i].name + " does not match the types of other fields.");
    			    corrupt = true;
    			}
    		    }
		    
		    dragZone.name = "Data";
		    dropTofDeath.forParent.vizName = $scope.gimme("PluginName");
		    dragZone.ID = JSON.stringify(dropTofDeath.forParent);

    		    if(parentInput[i].hasOwnProperty("description")) {
			dataName = shortenName(parentInput[i]["description"]);
			dragZone.name = dataName;
		    }
    		}

    		if(parentInput[i].hasOwnProperty("name") && parentInput[i].name == 'Date of Diagnosis') {
    		    haveDiagnosis = true;
		    
    		    if(first) {
    			first = false;
    			dataType = 'date';
    		    } else {
    			var thisType = 'date';
    			if(thisType != dataType) {
    			    debugLog("The data type of field " + parentInput[i].name + " does not match the types of other fields.");
    			    corrupt = true;
    			}
    		    }
    		}

    		if(parentInput[i].hasOwnProperty("name") && parentInput[i].name == 'Date of Last Follow-Up') {
    		    haveFollowUp = true;
		    
    		    if(first) {
    			first = false;
    			dataType = 'date';
    		    } else {
    			var thisType = 'date';
    			if(thisType != dataType) {
    			    debugLog("The data type of field " + parentInput[i].name + " does not match the types of other fields.");
    			    corrupt = true;
    			}
    		    }
    		}
    	    }

    	    if(dataType == 'number' && haveDeath) {
    		atLeastOneFilled = true;
    	    }
    	    if(dataType == 'date' && haveDeath && haveDiagnosis) {
    		atLeastOneFilled = true;
    	    }
    	    if(corrupt) {
    		atLeastOneFilled = false;
    	    }
    	}
	
    	// debugLog("read parent input ", atLeastOneFilled);
	
    	var dataIsCorrupt = false;

    	if(atLeastOneFilled) {
    	    idArrays = $scope.gimme('DataIdSlot');
    	    deathArrays = $scope.gimme('Death');
	    
    	    if(idArrays.length != deathArrays.length) {
    		dataIsCorrupt = true;
    	    }
    	    if(idArrays.length <= 0) {
    		dataIsCorrupt = true;
    	    }

    	    var diagnosisArrays = null;
    	    var deathDateArrays = null;
    	    var followUpDateArrays = null;

    	    if(dataType == 'date') {
    		diagnosisArrays = $scope.gimme('Diagnosis');
    		if(idArrays.length != diagnosisArrays.length) {
    		    dataIsCorrupt = true;
    		}
    	    }

    	    if(haveFollowUp) {
    		followUpArrays = $scope.gimme('FollowUp');
    		if(idArrays.length != followUpArrays.length) {
    		    dataIsCorrupt = true;
    		}
    	    }

    	    if(!dataIsCorrupt) {
    		sources = idArrays.length;
		
    		for(var source = 0; source < sources; source++) {
    		    var idArray = idArrays[source];
    		    var deathArray = deathArrays[source];
		    
    		    if(idArray.length != deathArray.length) {
    			dataIsCorrupt = true;
    		    }
    		    if(idArray.length <= 0) {
    			dataIsCorrupt = true;
    		    }

    		    if(dataType == 'date') {
    			diagnosisArray = diagnosisArrays[source]
    			if(idArray.length != diagnosisArray.length) {
    			    dataIsCorrupt = true;
    			}
    		    }

    		    if(haveFollowUp) {
    			followUpArray = followUpArrays[source];
    			if(idArray.length != followUpArray.length) {
    			    dataIsCorrupt = true;
    			}
    		    }
    		}
    	    }

    	    if(!dataIsCorrupt) {
    	    	Ns = [];
    	    	var N = 0;
    	    	var firstNonNullData = true;
    	    	var minXVal = 0;
    	    	var maxXVal = 0;
    	    	var minYVal = 0;
    	    	var maxYVal = 0;

    	    	if(dataType == 'date') { // make new arrays with the time to death, we no longer need the dates after that
    	    	    deathDateArrays = deathArrays;
    	    	    deathArrays = [];

    	    	    if(haveFollowUp) {
    	    		followUpDateArrays = followUpArrays;
    	    		followUpArrays = [];
    	    	    }
    	    	}
		
    	    	for(var source = 0; source < sources; source++) {
    	    	    var idArray = idArrays[source];
    	    	    var deathDateArray = null;
    	    	    var followUpDateArray = null;

    	    	    if(dataType == 'number') {
    	    		deathArray = deathArrays[source];
    	    		if(haveFollowUp) {
    	    		    followUpArray = followUpArrays[source];
    	    		}
    	    	    } else {
    	    		deathArray = [];
    	    		deathArrays.push(deathArray);
    	    		deathDateArray = deathDateArrays[source];
			
    	    		if(haveFollowUp) {
    	    		    followUpArray = [];
    	    		    followUpArrays.push(followUpArray);
    	    		    followUpDateArray = followUpDateArrays[source];
    	    		}
    	    		diagnosisArray = diagnosisArrays[source];
    	    	    }

    	    	    Ns.push(idArray.length);
    	    	    N += idArray.length;
    	    	    localSelections.push([]);

    	    	    for(i = 0; i < Ns[source]; i++) {
    	    		localSelections[source].push(0);

    	    		var isNull = false;
    	    		if(dataType == 'date') {
    	    		    if(diagnosisArray[i] === null) {
    	    			deathArray.push(null);
    	    			if(haveFollowUp) {
    	    			    followUpArray.push(null);
    	    			}
    	    			isNull = true;
    	    		    } else {
    	    			isNull = true;
    	    			if(deathDateArray[i] === null) {
    	    			    deathArray.push(null);
    	    			} else {
    	    			    isNull = false;
    	    			    deathArray.push(deathDateArray[i] - diagnosisArray[i]);
				    if(deathArray[i] < 0) {
					debugLog("death before diagnosis: death=" + (new Date(parseInt(deathDateArray[i]))).toString() + ", diagnosis=" + (new Date(parseInt(diagnosisArray[i]))));
					deathArray[i] = 0;
				    }
    	    			}
    	    			if(haveFollowUp) {
    	    			    if(followUpDateArray[i] === null) {
    	    				followUpArray.push(null);
    	    			    } else {
    	    				isNull = false;
    	    				followUpArray.push(followUpDateArray[i] - diagnosisArray[i]);
					if(followUpArray[i] < 0) {
					    debugLog("follow-up before diagnosis: follow-up=" + (new Date(parseInt(followUpDateArray[i]))).toString() + ", diagnosis=" + (new Date(parseInt(diagnosisArray[i]))));
					    followUpArray[i] = 0;
					}
    	    			    }
    	    			}
    	    		    }
    	    		} else { // 'number'
    	    		    if(deathArray[i] === null && (!haveFollowUp || followUpArray[i] === null)) {
    	    			isNull = true;
    	    		    } else {
    	    			isNull = false;
    	    		    }
    	    		}
			
    	    		if(isNull) {
    	    		    NULLs++;
    	    		} else {
    	    		    unique++;

    	    		    var d = deathArray[i];
    	    		    var f = d;
    	    		    if(haveFollowUp) {
    	    			f = followUpArray[i];
    	    		    }
			    
    	    		    if(firstNonNullData) {
    	    			firstNonNullData = false;
    	    			minXVal = Math.min(d, f);
    	    			maxXVal = Math.max(d, f);
    	    		    } else {
    	    			minXVal = Math.min(d, f, minXVal);
    	    			maxXVal = Math.max(d, f, maxXVal);
    	    		    }
    	    		} 
    	    	    }
    	    	}
		
    		if(firstNonNullData) {
    		    dataIsCorrupt = true; // only null values
    		} else {
    		    limits = {};
    		    limits.minX = Math.min(0, minXVal);
    		    limits.maxX = maxXVal;
		    
    		    limits.minY = 0;
    		    if(usePercent) {
    			limits.maxY = 1;
    		    } else {
    			limits.maxY = N;
    		    }
    		    // debugLog("parseData limits: " + JSON.stringify(limits));
    		}
    	    }
	    
    	    if(dataIsCorrupt) {
    		debugLog("data is corrupt");
    		resetVars();
    	    } else {
		
    		// TODO: check if we should keep the old selections
    		// selections = [[limits.min, limits.max]];
    	    }
    	} else {
    	    // debugLog("no data");
    	}
	
    	updateGraphics();

    	if(unique > 0) {
    	    var giveUp = checkSelectionsAfterNewData();
    	    if(giveUp) {
    		selectAll();
    	    } else {
    		updateLocalSelections(false);
    		saveSelectionsInSlot();
    	    }
    	} else { // no data
    	    $scope.set('LocalSelections', {'DataIdSlot':[]});
	    
    	    if(selectionCtx === null) {
    		selectionCtx = selectionCanvas.getContext("2d");
    		var W = selectionCanvas.width;
    		var H = selectionCanvas.height;
    		selectionCtx.clearRect(0,0, W,H);
    	    }
    	}

    };

    function updateGraphics() {
    	// debugLog("updateGraphics()");

    	if(myCanvas === null) {
    	    var myCanvasElement = $scope.theView.parent().find('#theCanvas');
    	    if(myCanvasElement.length > 0) {
    		myCanvas = myCanvasElement[0];
    	    } else {
    		debugLog("no canvas to draw on!");
    		return;
    	    }
    	}

    	if(ctx === null) {
    	    ctx = myCanvas.getContext("2d");
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

    	// debugLog("Clear the canvas");
    	ctx.clearRect(0,0, W,H);

    	drawBackground(W, H);
    	drawLifeTable(W, H);
    	drawAxes(W, H);

	updateDropZones(textColor, 0.3, false);
    }; 

    function updateDropZones(col, alpha, hover) {
	// debugLog("update the data drop zone locations");

	if(dropCanvas === null) {
   	    var myCanvasElement = $scope.theView.parent().find('#theDropCanvas');
    	    if(myCanvasElement.length > 0) {
    		dropCanvas = myCanvasElement[0];
    	    } else {
    		debugLog("no drop canvas to draw on!");
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

	    dropCtx.clearRect(0,0, W,H);

	    var marg1 = 8;
	    if(drawW < 40) {
		marg1 = 0;
	    }
	    var marg2 = 8;
	    if(drawH < 40) {
		marg2 = 0;
	    }

	    var left = 0;
	    var top = topMarg;
	    var height = Math.max(5, drawH + 2);
	    var width = Math.max(5, leftMarg - 8);

	    dropTTDeath.left = 0;
	    dropTTDeath.right = leftMarg;
	    dropTTDeath.top = topMarg + marg2;
	    dropTTDeath.bottom = topMarg + Math.floor(drawH / 2) - marg2;

	    dropTTLFU.left = dropTTDeath.left;
	    dropTTLFU.right = dropTTDeath.right;
	    dropTTLFU.top = topMarg + Math.floor(drawH / 2) + marg2;
	    dropTTLFU.bottom = topMarg + drawH - marg2;

	    dropTofDeath.left = W - rightMarg;
	    dropTofDeath.right = W;
	    dropTofDeath.top = dropTTDeath.top;
	    dropTofDeath.bottom = dropTTDeath.bottom;

	    dropTofLFU.left = dropTofDeath.left;
	    dropTofLFU.right = dropTofDeath.right;
	    dropTofLFU.top = dropTTLFU.top;
	    dropTofLFU.bottom = dropTTLFU.bottom;

	    dropTofDia.left = leftMarg + marg1;
	    dropTofDia.right = leftMarg + drawW - marg1
	    dropTofDia.top = topMarg + drawH;
	    dropTofDia.bottom = H;

	    if(hover) {
		dropCtx.save();
		dropCtx.fillStyle = "rgba(0, 0, 0, 0.75)";
		dropCtx.fillRect(0,0, W, H);
		dropCtx.restore();
		
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
			var fnt = "bold " + (fontSize + 5) + "px Arial";

			var str = dropZone.label;
			var tw = getTextWidth(str, fnt);

			var textArea = dropZone.right - dropZone.left;
			if(dropZone.rotate) {
			    textArea = dropZone.bottom - dropZone.top;
			}

			var fontAdjust = 1;
			while(tw > 2 * textArea) {
			    fnt = "bold " + (fontSize + 5 - fontAdjust) + "px Arial";
			    tw = getTextWidth(str, fnt);
			    fontAdjust++;
			    
			    if(fontAdjust > fontSize) {
				break;
			    }
			}

			var labelShift = Math.floor(fontSize / 2);
			if(dropZone.rotate) {
			    if(dropZone.top < H / 2) {
				if(dropZone.left > W / 2) {
    				    dropCtx.translate(dropZone.right - 1 - 3*labelShift, dropZone.top + Math.floor((dropZone.bottom - dropZone.top - tw) / 2));
				} else {
    				    dropCtx.translate(dropZone.left + 1 + labelShift, dropZone.top + Math.floor((dropZone.bottom - dropZone.top - tw) / 2));
				}
			    } else {
				if(dropZone.left > W / 2) {
    				    dropCtx.translate(dropZone.left - 1, dropZone.top + Math.floor((dropZone.bottom - dropZone.top - tw) / 2));
				} else {
    				    dropCtx.translate(dropZone.right - 1 - 2*labelShift, dropZone.top + Math.floor((dropZone.bottom - dropZone.top - tw) / 2));
				}
			    }
    			    dropCtx.rotate(Math.PI/2);
			} else {
			    if(dropZone.top < H / 2) {
    				dropCtx.translate(dropZone.left + Math.floor((dropZone.right - dropZone.left - tw) / 2), dropZone.bottom + labelShift);
			    } else {
    				dropCtx.translate(dropZone.left + Math.floor((dropZone.right - dropZone.left - tw) / 2), dropZone.top + labelShift);
			    }
			}
			dropCtx.font = fnt;
			dropCtx.fillText(str, 0, 0);
		    }
		    dropCtx.restore();
		}
	    }
	}
    }

    function drawBackground(W,H) {
    	var colors = $scope.gimme("GroupColors");
    	if(typeof colors === 'string') {
    	    colors = JSON.parse(colors);
    	}

	if(colors.hasOwnProperty("skin") && colors.skin.hasOwnProperty("text")) {
	    textColor = colors.skin.text;
	} else {
	    textColor = "#000000";
	}

    	if(colors.hasOwnProperty("skin")) {
    	    var drewBack = false
    	    if(colors.skin.hasOwnProperty("gradient")) {
    		var OK = true;
		
    		var grd = ctx.createLinearGradient(0,0,W,H);
    		for(var i = 0; i < colors.skin.gradient.length; i++) {
    		    var cc = colors.skin.gradient[i];
    		    if(cc.hasOwnProperty('pos') && cc.hasOwnProperty('color')) {
    			grd.addColorStop(cc.pos, cc.color);
    		    } else {
    			OK = false;
    		    }
    		}
    		if(OK) {
    		    ctx.fillStyle = grd;
    		    ctx.fillRect(0,0,W,H);
    		    drewBack = true;
    		}
    	    }
    	    if(!drewBack && colors.skin.hasOwnProperty("color")) {
    		ctx.fillStyle = colors.skin.color;
    		ctx.fillRect(0,0,W,H);
    		drewBack = true;
    	    }

    	    if(colors.skin.hasOwnProperty("border")) {
    		ctx.fillStyle = colors.skin.border;

    		ctx.fillRect(0,0, W,1);
    		ctx.fillRect(0,H-1, W,H);
    		ctx.fillRect(0,0, 1,H);
    		ctx.fillRect(W-1,0, W,H);
    	    }
    	}
    };

    function drawAxes(W, H) {
    	drawW = W - leftMarg - rightMarg;
    	drawH = H - topMarg - bottomMarg * 2 - fontSize;

    	// X Axis
	
    	ctx.fillStyle = "black";
    	ctx.fillRect(leftMarg - 3, topMarg + drawH, drawW+2, 2);

    	if(unique > 0) {
    	    var LABELS = 5;
    	    for(var i = 0; i < LABELS+1; i++) {
    		var pos = leftMarg + i/LABELS*drawW;

    		var s = "";
    		if(dataType == 'date') {
    		    s = date2text(Math.floor(pixel2valX(pos)));
    		} else {
    		    s = number2text(pixel2valX(pos), limits.maxX);
    		}
		
    		ctx.fillStyle = "black";
    		ctx.font = fontSize + "px Arial";
    		var textW = getTextWidthCurrentFont(s);
    		ctx.fillText(s, pos - textW/2, H - bottomMarg);
    		ctx.fillRect(pos, topMarg + drawH - 2, 1, 6);
    	    }
    	}

    	// Y Axis

    	ctx.fillStyle = "black";
    	ctx.fillRect(leftMarg - 3, topMarg, 2, drawH + 2);

    	if(unique > 0) {
	    
	    // top label

	    var str = "";
	    if(dataName != "") {
		str = dataName;
	    }
	    
	    if(str != "") {
		var w = getTextWidthCurrentFont(str);
		var top = 0;
		if(fontSize < topMarg) {
		    top = Math.floor((topMarg - fontSize) / 2);
		}
		var left = 0;
		if(w < W) {
		    left = Math.floor((W - w) / 2);
		}

		ctx.fillText(str, left, top + fontSize);

		dragZone = {'left':left, 'top':top, 'right':(left + w), 'bottom':(top + fontSize), 'name':dragZone.name, 'ID':dragZone.ID};
		allDragNames = [dragZone];
	    }

    	    var LABELS = 5;
    	    for(var i = 0; i < LABELS+1; i++) {
    		var pos = topMarg + i/LABELS*drawH;

    		var s = "";
    		if(usePercent) {
    		    s = Math.round(pixel2valY(pos) * 100) + "%";
    		} else {
    		    s = Math.round(pixel2valY(pos));
    		}
		
    		ctx.fillStyle = "black";
    		ctx.font = fontSize + "px Arial";
    		var textW = getTextWidthCurrentFont(s);
    		if(leftMarg > textW + 5) {
    		    ctx.fillText(s, leftMarg - 6 - textW, pos + fontSize/2);
    		} else {
    		    ctx.fillText(s, 0, pos + fontSize/2);
    		}
    		ctx.fillRect(leftMarg - 5, pos, 6, 1);
    	    }
    	}
    };


    function drawLifeTable(W, H) {
	// debugLog("drawLifeTable");

    	if(unique <= 0) {
    	    return;
    	}
    	drawW = W - leftMarg - rightMarg;
    	drawH = H - topMarg - bottomMarg * 2 - fontSize;

    	var globalSelections = [];
	var globalSelectionsPerId = $scope.gimme('GlobalSelections');
	if(globalSelectionsPerId.hasOwnProperty('DataIdSlot')) {
	    globalSelections = globalSelectionsPerId['DataIdSlot'];
	}

    	// first collect data on each group, how many patients are in the group at 
    	// each day when the number of patients change

    	var groupStats = {};
    	for(var set = 0; set < Ns.length; set++) {
    	    var selArray = [];
    	    if(set < globalSelections.length) {
    		selArray = globalSelections[set];
    	    }
	    
    	    var deathArray = deathArrays[set];
    	    var followUpArray = null;
    	    if(haveFollowUp) {
    		followUpArray = followUpArrays[set];
    	    }
	    
    	    for(var i = 0; i < Ns[set]; i++) {
    		if(deathArray[i] === null
    		   && (!haveFollowUp || followUpArray[i] === null)) {
    		    continue;
    		}
		
                var groupId = 0;

    		if(i < selArray.length) {
    		    groupId = selArray[i];
    		}
		
    		if(!groupStats.hasOwnProperty(groupId)) {
    		    groupStats[groupId] = {'list':[], 'headCount':0}; // [xval, lost by death == true, lost by follow up == false]
    		}
    		groupStats[groupId].headCount++;
    		if(deathArray[i] !== null) {
    		    groupStats[groupId].list.push([deathArray[i], true]);
    		} else {
    		    if(haveFollowUp && followUpArray[i] !== null) {
    			groupStats[groupId].list.push([followUpArray[i], false]);
    		    } else {
    			debugLog("Error, this should not happen (groupStats counting got null when null should not be allowed)");
    		    }
    		}
            }
    	}

    	var maxHeadCount = 0;
    	for(var groupId in groupStats) {
    	    var ls = groupStats[groupId].list;
    	    ls.sort(function(a,b){return (a[0] - b[0]);});
    	    var upper = groupStats[groupId].headCount;
    	    var lower = groupStats[groupId].headCount;
	    
    	    maxHeadCount = Math.max(maxHeadCount, groupStats[groupId].headCount);
	    
    	    var upperCurve = [[0, upper]];
    	    var lowerCurve = [[0, lower]];
    	    var lastTime = 0;
    	    for(var i = 0; i < ls.length; i++) {
    		if(ls[i][0] != lastTime) {
    		    if(upperCurve[upperCurve.length - 1][1] != upper) {
    			upperCurve.push([lastTime, upper]);
    		    } 
    		    if(lowerCurve[lowerCurve.length - 1][1] != lower) {
    			lowerCurve.push([lastTime, lower]);
    		    }
    		    lastTime = ls[i][0];
    		}
    		if(ls[i][1]) { // death
    		    upper--;
    		    lower--;
    		} else { // not death
    		    lower--;
    		}
    	    }
    	    if(upperCurve[upperCurve.length - 1][1] != upper) {
    		upperCurve.push([lastTime, upper]);
    	    } 
    	    if(lowerCurve[lowerCurve.length - 1][1] != lower) {
    		lowerCurve.push([lastTime, lower]);
    	    }
	    
    	    groupStats[groupId].upper = upperCurve;
    	    groupStats[groupId].lower = lowerCurve;
    	}

    	if(usePercent) {
    	    limits.maxY = 1;
    	} else {
    	    limits.maxY = maxHeadCount;
    	}

    	for(var groupId in groupStats) {
    	    // draw upper curve
    	    var ls = groupStats[groupId].upper;

    	    var lastX = val2pixelX(ls[0][0]);

	    var yval = ls[0][1];
	    if(usePercent) {
		yval = yval / groupStats[groupId].headCount;
	    }
    	    var lastY = val2pixelY(yval);
	    
    	    var col = getColorForGroup(groupId);
    	    if(groupId == "0") {
    		col = hexColorToRGBA(col, 0.33);
    	    }

	    ctx.save();

	    if(!usePercent) {
		ctx.fillStyle = col;
		var s = "";
    		s = Math.round(ls[0][1]);

    		var textW = getTextWidthCurrentFont(s);

		ctx.fillText(s, leftMarg + 5, lastY - 5);

		// if(textW + 3 < leftMarg) {
		//     ctx.fillText(s, leftMarg - textW - 2, lastY + fontSize / 2);
		// } else {
		//     ctx.fillText(s, 0, lastY + fontSize / 2);
		// }
	    }

    	    ctx.strokeStyle = col;
    	    ctx.lineWidth = 1;
    	    ctx.beginPath();
    	    ctx.moveTo(lastX, lastY);

    	    for(var i = 1; i < ls.length; i++) {
    		var x = val2pixelX(ls[i][0]);

		yval = ls[i][1];
		if(usePercent) {
		    yval = yval / groupStats[groupId].headCount;
		}
    		var y = val2pixelY(yval);

    		// horizontal line
    		ctx.lineTo(x, lastY);

    		// vertical line
    		ctx.lineTo(x, y);

    		lastX = x;
    		lastY = y;
    	    }
    	    ctx.lineTo(val2pixelX(limits.maxX), lastY);

    	    ctx.stroke();

	    ctx.fillStyle = col;
	    var s = "";
	    if(usePercent) {
    		s = Math.round(ls[ls.length - 1][1] / groupStats[groupId].headCount * 100) + "%";
    	    } else {
    		s = Math.round(ls[ls.length - 1][1]);
	    }
    	    var textW = getTextWidthCurrentFont(s);
	    if(textW + 6 < rightMarg) {
		ctx.fillText(s, leftMarg + drawW + 5, lastY + fontSize / 2);
	    } else {
		ctx.fillText(s, leftMarg + drawW + rightMarg - textW - 1, lastY + fontSize / 2);
	    }
	    ctx.restore();

    	    // draw lower curve
    	    if(haveFollowUp) {
    		ls = groupStats[groupId].lower;

    		lastX = val2pixelX(ls[0][0]);

		yval = ls[0][1];
		if(usePercent) {
		    yval = yval / groupStats[groupId].headCount;
		}
    		lastY = val2pixelY(yval);
		
		ctx.save();
    		ctx.setLineDash([3, 5]);
    		if(groupId != "0") {
    		    col = hexColorToRGBA(col, 0.5);
    		}

    		ctx.strokeStyle = col;
    		ctx.lineWidth = 1;
    		ctx.beginPath();
    		ctx.moveTo(lastX, lastY);
		
    		for(var i = 1; i < ls.length; i++) {
    		    var x = val2pixelX(ls[i][0]);
		    yval = ls[i][1];
		    if(usePercent) {
			yval = yval / groupStats[groupId].headCount;
		    }
    		    var y = val2pixelY(yval);
		    
    		    // horizontal line
    		    ctx.lineTo(x, lastY);
		    
    		    // vertical line
    		    ctx.lineTo(x, y);
		    
    		    lastX = x;
    		    lastY = y;
    		}
    		ctx.lineTo(val2pixelX(limits.maxX), lastY);
    		ctx.stroke();
		ctx.restore();
            }
    	}
    };

    function getGradientColorForGroup(group, x1,y1, x2,y2, alpha) {
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

    	var colors = $scope.gimme("GroupColors");
    	if(typeof colors === 'string') {
    	    colors = JSON.parse(colors);
    	}
	
    	group = group.toString();

    	if(!colorPalette.hasOwnProperty(group)) {
    	    if(colors.hasOwnProperty('groups')) {
    		var groupCols = colors.groups;
		
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
	
    	if(colors.hasOwnProperty("groups")) {
    	    var groupCols = colors.groups;
	    
    	    if(groupCols.hasOwnProperty(group) && ctx !== null && groupCols[group].hasOwnProperty('gradient')) {
    		var OK = true;
		
    		var grd = ctx.createLinearGradient(x1,y1,x2,y2);
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
    	    var colors = $scope.gimme("GroupColors");
    	    if(typeof colors === 'string') {
    		colors = JSON.parse(colors);
    	    }
	    
    	    if(colors.hasOwnProperty("groups")) {
    		var groupCols = colors.groups;
		
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
    };

    function updateSize() {
    	// debugLog("updateSize");

    	fontSize = parseInt($scope.gimme("FontSize"));
    	if(fontSize < 5) {
    	    fontSize = 5;
    	}

    	var rw = $scope.gimme("DrawingArea:width");
    	if(typeof rw === 'string') {
    	    rw = parseFloat(rw);
    	}
    	if(rw < 1) {
    	    rw = 1;
    	}

    	var rh = $scope.gimme("DrawingArea:height");
    	if(typeof rh === 'string') {
    	    rh = parseFloat(rh);
    	}
    	if(rh < 1) {
    	    rh = 1;
    	}

    	if(myCanvas === null) {
    	    var myCanvasElement = $scope.theView.parent().find('#theCanvas');
    	    if(myCanvasElement.length > 0) {
    		myCanvas = myCanvasElement[0];
    	    } else {
    		debugLog("no canvas to resize!");
    		return;
    	    }
    	}
    	myCanvas.width = rw;
    	myCanvas.height = rh;

    	if(dropCanvas === null) {
    	    var myCanvasElement = $scope.theView.parent().find('#theDropCanvas');
    	    if(myCanvasElement.length > 0) {
    		dropCanvas = myCanvasElement[0];
    	    } else {
    		debugLog("no drop canvas to resize!");
    	    }
    	}
	if(dropCanvas) {
    	    dropCanvas.width = rw;
    	    dropCanvas.height = rh;
	}

    	if(selectionCanvas === null) {
    	    var selectionCanvasElement = $scope.theView.parent().find('#theSelectionCanvas');
    	    if(selectionCanvasElement.length > 0) {
    		selectionCanvas = selectionCanvasElement[0];
    	    } else {
    		debugLog("no selectionCanvas to resize!");
    		return;
    	    }
    	}
    	selectionCanvas.width = rw;
    	selectionCanvas.height = rh;
    	selectionCanvas.style.left = 0;
    	selectionCanvas.style.top = 0;

    	if(selectionHolderElement === null) {
    	    selectionHolderElement = $scope.theView.parent().find('#selectionHolder');
    	}
    	selectionHolderElement.width = rw;
    	selectionHolderElement.height = rh;
    	selectionHolderElement.top = 0;
    	selectionHolderElement.left = 0;

    	var selectionRectElement = $scope.theView.parent().find('#selectionRectangle');
    	selectionRectElement.width = rw;
    	selectionRectElement.height = rh;
    	selectionRectElement.top = 0;
    	selectionRectElement.left = 0;
    	if(selectionRectElement.length > 0) {
    	    selectionRect = selectionRectElement[0];
    	    selectionRect.width = rw;
    	    selectionRect.height = rh;
    	    selectionRect.top = 0;
    	    selectionRect.left = 0;
    	}
	
    	var W = selectionCanvas.width;
    	var H = selectionCanvas.height;
    	drawW = W - leftMarg - rightMarg;
    	drawH = H - topMarg - bottomMarg * 2 - fontSize;

    	for(var sel = 0; sel < selections.length; sel++) {
    	    var s = selections[sel];
    	    s[2] = val2pixelX(s[0]);
    	    s[3] = val2pixelX(s[1]);
    	}
    	drawSelections();

	updateDropZones(textColor, 0.3, false);
    };

    function mySlotChange(eventData) {
    	// debugLog("mySlotChange() " + eventData.slotName + " = " + JSON.stringify(eventData.slotValue));
    	// debugLog("mySlotChange() " + eventData.slotName);

    	switch(eventData.slotName) {
	case "SelectAll":
	    if(eventData.slotValue) {
		selectAll();
		$scope.set("SelectAll",false);
	    }
	    break;

    	case "InternalSelections":
    	    if(eventData.slotValue != internalSelectionsInternallySetTo) {
    		setSelectionsFromSlotValue();
    	    }
    	    break;

    	case "TreatNullAsUnselected":
    	    updateLocalSelections(false);
    	    break;
	    
    	case "UsePercent":
    	    if(eventData.slotValue) {
    		usePercent = true;
    	    } else {
    		usePercent = false;
    	    }
    	    updateGraphics();
    	    break;
	    
    	case "FontSize":
    	    updateSize();
    	    updateGraphics();
    	    break;
	    
    	case "DrawingArea:height":
    	    updateSize();
    	    updateGraphics();
    	    break;
    	case "DrawingArea:width":
    	    updateSize();
    	    updateGraphics();
    	    break;
    	case "root:height":
    	    updateSize();
    	    parseSelectionColors();
    	    updateGraphics();
    	    break;
    	case "root:width":
    	    updateSize();
    	    parseSelectionColors();
    	    updateGraphics();
    	    break;
    	case "UseGlobalColorGradients":
    	    if(eventData.slotValue) {
    		useGlobalGradients = true;
    	    } else {
    		useGlobalGradients = false;
    	    }
    	    updateGraphics();
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
    	    updateGraphics();
    	    break;
    	case "Highlights":
    	    updateGraphics();
    	    break;
    	case "GroupColors":
    	    colorPalette = null;
    	    parseSelectionColors();
    	    updateGraphics();
    	    drawSelections();
    	    break;
    	case "DataValuesSetFilled":
    	    parseData();
    	    break;
    	};
    };



    // ==============================
    // ------- Mouse Stuff ----------
    // ==============================

    function newSelection(x1,x2, y1,y2, keepOld) {
    	// debugLog("newSelection");

    	if(unique > 0) {
    	    x1 = Math.max(x1, leftMarg);
    	    x2 = Math.min(x2, leftMarg + drawW);

    	    var newSel = [pixel2valX(x1), pixel2valX(x2), x1,x2];
	    
    	    var overlap = false;
    	    for(var s = 0; s < selections.length; s++) {
    		var sel = selections[s];
    		if(sel[2] == newSel[2]
    		   && sel[3] == newSel[3]) {
    		    // debugLog("Ignoring selection because it overlaps 100% with already existing selection");
    		    overlap = true;
    		    break;
    		}
    	    }

    	    if(!overlap) {
    		if(!keepOld) {
    		    selections = [];
    		}
    		selections.push(newSel);
    		drawSelections();
    		updateLocalSelections(false);
    		saveSelectionsInSlot();
    	    }
    	}
    };

    function selectAll() {
    	if(unique <= 0) {
    	    selections = [];
    	} else {
    	    selections = [[limits.minX, limits.maxX, leftMarg, leftMarg + drawW]];
    	}
    	drawSelections();
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

    function parseSelectionColors() {
    	// debugLog("parseSelectionColors");

    	var colors = $scope.gimme("GroupColors");
    	if(typeof colors === 'string') {
    	    colors = JSON.parse(colors);
    	}

    	selectionColors = {};

	if(colors.hasOwnProperty("skin") && colors.skin.hasOwnProperty("text")) {
	    textColor = colors.skin.text;
	} else {
	    textColor = "#000000";
	}

    	if(colors.hasOwnProperty('selection')) {
    	    if(colors['selection'].hasOwnProperty('border')) {
    		selectionColors.border = colors['selection']['border'];
    	    } else {
    		selectionColors.border = '#FFA500'; // orange
    	    }
	    
    	    if(colors['selection'].hasOwnProperty('color')) {
    		selectionColors.color = hexColorToRGBA(colors['selection']['color'], selectionTransparency);
    	    } else {
    		selectionColors.color = hexColorToRGBA('#FFA500', selectionTransparency); // orange
    	    }

    	    if(colors['selection'].hasOwnProperty('gradient')) {
    		if(selectionCanvas === null || selectionCtx === null) {
    		    var selectionCanvasElement = $scope.theView.parent().find('#theSelectionCanvas');
    		    if(selectionCanvasElement.length > 0) {
    			selectionCanvas = selectionCanvasElement[0];
    			selectionCtx = selectionCanvas.getContext("2d");
    		    } else {
    			debugLog("no selectionCanvas to resize!");
    			return;
    		    }
    		}

    		selectionColors.grad = selectionCtx.createLinearGradient(0, 0, selectionCanvas.width, selectionCanvas.height);
    		var atLeastOneAdded = false;
    		for(var p = 0; p < colors['selection']['gradient'].length; p++) {
    		    if(colors['selection']['gradient'][p].hasOwnProperty('pos') 
    		       && colors['selection']['gradient'][p].hasOwnProperty('color')) {
    			selectionColors.grad.addColorStop(colors['selection']['gradient'][p]['pos'], hexColorToRGBA(colors['selection']['gradient'][p]['color'], selectionTransparency));
    			atLeastOneAdded = true;
    		    }
    		}
    		if(!atLeastOneAdded) {
    		    selectionColors.grad = selectionColors.color;
    		}
    	    } else {
    		selectionColors.grad = selectionColors.color;
    	    }
    	}
    };

    function drawSelections() {
    	if(selectionCanvas === null) {
    	    var selectionCanvasElement = $scope.theView.parent().find('#theSelectionCanvas');
    	    if(selectionCanvasElement.length > 0) {
    		selectionCanvas = selectionCanvasElement[0];
    	    } else {
    		debugLog("no canvas to draw selections on!");
    		return;
    	    }
    	}

    	if(selectionCtx === null) {
    	    selectionCtx = selectionCanvas.getContext("2d");
    	}
	
    	var W = selectionCanvas.width;
    	var H = selectionCanvas.height;

    	selectionCtx.clearRect(0,0, W,H);

    	if(selectionColors === null) {
    	    parseSelectionColors(W, H);
    	}

    	for(sel = 0; sel < selections.length; sel++) {
    	    selectionCtx.fillStyle = selectionColors.grad;	    
    	    selectionCtx.fillRect(selections[sel][2], topMarg-2, selections[sel][3] - selections[sel][2], drawH+4);

    	    selectionCtx.fillStyle = selectionColors.border;
    	    selectionCtx.fillRect(selections[sel][2],   topMarg-2, 1, drawH+4);
    	    selectionCtx.fillRect(selections[sel][2],   topMarg-2, selections[sel][3] - selections[sel][2], 1);
    	    selectionCtx.fillRect(selections[sel][2],   topMarg+2 + drawH, selections[sel][3] - selections[sel][2], 1);
    	    selectionCtx.fillRect(selections[sel][3]-1, topMarg-2, 1, drawH+4);
    	}
	
    	hideSelectionRect();
    };

    function hideSelectionRect() {
    	if(selectionRect === null) {
    	    var selectionRectElement = $scope.theView.parent().find('#selectionRectangle');
    	    if(selectionRectElement.length > 0) {
    		selectionRect = selectionRectElement[0];
    	    } else {
    		debugLog("No selection rectangle!");
    	    }
    	}
    	if(selectionRect !== null) {
    	    selectionRect.getContext("2d").clearRect(0,0, selectionRect.width, selectionRect.height);
    	}
    };

    function mousePosIsInSelectableArea(pos) {
    	if(pos.x > leftMarg - 5
    	   && pos.x <= leftMarg + drawW + 5
    	   && pos.y > topMarg - 5
    	   && pos.y <= topMarg + drawH + 5) {
    	    return true;
    	}
    	return false;
    };

    var onMouseMove = function(e){
    	if(unique > 0) {
            var currentMouse = {x: (e.offsetX || e.clientX - $(e.target).offset().left), y: (e.offsetY || e.clientY - $(e.target).offset().top)};

    	    // hover text

    	    if(hoverText === null) {
    		var elmnt = $scope.theView.parent().find('#mouseOverText');
    		if(elmnt.length > 0) {
    		    hoverText = elmnt[0];
    		} else {
    		    debugLog("No hover text!");
    		}
    	    }

    	    if(hoverText !== null) {
    		if(mousePosIsInSelectableArea(currentMouse)) {
    		    var x = pixel2valX(currentMouse.x);
    		    var y = pixel2valY(currentMouse.y);
		    
    		    var s = "[";
		    
    		    if(dataType == 'date') {
    			s += date2text(Math.floor(x));
    		    } else {
    			s += number2text(x, limits.maxX);
    		    }

    		    s += ", ";

    		    if(usePercent) {
    			s += Math.round(y * 100) + "%";
    		    } else {
    			s += Math.round(y);
    		    }
		    
    		    s += "]";

    		    var textW = getTextWidthCurrentFont(s);
    		    hoverText.style.font = fontSize + "px Arial";
    		    hoverText.style.left = Math.floor(currentMouse.x + 5) + "px";
    		    hoverText.style.top = Math.floor(currentMouse.y - fontSize - 5) + "px";
    		    hoverText.innerHTML = s;
    		    hoverText.style.display = "block";
    		} else {
    		    hoverText.style.display = "none";
    		}
    	    }

    	    // selection rectangle, if clicked
	    
    	    if(clickStart !== null) {
    		if(selectionRect === null) {
    		    var selectionRectElement = $scope.theView.parent().find('#selectionRectangle');
    		    if(selectionRectElement.length > 0) {
    			selectionRect = selectionRectElement[0];
    		    } else {
    			debugLog("No selection rectangle!");
    		    }
    		}
    		if(selectionRect !== null) {
    		    var x1 = currentMouse.x;
    		    var w = 1;
    		    if(clickStart.x < x1) {
    			x1 = clickStart.x;
    			w = currentMouse.x - x1;
    		    } else {
    			w = clickStart.x - x1;
    		    }

    		    var y1 = currentMouse.y;
    		    var h = 1;
    		    if(clickStart.y < y1) {
    			y1 = clickStart.y;
    			h = currentMouse.y - y1;
    		    } else {
    			h = clickStart.y - y1;
    		    }
		    
    		    var selectionRectCtx = selectionRect.getContext("2d");
    		    selectionRectCtx.clearRect(0,0,selectionRect.width, selectionRect.height);
		    
    		    if(selectionColors === null) {
    			parseSelectionColors();
    		    }

    		    selectionRectCtx.fillStyle = selectionColors.color;
    		    selectionRectCtx.fillRect(x1, y1, w, h);
		    selectionRectCtx.save();
    		    selectionRectCtx.strokeStyle = selectionColors.border;
    		    selectionRectCtx.strokeRect(x1, y1, w, h);
		    selectionRectCtx.restore();
    		}
    	    }
    	}
    };

    var onMouseDown = function(e){
    	if(unique > 0) {
            if(e.which === 1){
    		currentMouse = {x: (e.offsetX || e.clientX - $(e.target).offset().left), y: (e.offsetY || e.clientY - $(e.target).offset().top)};
		
    		if(mousePosIsInSelectableArea(currentMouse)) {
    		    clickStart = currentMouse;
    		    if(e.ctrlKey || e.metaKey) {
    			clickStart.ctrl = true;
    		    } else {
    			clickStart.ctrl = false;
    		    }

    		    selectionHolderElement.bind('mouseup', onMouseUp);
    		    e.stopPropagation();
    		} else {
    		    clickStart = null;


		    // also do the drag&drop related stuff
		    var x = currentMouse.x;
		    var y = currentMouse.y;
		    
		    var found = false;
		    for(var dr = 0; dr < allDragNames.length; dr++){
			var drag = allDragNames[dr];
			if(drag.left >= 0
			   && x >= drag.left
			   && x <= drag.right
			   && y >= drag.top
			   && y <= drag.bottom) {
			    $scope.dragNdropRepr = drag.name;
			    $scope.dragNdropID = drag.ID;

			    $scope.theView.find('.dragSrc').draggable( 'enable' );
			    $scope.theView.find('.dragSrc').attr("id", drag.ID);
			    
			    found = true;
			} 
		    }
		    if(!found) {
			$scope.dragNdropRepr = "Nothing to drag.";
			$scope.dragNdropID = "No drag data.";
			$scope.theView.find('.dragSrc').attr("id", "no drag data");
			$scope.theView.find('.dragSrc').draggable( 'disable' );
		    } 
    		}
            }
    	}
    };

    var onMouseUp = function(e){
    	if(unique > 0) {
            selectionHolderElement.unbind('mouseup');
            
    	    // check new selection rectangle

    	    if(clickStart !== null) {
    		hideSelectionRect();
		
    		currentMouse = {x: (e.offsetX || e.clientX - $(e.target).offset().left), y: (e.offsetY || e.clientY - $(e.target).offset().top)};

    		var x1 = currentMouse.x;
    		var x2 = clickStart.x;
    		if(x2 < x1) {
    		    x1 = clickStart.x;
    		    x2 = currentMouse.x;
    		} 
		
    		var y1 = currentMouse.y;
    		var y2 = clickStart.y;
    		if(y2 < y1) {
    		    y1 = clickStart.y;
    		    y2 = currentMouse.y;
    		} 
		
    		if(x1 == x2 && y1 == y2) {
    		    // selection is too small, disregard
    		    // debugLog("ignoring a selection because it is too small");
    		} else {
    		    newSelection(x1,x2, y1,y2, clickStart.ctrl);
    		}
    	    }
    	}	
    	clickStart = null;
    };

    var onMouseOut = function(e) {
    	if(unique > 0) {
    	    if(hoverText === null) {
    		var elmnt = $scope.theView.parent().find('#mouseOverText');
    		if(elmnt.length > 0) {
    		    hoverText = elmnt[0];
    		} else {
    		    debugLog("No hover text!");
    		}
    	    }
    	    if(hoverText !== null) {
    		hoverText.style.display = "none";
    	    }


    	    if(clickStart !== null) {
    		hideSelectionRect();

    		currentMouse = {x: (e.offsetX || e.clientX - $(e.target).offset().left), y: (e.offsetY || e.clientY - $(e.target).offset().top)};

    		var x1 = currentMouse.x;
    		var x2 = clickStart.x;
    		if(x2 < x1) {
    		    x1 = clickStart.x;
    		    x2 = currentMouse.x;
    		} 
		
    		var y1 = currentMouse.y;
    		var y2 = clickStart.y;
    		if(y2 < y1) {
    		    y1 = clickStart.y;
    		    y2 = currentMouse.y;
    		} 
		
    		if(x1 == x2 && y1 == y2) {
    		    // selection is too small, disregard
    		    // debugLog("ignoring a selection because it is too small");
    		} else {
    		    newSelection(x1,x2, y1,y2, clickStart.ctrl);
    		}
    	    }
    	}	
    	clickStart = null;
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

        $scope.addSlot(new Slot('TreatNullAsUnselected',
    				false,
    				"Treat Null as Unselected",
    				'Group data items with no value together with items that are not selected (otherwise they get their own group).',
    				$scope.theWblMetadata['templateid'],
    				undefined,
    				undefined
    			       ));

        $scope.addSlot(new Slot('UsePercent',
    				true,
    				"Use Percent",
    				'Show remaining patients in percent (if false, show actual number of patients).',
    				$scope.theWblMetadata['templateid'],
    				undefined,
    				undefined
    			       ));

        $scope.addSlot(new Slot('UseGlobalColorGradients',
    				false,
    				"Use Global Color Gradients",
    				'Should each bar be shaded individually (all get same colors) or should the color gradient span across all the bars.',
    				$scope.theWblMetadata['templateid'],
    				undefined,
    				undefined
    			       ));


        // Dashboard Plugin slots -----------------------------------------------------------

        $scope.addSlot(new Slot('PluginName',
    				"Life Table",
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
    				    [{'idSlot':'DataIdSlot', 'name':'Date of Diagnosis', 'type':'date', 'slot':'Diagnosis'},
    				     {'idSlot':'DataIdSlot', 'name':'Date of Death', 'type':'date', 'slot':'Death'},
    				     {'idSlot':'DataIdSlot', 'name':'Date of Last Follow-Up', 'type':'date', 'slot':'FollowUp'}],
				    
    				    [{'idSlot':'DataIdSlot', 'name':'Time to Death', 'type':'number', 'slot':'Death'},
    				     {'idSlot':'DataIdSlot', 'name':'Time to Last Follow-Up', 'type':'number', 'slot':'FollowUp'}],
				    
    				    [{'idSlot':'DataIdSlot', 'name':'Date of Diagnosis', 'type':'date', 'slot':'Diagnosis'},
    				     {'idSlot':'DataIdSlot', 'name':'Date of Death', 'type':'date', 'slot':'Death'}],
				 
				    [{'idSlot':'DataIdSlot', 'name':'Time to Death', 'type':'number', 'slot':'Death'}]
    				],
    				"Expected Format",
    				'The input this plugin accepts.',
    				$scope.theWblMetadata['templateid'],
    				undefined,
    				undefined
    			       ));


        // $scope.addSlot(new Slot('FormatChanged',
    	// 			false,
    	// 			"Format Changed",
    	// 			'Hack to work around problems in Webble World.',
    	// 			$scope.theWblMetadata['templateid'],
    	// 			undefined,
    	// 			undefined
    	// 		       ));

    	// slots for data input

        $scope.addSlot(new Slot('Death',
    				[[1,,3,4,3,]],
    				"Death",
    				'The slot for data input of when patients died/relapsed/etc.',
    				$scope.theWblMetadata['templateid'],
    				undefined,
    				undefined
    			       ));
    	$scope.getSlot('Death').setDisabledSetting(Enum.SlotDisablingState.AllVisibility);

        $scope.addSlot(new Slot('Diagnosis',
    				[[0,0,1,2,0,0]],
    				"Diagnosis",
    				'The slot for input data on when the patient entered the trial.',
    				$scope.theWblMetadata['templateid'],
    				undefined,
    				undefined
    			       ));
    	$scope.getSlot('Diagnosis').setDisabledSetting(Enum.SlotDisablingState.AllVisibility);

        $scope.addSlot(new Slot('FollowUp',
    				[[1,1,3,4,3,1]],
    				"Follow-Up",
    				'The slot for input data on when the last data on the patient was collected (because of death or because of succesful treatment).',
    				$scope.theWblMetadata['templateid'],
    				undefined,
    				undefined
    			       ));
    	$scope.getSlot('FollowUp').setDisabledSetting(Enum.SlotDisablingState.AllVisibility);


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

        $scope.setDefaultSlot('');

    	myInstanceId = $scope.getInstanceId();

    	$scope.registerWWEventListener(Enum.availableWWEvents.slotChanged, function(eventData){
    	    mySlotChange(eventData);
    	});

    	updateGraphics();

    	selectionHolderElement = $scope.theView.parent().find('#selectionHolder');
    	if(selectionHolderElement !== null){
    	    selectionHolderElement.bind('mousedown', onMouseDown);
    	    selectionHolderElement.bind('mousemove', onMouseMove);
    	    selectionHolderElement.bind('mouseout', onMouseOut);
    	} else {
    	    debugLog("No selectionHolderElement, could not bind mouse listeners");
    	}

	$scope.fixDroppable();
	$scope.fixDraggable();
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


    // TODO: POSSIBLE ADDITIONAL CUSTOM METHODS
    //========================================================================================
    // Custom template specific methods is very likely to be quite a few of in every Webble,
    // and they contain what ever the developer want them to contain.
    //========================================================================================
    // "Public" (accessible outside this controller)
    //    $scope.[CUSTOM NEW METHOD NAME] = function([PARAMETERS]){
    //        [CUSTOM CODE HERE]
    //    }

    // "Private" (accessible only inside this controller)
    //    var [CUSTOM NEW METHOD NAME] = function([PARAMETERS]){
    //        [CUSTOM CODE HERE]
    //    }
    //========================================================================================


    // TODO: POSSIBLE OVERRIDING WEBBLE CORE METHODS WITH CUSTOM PARTS
    //========================================================================================
    // In 99% of all Webble development there is probably no need to insert custom code inside
    // a Webble core function or in any way override Webble core behavior, but the possibility
    // exists as shown below if special circumstance and needs arise.
    //========================================================================================
    //    $scope.[NEW METHOD NAME] = $scope.$parent.[PARENT METHOD]   //Assign the Webble core method to a template method caller
    //
    //    $scope.$parent.[PARENT METHOD] = function([PARAMETERS]){    //Assign a new custom method to th Webble Core
    //        [CUSTOM CODE HERE]
    //
    //        $scope.[NEW METHOD NAME]();                             //Call the original function, in order to not break expected behavior
    //
    //        [MORE CUSTOM CODE HERE]
    //    }
    //========================================================================================



    //=== CTRL MAIN CODE ======================================================================

});
//=======================================================================================

// More Controllers may of course be added here if needed
//======================================================================================================================
