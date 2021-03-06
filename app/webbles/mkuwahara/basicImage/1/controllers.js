//======================================================================================================================
// Controllers for Image Webble for Webble World v3.0 (2013)
// Created By: truemrwalker
//======================================================================================================================

//=======================================================================================
// IMAGE WEBBLE CONTROLLER
// This is the Main controller for the Image Webble Template
//=======================================================================================
wblwrld3App.controller('imageWebbleCtrl', function($scope, $log, Slot, Enum) {

    //=== PROPERTIES ====================================================================

    $scope.stylesToSlots = {
        imageContainer: ['border'],
        theImage: ['width', 'height', 'opacity']
    };

    //=== EVENT HANDLERS ================================================================


    //=== METHODS & FUNCTIONS ===========================================================

    //===================================================================================
    // Webble template Initialization
    //===================================================================================
    $scope.coreCall_Init = function(theInitWblDef){

        $scope.addSlot(new Slot('imgSrc',
            '../../images/notFound.png',
            'Image Source',
            'The image to be displayed (as a url or as raw data)',
            $scope.theWblMetadata['templateid'],
            {inputType: Enum.aopInputTypes.ImagePick},
            undefined
        ));

        $scope.setDefaultSlot('imgSrc');

        $scope.set('theImage:height', 'auto');
    };
    //===================================================================================



    //=== CTRL MAIN CODE ======================================================================

});
//======================================================================================================================
