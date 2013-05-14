/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define([ "editor/editor", "editor/base-editor", "util/lang", "util/keys", "util/time", "util/dragndrop",
  "ui/widget/textbox", "text!layouts/chapter-editor.html" ],
  function( Editor, BaseEditor, LangUtils, KeysUtils, TimeUtils, DragNDrop, TextboxWrapper, EDITOR_LAYOUT ) {

    Editor.register( "chapter-editor", EDITOR_LAYOUT, function( rootElement, butter ) {
      var _editorContainer = rootElement.querySelector( ".editor-container" ),
          _tocDiv = rootElement.querySelector( "#toc-div" ),
          _addEntryBtn = _editorContainer.querySelector( ".butter-new-entry-link" ),
          _clearBtn = _editorContainer.querySelector( ".butter-clear-link" ),
          //_duplicateBtn = _editorContainer.querySelector( ".butter-duplicate-toc-link" ),
          _renderBtn = _editorContainer.querySelector( ".butter-render-link" ),
          _tocList = _editorContainer.querySelector( "#toc-ol" ),
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

          /*_target = Popcorn.dom.find( _media.target );
          _container = document.createElement( "div" );
          _innerContainer = document.createElement( "div" );
          _innerSpan = document.createElement( "span" );
          _innerDiv = document.createElement( "div" );

          // innerDiv inside innerSpan is to allow zindex from layers to work properly.
          // if you mess with this code, make sure to check for zindex issues.
          _innerSpan.appendChild( _innerDiv );
          _innerContainer.appendChild( _innerSpan );
          _container.appendChild( _innerContainer );
          _target.appendChild( _container );*/

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

        if( trackEvent!=undefined ) {
          trackEvent.track.removeTrackEvent(trackEvent);
        }

        $tocItem.removeData("trackEvent");
        $tocItem.remove();
      }, false );

      _tocDiv.classList.add("visible");
      _clearBtn.classList.add("visible");
      //_duplicateBtn.classList.add("visible");

      _tocList.appendChild( newTocItem );

      $(newTocItem).find( ".dd3-content" ).first().text(_count);
      _count++;

    }

    function clearTocList() {
      var toc = document.getElementById("toc-ol");

      // Recursively remove track events
      removeChapterTrackEvent( _tocDiv );

      toc.innerHTML = "";
      _tocDiv.classList.remove("visible");
      _clearBtn.classList.remove("visible");
      //_duplicateBtn.classList.remove("visible");

      _butter
    }

    function updateElement(trackOptions) {
      var $element = $(trackOptions.element);

      $element.find( ".dd3-content" ).first().text(trackOptions.text);
      $element.find( ".toc-item-time-start input" ).first().val( TimeUtils.toTimecode(trackOptions.start) ) ;
      $element.find( ".toc-item-time-end input" ).first().val( TimeUtils.toTimecode(trackOptions.end) ) ;
    }

    function updateTrackEvent(element) {
      var trackOptions = {},
          $element = $(element),
          trackEvent;

      trackEvent = $element.data("trackEvent");

      if( trackEvent!=undefined) {
        trackOptions.start = TimeUtils.toSeconds( $element.find(".toc-item-time-start input").val() );
        trackOptions.end   = TimeUtils.toSeconds( $element.find(".toc-item-time-end input").val() );
        trackOptions.text  = $element.find(".toc-item-content:first").text();
        trackOptions.level = ($element.parentsUntil("#toc-ol").length+1)/2;
        trackOptions.element = element;

        trackEvent.update( trackOptions );
      }
    }

    function addTrackEvent(element, start, end, text, level) {
      var popcornOptions = {},
          $element = $(element),
          trackEvent,
          startBox,
          endBox;
          
      popcornOptions.start = start;
      popcornOptions.end   = end;
      popcornOptions.text  = text;
      popcornOptions.level = level;
      popcornOptions.element = element;

      startBox = new Time($element.find(".toc-item-time-start"));
      endBox = new Time($element.find(".toc-item-time-end"));
      
      trackEvent = _butter.generateSafeTrackEvent( "chapter", popcornOptions );

      // First update start and end time in editor
      popcornOptions = trackEvent.popcornOptions;
      updateElement( popcornOptions );

      //_innerDiv.innerHTML += text;
      //var trackOptions = _tocTrackEvent.popcornOptions;
      //_tocOptions.html += text;
      //_tocTrackEvent.update( _tocOptions );

      trackEvent.listen( "trackeventupdated", onTrackEventUpdated );

      // Save associated trackevent
      $( element ).data( "trackEvent", trackEvent );

      return trackEvent;
    }

    function onTrackEventUpdated( e ) {
      var trackEvent = e.target,
          popcornOptions = trackEvent.popcornOptions;

      updateElement( popcornOptions );
    }

    function onTrackEventRemoved( e ) {
      var trackEvent = e.data,
          popcornOptions = trackEvent.popcornOptions;

      removeElement( popcornOptions.element );
      renderTimeline();
    }

    function addChapterTrackEvent(rootElement, displayList, level, start, duration) {
      var tocList = $(rootElement).find("> ol > li");

      if( tocList.length>0 ) {
        var chapterStart = start,
          chapterStep = duration/tocList.length,
          chapterEnd = start+chapterStep;

        tocList.each(function() {
          var text = $(this).find( ".dd3-content" ).first().text(),
              trackEvent = $(this).data("trackEvent"),
              childDisplayList = document.createElement( "ul" ),
              tocListItem = document.createElement( "li" ),
              tocListItemLink = document.createElement( "a" );

          if( trackEvent==undefined ) {
            // Add track event in the timeline
            trackEvent = addTrackEvent( this, chapterStart, chapterEnd, text, level );
          }
          // Else, track events updated automatically when edited

          // Create list item to display
          tocListItemLink.setAttribute("href", "#");
          //tocListItemLink.setAttribute("data-start", trackEvent.popcornOptions.start);
          tocListItemLink.innerHTML = text;
          $( tocListItemLink ).data("trackEvent", trackEvent);

          tocListItemLink.onclick = function(e) {
              _media.currentTime = $(e.target).data("trackEvent").popcornOptions.start;
            //_media.currentTime = tocListItemLink.getAttribute("data-start");
          }

          tocListItem.appendChild(tocListItemLink);
          tocListItem.appendChild(childDisplayList);

          displayList.appendChild(tocListItem);

          addChapterTrackEvent(this, childDisplayList, level+1, chapterStart, chapterStep);

          chapterStart = chapterEnd;
          chapterEnd = chapterStart+chapterStep;

        });
      }
    }

    function removeChapterTrackEvent(rootElement) {
      var tocList = $(rootElement).find("> ol > li");

      if( tocList.length>0 ) {
        tocList.each(function() {
          var trackEvent = $(this).data("trackEvent");

          if( trackEvent!=undefined ) {
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
        _tocOptions.html = _tocDisplayList;

        // Create a toc track event
        _tocTrackEvent = _butter.generateSafeTrackEvent( "toc", _tocOptions );
      }
      
      _tocOptions.html = _tocDisplayList;
      _tocTrackEvent.update( _tocOptions );
    }


    function clearTocTrackEvent() {
      _tocDisplayList.innerHTML = "";
    }

    function updateTocDisplayList() {
      if( _tocTrackEvent ) {
        _tocOptions.start = 0;
        _tocOptions.end = _media.duration;
        _tocOptions.html = _tocDisplayList;
        _tocTrackEvent.update( _tocOptions );
      }
    }

    function renderTimeline() {
      clearTocTrackEvent();
      createTocTrackEvent();
      addChapterTrackEvent( _tocDiv, _tocDisplayList, 1, 0, _butter.duration);
      updateTocDisplayList();
    }

    /*function duplicateTocTrackEvent() {
      _tocTrackEvent;
    }*/

    function removeElement( element ) {
      var $element = $( element );
      $element.removeData("trackEvent");
      $element.remove();

      if($(_tocList).children().length==0) {
        _tocDiv.classList.remove("visible");
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

        setup();

      },
      close: function() {
      }
    });
  }, true );
});
