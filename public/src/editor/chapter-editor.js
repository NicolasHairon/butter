/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define([ "editor/editor", "editor/base-editor", "util/lang", "util/keys", "util/time", "util/dragndrop",
  "ui/widget/textbox", "text!layouts/chapter-editor.html" ],
  function( Editor, BaseEditor, LangUtils, KeysUtils, TimeUtils, DragNDrop, TextboxWrapper, EDITOR_LAYOUT ) {

    Editor.register( "chapter-editor", EDITOR_LAYOUT, function( rootElement, butter ) {
      var _editorContainer = rootElement.querySelector( ".editor-container" ),
          _editorTocDiv = rootElement.querySelector( "#toc-div" ),
          _addEntryBtn = _editorContainer.querySelector( ".butter-new-entry-link" ),
          _clearBtn = _editorContainer.querySelector( ".butter-clear-link" ),
          //_duplicateBtn = _editorContainer.querySelector( ".butter-duplicate-toc-link" ),
          _renderBtn = _editorContainer.querySelector( ".butter-render-link" ),
          _editorTocList = _editorContainer.querySelector( "#toc-ol" ),
          _TOCITEM = LangUtils.domFragment( EDITOR_LAYOUT, ".toc-item" ),

          _butter = butter,
          _media = butter.currentMedia,
          _this,

          _tocTrackEvent,
          _tocOptions = {},
          _tocDisplayList = document.createElement( "ul" ),

          /*_target,
          _container,
          _innerContainer,
          _innerSpan,
          _innerDiv,*/

          _count = 1;

          /*_target = rootElement.querySelector( "#video-container" );
          _container = document.createElement( "div" );
          _innerContainer = document.createElement( "div" );
          _innerSpan = document.createElement( "span" );
          _innerDiv = document.createElement( "div" );*/


      /*_container.style.position = "absolute";
      _container.classList.add( "popcorn-text" );

      _innerContainer.classList.add( "text-inner-div" );

      // innerDiv inside innerSpan is to allow zindex from layers to work properly.
      // if you mess with this code, make sure to check for zindex issues.
      _innerSpan.appendChild( _innerDiv );
      _innerContainer.appendChild( _innerSpan );
      _container.appendChild( _innerContainer );
      _target.appendChild( _container );

      _innerContainer.classList.add( "text-inner-div" );
      _innerContainer.style.fontStyle = "normal";
      _innerContainer.style.fontWeight = "normal";*/

    function Time( parentNode ){
      var _timeBox = $(parentNode).find("input").get(0),
          _oldValue = 0;

      function setTime( time, setCurrentTime ){
        if( typeof( time ) === "string" || !isNaN( time ) ){
          try {
            time = TimeUtils.toSeconds( time );
          }
          catch( e ){
            _timeBox.value = _oldValue;
          } //try

          _timeBox.value = TimeUtils.toTimecode( time, 0 );
          updateTrackEvent( $(parentNode).parent().get(0) );
        }
        else {
          _timeBox.value = _oldValue;
        } //if
      } //setTime

      _timeBox.addEventListener( "focus", function(){
        _oldValue = _timeBox.value;
      }, false );

      _timeBox.addEventListener( "blur", function(){
        if( _timeBox.value !== _oldValue ){
          setTime( _timeBox.value, true );
        } //if
      }, false );

      _timeBox.addEventListener( "keydown", function( e ){
        if( e.which === KeysUtils.ENTER ){
          _timeBox.blur();
        }
        else if( e.which === KeysUtils.ESCAPE ){
          _timeBox.value = _oldValue;
          _timeBox.blur();
        } //if
      }, false );
    }


    function addEntry() {
      var newTocItem = _TOCITEM.cloneNode( true ),
        dragBtn = newTocItem.querySelector( ".toc-item-handle" ),
        contentDiv = newTocItem.querySelector( ".toc-item-content" ),
        deleteBtn = newTocItem.querySelector( ".toc-item-delete" );

      deleteBtn.addEventListener( "click", function(e) {
        var $tocItem = $( newTocItem ),
            trackEvent = $tocItem.data("trackEvent");

        if( trackEvent !== undefined ) {
          trackEvent.track.removeTrackEvent(trackEvent);
        }

        $tocItem.removeData("trackEvent");
        $tocItem.remove();
      }, false );

      _editorTocDiv.classList.add("visible");
      _clearBtn.classList.add("visible");
      //_duplicateBtn.classList.add("visible");

      _editorTocList.appendChild( newTocItem );

      $(newTocItem).find( ".dd3-content" ).first().text(_count);
      _count++;

    }

    function clearTocList() {
      var toc = document.getElementById("toc-ol");

      // Recursively remove track events
      removeChapterTrackEvent( _editorTocDiv );

      toc.innerHTML = "";
      _editorTocDiv.classList.remove("visible");
      _clearBtn.classList.remove("visible");
      //_duplicateBtn.classList.remove("visible");

    }

    /*
     * Method getEditorElement
     *
     * @param {Object} trackEvent: The trackEvent object from which we try to find related editor element.
     */
    function getEditorElement( trackEvent ) {
      var element,
          editorTocItems = $(_editorTocDiv).find("li");
      editorTocItems.each(function() {
        var itemTrackEvent = $(this).data("trackEvent");

        if( itemTrackEvent == trackEvent ) {
          element = this;
        }

      });
      return element;
    }

    function updateElement( trackEvent ) {
      var editorElement = getEditorElement( trackEvent );
      if( editorElement ) {
        var $element = $(editorElement),
            popcornOptions = trackEvent.popcornOptions;
        $element.find( ".dd3-content" ).first().text(popcornOptions.text);
        $element.find( ".toc-item-time-start input" ).first().val( TimeUtils.toTimecode(popcornOptions.start) ) ;
        $element.find( ".toc-item-time-end input" ).first().val( TimeUtils.toTimecode(popcornOptions.end) ) ;
      }
    }

    function updateTrackEvent( element ) {
      var popcornOptions = {},
          $element = $(element),
          trackEvent;

      trackEvent = $element.data("trackEvent");

      if( trackEvent !== undefined ) {
        popcornOptions.start = TimeUtils.toSeconds( $element.find(".toc-item-time-start input").val() );
        popcornOptions.end   = TimeUtils.toSeconds( $element.find(".toc-item-time-end input").val() );
        popcornOptions.text  = $element.find(".toc-item-content:first").text();
        popcornOptions.level = ($element.parentsUntil("#toc-ol").length+1)/2;
        //popcornOptions.element = element;

        trackEvent.update( popcornOptions );
      }
    }

    function generateSafeChapterTrackEvent( popcornOptions, track ) {
        var trackEvent,
            start = popcornOptions.start,
            end = popcornOptions.end,
            overlapTrackEvent,
            overlapPopcornOptions,
            overlapMiddleTime;

        if ( start + _butter.defaultTrackeventDuration > _media.duration ) {
          start = _media.duration - _butter.defaultTrackeventDuration;
        }

        if ( start < 0 ) {
          start = 0;
        }

        if ( !end && end !== 0 ) {
          end = start + _butter.defaultTrackeventDuration;
        }

        if ( end > _media.duration ) {
          end = _media.duration;
        }

        if ( !_butter.defaultTarget ) {
          console.warn( "No targets to drop events!" );
          return;
        }

        track = track || _media.addTrack();

        overlapTrackEvent = track.findOverlappingTrackEvent( start, end );

        // If an overlapping track event is detected,
        // split available time with the new track event
        if ( overlapTrackEvent ) {
          overlapPopcornOptions = overlapTrackEvent.popcornOptions;
          overlapMiddleTime = ( overlapPopcornOptions.start + end )/2;

          overlapPopcornOptions.end = overlapMiddleTime;
          start = overlapMiddleTime;

          overlapTrackEvent.update( overlapPopcornOptions );
          overlapTrackEvent.view.update( overlapPopcornOptions );
          updateElement( overlapTrackEvent );
          //track = _media.insertTrackAfter( track );
        }

        popcornOptions.start = start;
        popcornOptions.end = end;
        popcornOptions.target = _butter.defaultTarget.elementID;

        trackEvent = track.addTrackEvent({
          popcornOptions: popcornOptions,
          type: "chapter"
        });

        _butter.deselectAllTrackEvents();
        trackEvent.selected = true;

        return trackEvent;
    }

    function addTrackEvent( element, start, end, text, level, track ) {
      var popcornOptions = {},
          $element = $(element),
          trackEvent,
          startBox,
          endBox;
          
      popcornOptions.start = start;
      popcornOptions.end   = end;
      popcornOptions.text  = text;
      popcornOptions.level = level;
      //popcornOptions.element = element;

      startBox = new Time($element.find(".toc-item-time-start"));
      endBox = new Time($element.find(".toc-item-time-end"));
      


      //trackEvent = _butter.generateSafeTrackEvent( "chapter", popcornOptions, track );
      /*trackEvent = track.addTrackEvent({
        popcornOptions: popcornOptions,
        type: "chapter"
      });*/

      trackEvent = generateSafeChapterTrackEvent( popcornOptions, track );

      // Listen to updates on track event
      trackEvent.listen( "trackeventadded", onTrackEventAdded );
      trackEvent.listen( "trackeventupdated", onTrackEventUpdated );
      //trackEvent.listen( "trackeventdragstarted", onTrackEventDragStarted );

      // Save trackevent associated to editor element
      $( element ).data( "trackEvent", trackEvent );

      // Update start and end time in editor element inputs
      updateElement( trackEvent );

      return trackEvent;
    }

    function onTrackEventDragStarted( e ) {
      var trackEvent = e.target;
    }
    function onTrackEventAdded( e ) {
      var trackEvent = e.target;
    }
    function onTrackEventUpdated( e ) {
      var trackEvent = e.target;
      updateElement( trackEvent );
    }

    function onTrackEventRemoved( e ) {
      var trackEvent = e.data,
          leclone = e.clone,
          editorElement;

      editorElement = getEditorElement( trackEvent );
      //    popcornOptions = trackEvent.popcornOptions;

      // If track event is beeing draged or resized, don't allow deletion
      if( trackEvent.selected ) {
        return;
      }

      if( editorElement ) {
        removeElement( editorElement );
        renderTimeline();
      }
    }

    function addChapterTrackEvent(rootElementList, displayList, level, start, duration, parentTrack) {
      var subListItems = $(rootElementList).find("> ol > li");

      if( subListItems.length>0 ) {
        var chapterStart = start,
          chapterStep = duration/subListItems.length,
          chapterEnd = start+chapterStep,
          levelTrack = $(subListItems).data("track");

        //tocListItem.appendChild(childDisplayList);

        if( levelTrack === undefined ) {
          levelTrack = _media.insertTrackAfter( parentTrack );
          $(subListItems).data("track", levelTrack);
        }

        subListItems.each(function() {
          var text = $(this).find( ".dd3-content" ).first().text(),
              trackEvent = $(this).data("trackEvent"),
              prevTrackEvent,
              childDisplayList = document.createElement( "ul" ),
              tocListItem = document.createElement( "li" ),
              tocListItemLink = document.createElement( "a" );

          // Add track event in the timeline
          if( trackEvent === undefined ) {
            trackEvent = addTrackEvent( this, chapterStart, chapterEnd, text, level, levelTrack );
          }

          prevTrackEvent = trackEvent;

          // Create list item to display
          tocListItemLink.setAttribute("href", "#");
          tocListItemLink.setAttribute("data-start", chapterStart);//TimeUtils.toTimecode( chapterStart, 0 ));
          tocListItemLink.setAttribute("data-end", chapterEnd);//TimeUtils.toTimecode( chapterEnd, 0 ));
          tocListItemLink.setAttribute("class", "toc-item-link");
          //tocListItemLink.setAttribute("data-start", trackEvent.popcornOptions.start);
          tocListItemLink.innerHTML = text;

          $( tocListItemLink ).data("trackEvent", trackEvent);

          tocListItemLink.onclick = function(e) {
            var thestart = $(e.target).data("trackEvent").popcornOptions.start;
              _media.currentTime = thestart;
          }

          tocListItem.appendChild(tocListItemLink);
          tocListItem.appendChild(childDisplayList);

          displayList.appendChild(tocListItem);

          addChapterTrackEvent(this, childDisplayList, level+1, chapterStart, chapterStep, levelTrack);

          chapterStart = chapterEnd;
          chapterEnd = chapterStart + chapterStep;

        });
      }
      else {
        displayList.parentNode.removeChild( displayList );
      }
    }

    function removeChapterTrackEvent(rootElementList) {
      var tocList = $(rootElementList).find("> ol > li");

      if( tocList.length>0 ) {
        tocList.each(function() {
          var trackEvent = $(this).data("trackEvent");

          if( trackEvent !== undefined ) {
            // Add track event in the timeline
            trackEvent.track.removeTrackEvent( trackEvent );
          }

          removeChapterTrackEvent( this );
          
        });
      }
    }


    function createTocTrackEvent() {
      if( !_tocTrackEvent ) {
        _tocOptions.start = 0;
        _tocOptions.end = _media.duration;
        //_tocOptions.html = _tocDisplayList.innerHTML;
        //_innerDiv.innerHTML = "hello";

        // Create a toc track event
        _tocTrackEvent = _butter.generateSafeTrackEvent( "toc", _tocOptions );
      }
      
      //_tocOptions.html = _tocDisplayList.innerHTML;
      //_tocTrackEvent.update( _tocOptions );


    }

    function clearTocTrackEvent() {
      _tocDisplayList.innerHTML = "";
    }

    function updateTocDisplayList() {
      if( _tocTrackEvent ) {
        var updateOptions = {};
        var jsonml = JsonML.fromHTML( _tocDisplayList );
        updateOptions.jsonml = jsonml;
        updateOptions.htmlToc = _tocDisplayList;

        //var testOpt = _tocTrackEvent.popcornOptions;

        //_innerDiv.appendChild( _tocDisplayList );
        _tocTrackEvent.update( updateOptions );
        //_tocTrackEvent.view.update( _tocOptions );
      }
    }

    function renderTimeline() {
      clearTocTrackEvent();
      createTocTrackEvent();
      addChapterTrackEvent( _editorTocDiv, _tocDisplayList, 1, 0, _butter.duration, _tocTrackEvent.track);

      updateTocDisplayList();
    }

    function removeElement( element ) {
      var $element = $( element );
      $element.removeData("trackEvent");
      $element.remove();

      if($(_editorTocList).children().length==0) {
        _editorTocDiv.classList.remove("visible");
        _clearBtn.classList.remove("visible");
      }
    }

    function setup() {
      _addEntryBtn.addEventListener( "click", addEntry, false);
      _clearBtn.addEventListener( "click", clearTocList, false);
      //_duplicateBtn.addEventListener( "click", duplicateTocTrackEvent, false);
      _renderBtn.addEventListener( "click", renderTimeline, false );

      _media.listen( "trackeventremoved", onTrackEventRemoved );
    }

    /*function selectText(element) {
        if (document.selection) {
            var range = document.body.createTextRange();
            range.moveToElementText(element);
            range.select();
        } else if (window.getSelection) {
            var range = document.createRange();
            range.selectNode(element);
            window.getSelection().addRange(range);
        }
    }*/


    Editor.BaseEditor.extend( this, butter, rootElement, {
      open: function() {
        _butter = butter;
        _media = butter.currentMedia;
        _this = this;

        $('#toc-div').nestable({"maxDepth":3, "group":1});

        $('#toc-div')/*.on('focus', '.dd3-content', function(event) {
            selectText( this );
        })*/
        .on('keyup', '.toc-item-content[contenteditable]', function(event) {
            if(event.keyCode === KeysUtils.ENTER) {
              var $this = $(this),
                  $nextDiv = $this.parent().next().children(".dd3-content");
                  updateTrackEvent( $this.parent() );
                  renderTimeline();
              if( $nextDiv.length==0 ) {
                $( _addEntryBtn ).trigger("click");
              }
              else {
                $( $nextDiv[0] ).trigger("focus");
              }

            }
        });

        $(".toc-item-link").on("click", function(event) {
          _media.pause();
          _media.currentTime = event.target.getAttribute("data-start");
          _media.start();
        })

        setup();

      },
      close: function() {
      }
    });
  }, true );
});
