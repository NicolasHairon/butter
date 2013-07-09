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
        {
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
        },
        /*{
          "name":"tutorial-add-media",
          "type":"tooltip",
          "elem":document.querySelector( ".butter-editor-header-media" ),
          "overlay":false,
          "param":{
            "message":"Copiez-collez ici une ou plusieurs URLs relative à des resources audio ou vidéo, séparées par des espaces ou des retours à la ligne."
          }
        },*/
        {
          "name":"tutorial-add-media-panel",
          "type":"tooltip",
          "elem":document.querySelector( ".butter-editor-body" ),
          "overlay":false,
          "param":{
            "message":"Collez ici une URL (ou plusieurs) de ressource(s) audio ou vidéo.",
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
          "elem":null,
          "overlay":false
        }
      ];

      /*function onDialogClose() {
        // Remove Listeners
        dialog.unlisten( "close", onDialogClose );
        window.removeEventListener( "click", closeDialog, false );

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
        window.addEventListener( "click", closeDialog, false );

        // Add Classes
        //mediaInput.classList.add( "overlay-highlight" );
        document.body.classList.add( "tutorial" );
      }*/

      function closeDialog() {
        dialog.close();
      }

      function closeTooltip() {
        window.removeEventListener( "click", closeTooltip, false );
        tooltip.hidden = true;
        tooltip.hover = false;
        tooltip = undefined;

        // Go to next tutorial step
        nextStep();
      }

      function onDialogClose() {
        // Remove Listeners
        dialog.unlisten( "close", onDialogClose );
        window.removeEventListener( "click", closeDialog, false );
      }






      function onTutorialDialogClose() {
        // Remove Listeners
        dialog.unlisten( "close", onTutorialDialogClose );
        window.removeEventListener( "click", closeDialog, false );

        // Remove Classes
        removeOverlay( currentElement );

        // Go to next tutorial step
        nextStep();
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
        if( currentIndex == steps.length) {
          return;
        }

        var step = steps[ currentIndex ],
          stepperElem = step.stepperElem || window,
          stepperEvent = step.stepperEvent || "click",
          stepperFunc = step.stepperFunc;

        currentElement = step.elem;

        if( step.overlay ) {
          addOverlay( step.elem );          
        }

        if( step.type=="dialog" ) {
          dialog = step.dialog;
          dialog.open( false );
          dialog.listen( "close", onTutorialDialogClose );
          if( !stepperFunc ) stepperFunc = closeDialog;
        }
        else if( step.type=="tooltip" ) {
          tooltip = step.tooltip;
          ToolTip.get(step.name).hidden = false;
          if( !stepperFunc ) stepperFunc = closeTooltip;
        }
        stepperElem.addEventListener( stepperEvent, stepperFunc, false );

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
          setupTutorial();
          nextStep();
          //showTutorialTooltips();
          /*dialog = Dialog.spawn( "tutorial" );
          dialog.open( false );
          dialog.listen( "close", onDialogClose );*/
        }
      } catch( e ) {}
    }
  };
});
