/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

/**
 * Module: First-Run
 *
 * Determines whether or not a user should be shown a first-run dialog
 */
define( [ "dialog/dialog", "ui/widget/tooltip" ], function( Dialog, ToolTip ) {

  var __butterStorage = window.localStorage;

  return {
    init: function() {

      var dialog,
          tooltip,
          currentIndex = 0,
          steps,
          //stepNames,
          //tutorialDialogs = new Object(),
          //tutorialTooltips = new Object(),
          //tutorialHighlights,
          currentElement,

          mediaTooltip,
          overlayDiv,

          editor = document.querySelector( ".butter-editor-area" ),

          elementControls = document.querySelector( ".butter-header" ),
          elementPanel = document.querySelector( ".butter-editor-area" ),
          elementTimeline = document.querySelector( ".butter-tray" ),
          elementViewer = document.querySelector( ".body-wrapper" ),

          editorHeaderButtons = document.querySelector( "butter-editor-header" ),

          eventsEditorButtonMedia = document.querySelector( ".butter-editor-header-media" ),
          eventsEditorButtonEvents = document.querySelector( ".butter-editor-header-popcorn" ),
          eventsEditorButtonChapter = document.querySelector( ".butter-editor-header-chapter" ),

          mediaInput = document.querySelector( ".add-media-input" );

      steps = [
        /*{
          "name":"tutorial-intro",
          "type":"dialog",
          "elem":null,
          "overlay":true
        },
        {
          "name":"tutorial-parts",
          "type":"dialog",
          "elem":null,
          "overlay":true
        },
        {
          "name":"tutorial-controls",
          "type":"dialog",
          "elem":document.querySelector( ".butter-header" ),
          "overlay":true
        },
        {
          "name":"tutorial-panel",
          "type":"dialog",
          "elem":document.querySelector( ".butter-editor-area" ),
          "overlay":true
        },
        {
          "name":"tutorial-timeline",
          "type":"dialog",
          "elem":document.querySelector( ".butter-tray" ),
          "overlay":true
        },
        {
          "name":"tutorial-viewer",
          "type":"dialog",
          "elem":document.querySelector( ".body-wrapper" ),
          "overlay":true
        },
        {
          "name":"tutorial-first-edit",
          "type":"dialog",
          "elem":null,
          "overlay":true
        },*/
        {
          "name":"tutorial-add-media-panel",
          "type":"tooltip",
          "elem":document.querySelector( ".butter-editor-body" ),
          "overlay":false,
          "param":{
            "message":"Cliquez ici pour afficher une liste exemple de ressources vidéo.",
            "top":"170px",
            "left":"170px",
            "width":"120px",
            "height":"100px",
            "hidden":true,
            "hover":false
          }
        },
        {
          "name":"tutorial-add-media-url-samples",
          "type":"dialog",
          "elem":document.querySelector( ".add-media-input" ),
          "overlay":false,
          "closeElem":document.querySelector( ".butter-editor-body" )
        },
        {
          "name":"tutorial-add-media-import",
          "type":"dialog",
          "elem":null,
          "overlay":false,
          "openElem":document.querySelector( ".add-media-btn"),
          "closeElem":document.querySelector( ".add-all-btn" )
        },
        {
          "name":"tutorial-add-media-added",
          "type":"dialog",
          "elem":null,
          "overlay":false,
          "closeElem":document.querySelector( ".butter-dialog-body" ),
          "closeUseCapture":true // Set to true in order to avoid close event
        }/*,
        {
          "name":"tutorial-import-resources",
          "type":"tooltip",
          "elem":document.querySelector( ".add-all-btn" ),
          "openElem":document.querySelector( ".add-media-btn"),
          "param":{
            "message":"Cliquez ici pour ajouter séquentiellement les ressources importées dans la timeline.",
            "top":"170px",
            "left":"170px",
            "hidden":true,
            "hover":false
          }
        }*/
      ];

      /*function afterDialogClose() {
        // Remove Listeners
        dialog.unlisten( "close", afterDialogClose );
        window.removeEventListener( "click", onDialogClose, false );

        // Remove Classes
        //eventsEditorButton.classList.remove( "overlay-highlight" );
        mediaInput.classList.remove( "overlay-highlight" );
        document.body.classList.remove( "tutorial" );

        // Remove Overlay
        editor.removeChild( overlayDiv );

        // Show First Run Tooltips
        showTutorialTooltips();
      }

      function setupTutorialOrig() {
        // Setup and append the first-run overlay
        overlayDiv = document.createElement( "div" );
        overlayDiv.classList.add( "butter-modal-overlay" );
        overlayDiv.classList.add( "butter-modal-overlay-dark-bg" );
        overlayDiv.classList.add( "fade-in" );
        document.body.appendChild( overlayDiv );

        // Add Listener
        window.addEventListener( "click", onDialogClose, false );

        // Add Classes
        //mediaInput.classList.add( "overlay-highlight" );
        document.body.classList.add( "tutorial" );
      }*/


      function onDialogClose(e) {
        dialog.close();
      }

      function onTooltipClose(e) {
        tooltip.hidden = true;
        tooltip.hover = false;
        afterTooltipClose();
      }


      function onStepClose( closeFunc ) {
        var step = steps[currentIndex-1],
          closeElem = step.closeElem || window,
          closeEvent = step.closeEvent || "click",
          closeUseCapture = step.closeUseCapture || false;

        closeElem.removeEventListener( closeEvent, closeFunc, closeUseCapture );
      }

      function afterTooltipClose() {
        var step = steps[currentIndex-1],
          closeFunc = step.closeFunc || onTooltipClose;
        // Remove close event listeners
        onStepClose(closeFunc);

        scheduleNextStep();
      }

      function afterDialogClose() {
        var step = steps[currentIndex-1],
          closeFunc = step.closeFunc || onDialogClose;
        // Remove close event listeners
        onStepClose(closeFunc);
        dialog.unlisten( "close", afterDialogClose );

        // Remove overlay if needed
        removeOverlay( currentElement );

        scheduleNextStep();
      }

      function scheduleNextStep() {
        if( currentIndex == steps.length) {
          return;
        }

        var step = steps[currentIndex],
          openElem = step.openElem,
          openEvent = step.openEvent || "click";

        if( openElem ) {
          openElem.addEventListener( openEvent, nextStep, false );
        }
        else {
          nextStep();
        }
      }


      function addOverlay( element ) {
        // Setup and append the first-run overlay
        overlayDiv = document.createElement( "div" );
        overlayDiv.classList.add( "butter-modal-overlay" );
        overlayDiv.classList.add( "butter-modal-overlay-dark-bg" );
        overlayDiv.classList.add( "fade-in" );
        document.body.appendChild( overlayDiv );

        // Add Classes
        if( element ) {
          element.classList.add( "overlay-highlight" );
        }
      }

      function removeOverlay( element ) {
        // Remove Classes
        if( element ) {
          element.classList.remove( "overlay-highlight" );
        }

        // Remove Overlay
        if( steps[ currentIndex-1 ].overlay ) {
          document.body.removeChild( overlayDiv );
        }
      }



      function setupTutorial() {
        for (var i = 0; i < steps.length; i++) {
          var step = steps[i],
            name,
            type,
            elem,
            options = new Object();
          name = step.name;
          type = step.type;
          elem = step.elem;

          if(type=="dialog") {
            step.dialog = Dialog.spawn( name );
          }
          else if(type=="tooltip") {
            if(step.param.top) options.top = step.param.top;
            if(step.param.left) options.left = step.param.left;
            if(step.param.width) options.width = step.param.width;
            if(step.param.height) options.height = step.param.height;
            if(step.param.hidden) options.hover = step.param.hidden;
            if(step.param.hover) options.hover = step.param.hover;

            options.name = name;
            options.element = elem;
            options.message = step.param.message;

            step.tooltip = ToolTip.create( options );
          }
        }
        document.body.classList.add( "tutorial" );
      }

      function nextStep() {
        // If step list is done, exit
        if( currentIndex == steps.length) {
          return;
        }

        var step = steps[ currentIndex ],
          openElem = step.openElem,
          openEvent = step.openEvent || "click",
          closeElem = step.closeElem || window,
          closeEvent = step.closeEvent || "click",
          closeFunc = step.closeFunc,
          closeUseCapture = step.closeUseCapture || false;

        // Remove opening event listerner
        if( currentIndex > 0 ) {
          if( openElem ) {
            openElem.removeEventListener( openEvent, nextStep, false );
          }
        }

        var step = steps[ currentIndex ],
          closeElem = step.closeElem || window,
          closeEvent = step.closeEvent || "click",
          closeFunc = step.closeFunc;

        currentElement = step.elem;

        if( step.overlay ) {
          addOverlay( step.elem );          
        }

        if( step.type=="dialog" ) {
          dialog = step.dialog;
          dialog.open( false );
          dialog.listen( "close", afterDialogClose );
          if( !closeFunc ) closeFunc = onDialogClose;
        }
        else if( step.type=="tooltip" ) {
          tooltip = step.tooltip;
          ToolTip.get(step.name).hidden = false;
          if( !closeFunc ) closeFunc = onTooltipClose;
        }
        closeElem.addEventListener( closeEvent, closeFunc, closeUseCapture );

        currentIndex++;

      }

      function resetTutorials() {
        currentIndex = 0;
      }

      function stopTutorial() {
        document.body.classList.remove( "tutorial" );
      }

      try {
        var data = __butterStorage.getItem( "butter-first-run" );

        if ( !data || window.location.search.match( "tutorial" ) ) {
          __butterStorage.setItem( "butter-first-run", true );

          $(".next-step-btn").click(function(){
            nextStep();
          })
          setupTutorial();
          nextStep();
        }
      } catch( e ) {}
    }
  };
});
