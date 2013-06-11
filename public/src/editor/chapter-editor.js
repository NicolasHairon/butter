/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define([ "editor/editor", "editor/base-editor", "util/lang", "util/keys", "util/time", "util/dragndrop",
  "ui/widget/textbox", "text!layouts/chapter-editor.html" ],
  function( Editor, BaseEditor, LangUtils, KeysUtils, TimeUtils, DragNDrop, TextboxWrapper, EDITOR_LAYOUT ) {

    Editor.register( "chapter-editor", EDITOR_LAYOUT, function( rootElement, butter ) {
      var _editorContainer = rootElement.querySelector( ".editor-container" ),
          _tocEditorDiv = rootElement.querySelector( "#toc-div" ),
          _addEditorTocItemBtn = _editorContainer.querySelector( ".butter-new-entry-link" ),
          _clearBtn = _editorContainer.querySelector( ".butter-clear-link" ),
          _renderBtn = _editorContainer.querySelector( ".butter-render-link" ),
          _editorList = _editorContainer.querySelector( "#toc-ol" ),
          EDITOR_TOC_ITEM = LangUtils.domFragment( EDITOR_LAYOUT, ".toc-item" ),

          _butter = butter,
          _media = butter.currentMedia,
          _this,

          _tocTrackEvent,
          _tocOptions = {},
          _tocDisplayList = document.createElement( "ul" ),

          _count = 1,
          _timelineLoaded = false,
          _rendering = false;

    setup();

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


    function addEditorTocItem() {
      var newTocItem = EDITOR_TOC_ITEM.cloneNode( true ),
        dragBtn = newTocItem.querySelector( ".toc-item-handle" ),
        contentDiv = newTocItem.querySelector( ".toc-item-content" ),
        deleteBtn = newTocItem.querySelector( ".toc-item-delete" );

      deleteBtn.addEventListener( "click", function(e) {
        var $tocItem = $( newTocItem ),
            trackEvent = $tocItem.data("trackEvent");

        if( trackEvent !== undefined ) {
          trackEvent.track.removeTrackEvent( trackEvent );
        }

        $tocItem.removeData("trackEvent");
        $tocItem.remove();
      }, false );

      _tocEditorDiv.classList.add("visible");
      _clearBtn.classList.add("visible");
      _editorList.appendChild( newTocItem );

      $(newTocItem).find( ".dd3-content" ).first().text(_count);
      _count++;
    }

    function cleareditorList() {
      var editorList = document.getElementById("toc-ol");

      // Recursively remove track events
      removeChapterTrackEvent( _tocEditorDiv );

      editorList.innerHTML = '';
      _tocEditorDiv.classList.remove("visible");
      _clearBtn.classList.remove("visible");
    }

    /*
     * Method getEditorTocItem
     *
     * @param {Object} trackEvent: The trackEvent object from which we try to find related editor element.
     */
    function getEditorTocItem( trackEvent ) {
      var element,
          editorTocItems = $(_tocEditorDiv).find("li");

      editorTocItems.each(function() {
        var itemTrackEvent = $(this).data("trackEvent");

        if( itemTrackEvent == trackEvent ) {
          element = this;
        }

      });
      return element;
    }

    function updateEditorTocItem( trackEvent ) {
      var editorElement = getEditorTocItem( trackEvent );
      if( editorElement ) {
        var $element = $(editorElement),
            popcornOptions = trackEvent.popcornOptions;
        $element.find( ".dd3-content" ).first().text(popcornOptions.text);
        $element.find( ".toc-item-time-start input" ).first().val( TimeUtils.toTimecode(popcornOptions.start) ) ;
        $element.find( ".toc-item-time-end input" ).first().val( TimeUtils.toTimecode(popcornOptions.end) ) ;
      }
      if( !_rendering ) {
        clearTocDisplayList();
        updateTocDisplayList();
        updateTocTrackEvent();
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
        popcornOptions.level = ($element.parentsUntil("#toc-ol").length)/2+1;
        trackEvent.update( popcornOptions );
      }
      if( !_rendering ) {
        clearTocDisplayList();
        updateTocDisplayList();
        updateTocTrackEvent();
      }
    }

    function updateTocDisplayList(editorList, displayList) {
      if(!editorList) { editorList = _tocEditorDiv; }
      if(!displayList) { displayList = _tocDisplayList; }

      var subListItems = $(editorList).find("> ol > li");

      if( subListItems.length>0 ) {
        subListItems.each(function() {
          var text = $(this).find( ".dd3-content" ).first().text(),
              trackEvent = $(this).data("trackEvent"),
              childDisplayList = document.createElement( "ul" ),
              tocListItem = document.createElement( "li" ),
              tocListItemLink = document.createElement( "a" );

          // Create list item to display
          tocListItemLink.setAttribute("href", "#");
          tocListItemLink.setAttribute("data-start", trackEvent.popcornOptions.start);
          tocListItemLink.setAttribute("data-end", trackEvent.popcornOptions.end);
          tocListItemLink.setAttribute("data-trackevent-id", trackEvent.id);
          tocListItemLink.setAttribute("class", "toc-item-link");
          tocListItemLink.innerHTML = text;

          $( tocListItemLink ).removeData("trackEvent");
          $( tocListItemLink ).data("trackEvent", trackEvent);

          /*tocListItemLink.removeEventListener("click");
          tocListItemLink.addEventListener("click", function(e) {
            var thestart = $(e.target).data("trackEvent").popcornOptions.start;
              _media.currentTime = thestart;
          });*/

          tocListItem.appendChild(tocListItemLink);
          tocListItem.appendChild(childDisplayList);

          displayList.appendChild(tocListItem);

          updateTocDisplayList(this, childDisplayList);

        });
      }
      else {
        displayList.parentNode.removeChild( displayList );
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
          updateEditorTocItem( overlapTrackEvent );
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

    function createTrackEvent( element, start, end, text, level, track ) {
      var popcornOptions = {},
          $element = $(element),
          trackEvent,
          startBox,
          endBox;
          
      popcornOptions.start = start;
      popcornOptions.end   = end;
      popcornOptions.text  = text;
      popcornOptions.level = level;

      startBox = new Time($element.find(".toc-item-time-start"));
      endBox = new Time($element.find(".toc-item-time-end"));

      trackEvent = generateSafeChapterTrackEvent( popcornOptions, track );

      // Listen to updates on track event
      trackEvent.listen( "trackeventadded", onTrackEventAdded );
      trackEvent.listen( "trackeventupdated", onTrackEventUpdated );

      // Save trackevent associated to editor element
      $( element ).data( "trackEvent", trackEvent );

      // Update start and end time in editor element inputs
      updateEditorTocItem( trackEvent );

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
      updateEditorTocItem( trackEvent );
    }

    function onMediaTrackEventRemoved( e ) {
      var trackEvent = e.data,
          editorElement;

      editorElement = getEditorTocItem( trackEvent );

      // If track event is beeing draged or resized, don't allow deletion
      if( trackEvent.selected ) {
        return;
      }

      if( editorElement ) {
        removeElement( editorElement );
        renderTimeline();
      }
    }

    function createChapterTrack(editorList, level, start, duration, parentTrack) {
      var subListItems = $(editorList).find("> ol > li");

      if( subListItems.length>0 ) {
        var chapterStart = start,
          chapterStep = duration/subListItems.length,
          chapterEnd = start+chapterStep,
          levelTrack = $(subListItems).data("track");

        if( levelTrack === undefined ) {
          levelTrack = _media.insertTrackAfter( parentTrack );
          $(subListItems).data("track", levelTrack);
        }

        subListItems.each(function() {
          var text = $(this).find( ".dd3-content" ).first().text(),
              trackEvent = $(this).data("trackEvent");

          // If not already in the timeline, create a chapter track event
          if( trackEvent === undefined ) {
            trackEvent = createTrackEvent( this, chapterStart, chapterEnd, text, level, levelTrack );
          }
          // Else, update existing track event with latest data from toc editor item
          else {
            updateTrackEvent( this );
          }

          createChapterTrack(this, level+1, chapterStart, chapterStep, levelTrack);

          chapterStart = chapterEnd;
          chapterEnd = chapterStart + chapterStep;

        });
      }
    }

    function removeChapterTrackEvent(editorList) {
      var tocList = $(editorList).find("> ol > li");

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
        // Create a toc track event
        _tocTrackEvent = _butter.generateSafeTrackEvent( "toc", _tocOptions );
      }
    }

    function clearTocDisplayList() {
      _tocDisplayList.innerHTML = '';
    }

    function updateTocTrackEvent() {
      if( _tocTrackEvent ) {
        var updateOptions = {};
        var jsonml = JsonML.fromHTML( _tocDisplayList );
        updateOptions.jsonml = jsonml;
        //updateOptions.htmlToc = _tocDisplayList;

        _tocTrackEvent.update( updateOptions );
      }
    }

    function renderTimeline() {
      _rendering = true;
      clearTocDisplayList();
      createTocTrackEvent();
      createChapterTrack( _tocEditorDiv, 1, 0, _butter.duration, _tocTrackEvent.track);
      updateTocDisplayList( _tocEditorDiv, _tocDisplayList );
      updateTocTrackEvent();
      _rendering = false;
    }

    function removeElement( element ) {
      var $element = $( element );
      $element.removeData("trackEvent");
      $element.remove();

      if($(_editorList).children().length==0) {
        _tocEditorDiv.classList.remove("visible");
        _clearBtn.classList.remove("visible");
      }
    }

    function setup() {
      _addEditorTocItemBtn.addEventListener( "click", addEditorTocItem, false);
      _clearBtn.addEventListener( "click", cleareditorList, false);
      //_duplicateBtn.addEventListener( "click", duplicateTocTrackEvent, false);
      _renderBtn.addEventListener( "click", renderTimeline, false );

      _media.listen( "trackeventremoved", onMediaTrackEventRemoved );

      if( !_timelineLoaded ) {
        loadTracks();
      }
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

    function loadTracks() {
      var tracks = _media.tracks;

      for(var i = 0; i < _media.tracks.length; i++) {
        var track = tracks[i];

        for(var j = 0; j < track.trackEvents.length; j++) {
          var trackEvent = track.trackEvents[j];
          if( trackEvent.type == "toc") {
            _tocTrackEvent = trackEvent;
            break;
          }
          
        }
        
      }

      if( !_tocTrackEvent ) {
        return;
      }

      // Editor list item generation is based on json list
      var jsonList = _tocTrackEvent.popcornOptions.jsonml;

      // Load editor to list
      loadChapterTrack( _editorList, jsonList );

      _timelineLoaded = true;
    }

    function loadChapterTrack( parentEditorList, jsonList ) {
      for(var k = 0; k < jsonList.length; k++) {
        var item = jsonList[k];

        if( 'string' === typeof item) {
          continue;
        }
        
        var tocItemLink = item[1],
          tocItemSubList = item[2];

        // Create editor toc item
        if( tocItemLink[0] == "A") {
          var editorTocItem = EDITOR_TOC_ITEM.cloneNode( true ),
            $editorTocItem = $(editorTocItem),
            dragBtn = editorTocItem.querySelector( ".toc-item-handle" ),
            contentDiv = editorTocItem.querySelector( ".toc-item-content" ),
            deleteBtn = editorTocItem.querySelector( ".toc-item-delete" ),
            trackEvent,
            trackEventId = tocItemLink[1]["data-trackevent-id"];

          // If no link to track event, move to next item
          if( !trackEventId ) {
            continue;
          }

          trackEvent = _media.findTrackWithTrackEventId( trackEventId ).trackEvent;

          deleteBtn.addEventListener( "click", function(e) {
            var trackEvent = $editorTocItem.data("trackEvent");

            if( trackEvent !== undefined ) {
              trackEvent.track.removeTrackEvent(trackEvent);
            }

            $editorTocItem.removeData("trackEvent");
            $editorTocItem.remove();
          }, false );

          _tocEditorDiv.classList.add("visible");
          _clearBtn.classList.add("visible");

          var label = trackEvent.popcornOptions.text;
          $(editorTocItem).find(".dd3-content").first().text( label );

          parentEditorList.appendChild( editorTocItem );

          startBox = new Time( $editorTocItem.find(".toc-item-time-start") );
          endBox = new Time( $editorTocItem.find(".toc-item-time-end") );

          // Listen to updates on track event
          trackEvent.listen( "trackeventupdated", onTrackEventUpdated );

          // Save trackevent associated to editor element
          $( editorTocItem ).data( "trackEvent", trackEvent );

          // Update start and end time in editor element inputs
          updateEditorTocItem( trackEvent );
          
        
          if( tocItemSubList !== undefined) {
            var childEditorList = document.createElement( "ol" );
            editorTocItem.appendChild( childEditorList );

            loadChapterTrack( childEditorList, tocItemSubList );
          }

        }
      }
    }

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
                $( _addEditorTocItemBtn ).trigger("click");
              }
              else {
                $( $nextDiv[0] ).trigger("focus");
              }

            }
        });

      },
      close: function() {
      }
    });
  }, true );
});
