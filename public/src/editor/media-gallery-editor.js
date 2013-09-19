/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define( [ "util/lang", "util/uri", "util/keys", "util/mediatypes", "editor/editor", "editor/chapter-editor",
 "util/time", "util/dragndrop", "text!layouts/media-editor.html" ],
  function( LangUtils, URI, KeysUtils, MediaUtils, Editor, ChapterEditor, Time, DragNDrop, EDITOR_LAYOUT ) {

  var _parentElement =  LangUtils.domFragment( EDITOR_LAYOUT,".media-editor" ),
      _addMediaTitle = _parentElement.querySelector( ".add-new-media" ),
      _addMediaPanel = _parentElement.querySelector( ".add-media-panel" ),

      _urlInput = _addMediaPanel.querySelector( ".add-media-input" ),
      _addBtn = _addMediaPanel.querySelector( ".add-media-btn" ),
      _errorMessage = _parentElement.querySelector( ".media-error-message" ),
      _validMessage = _parentElement.querySelector( ".media-valid-message" ),
      _oldValue,
      _loadingSpinner = _parentElement.querySelector( ".media-loading-spinner" ),

      _galleryPanel = _parentElement.querySelector( ".media-gallery" ),
      _addAllBtn = _parentElement.querySelector( ".add-all-btn" ),
      _galleryList = _galleryPanel.querySelector( ".media-gallery-list" ),
      _GALLERYITEM = LangUtils.domFragment( EDITOR_LAYOUT, ".media-gallery-item" ),

      _durationInput = _parentElement.querySelector( ".media-base-duration" ),

      _butter,
      _media,

      _mediaTrack,

      _mediaLoadTimeout,
      _cancelSpinner,

      MEDIA_LOAD_TIMEOUT = 10000,
      TRANSITION_TIME = 2000,

      MEDIA_EXISTING = "One or more media are already in the gallery",
      MEDIA_LOADING_ERROR = "One or more media have failed to load",
      MEDIA_LOADED = "Your media source(s) have been loaded",

      _this;

  function toggleAddNewMediaPanel() {
    _parentElement.classList.toggle( "add-media-collapsed" );
  }

  function resetInput() {
    _urlInput.value = "";

    clearTimeout( _mediaLoadTimeout );
    clearTimeout( _cancelSpinner );
    _urlInput.classList.remove( "error" );
    _addMediaPanel.classList.remove( "invalid-field" );
    _errorMessage.classList.add( "hidden" );
    _loadingSpinner.classList.add( "hidden" );
    _addBtn.classList.add( "hidden" );
  }

  function setBaseDuration( duration ) {
    var durationTimeCode = Time.toTimecode( duration ),
        durationSeconds = Time.toSeconds( duration );

    // Don't accept empty inputs or negative/zero values for duration.
    if ( duration === "" || durationSeconds <= 0 ) {
      _durationInput.value = Time.toTimecode( _media.duration );
      return;
    }

    // If the entered value wasn't in time code format.
    if ( _durationInput.value !== durationTimeCode ) {
      _durationInput.value = durationTimeCode;
    }

    // If the seconds version of the duration is already our current duration
    // bail early.
    if ( durationSeconds === _media.duration ) {
      return;
    }

    _media.url = "#t=," + durationSeconds;
  }

  function addElements( data, el ) {
    el = el || _GALLERYITEM.cloneNode( true );

    $(el).data('metaData', data);
    $(el).data('hasTrackEvent', false);

    var deleteBtn = el.querySelector( ".mg-delete-btn" ),
        thumbnailBtn = el.querySelector( ".mg-thumbnail" ),
        thumbnailImg,
        source = data.source;

    DragNDrop.helper( thumbnailBtn, {
      pluginOptions: {
        source: data.source,
        denied: data.denied,
        end: data.duration,
        from: data.from || 0,
        title: data.title,
        duration: data.duration,
        hidden: data.hidden
      },
      start: function() {
        for ( var i = 0, l = _butter.targets.length; i < l; ++i ) {
          _butter.targets[ i ].iframeDiv.style.display = "block";
        }
      },
      stop: function() {
        _butter.currentMedia.pause();
        for ( var i = 0, l = _butter.targets.length; i < l; ++i ) {
          _butter.targets[ i ].iframeDiv.style.display = "none";
        }
      }
    });

    thumbnailBtn.setAttribute( "data-popcorn-plugin-type", "sequencer" );
    thumbnailBtn.setAttribute( "data-butter-draggable-type", "plugin" );
    deleteBtn.addEventListener( "click", function() {

    thumbnailBtn.removeEventListener( "click", addEvent, false );
      _galleryList.removeChild( el );
      _this.scrollbar.update();
      delete _media.clipData[ source ];
      _butter.dispatch( "mediaclipremoved" );
    }, false );

    //_loadingSpinner.classList.add( "hidden" );

    el.querySelector( ".mg-title" ).innerHTML = data.title;
    el.querySelector( ".mg-type" ).classList.add( data.type.toLowerCase() + "-icon" );
    el.querySelector( ".mg-type-text" ).innerHTML = data.type;
    el.querySelector( ".mg-duration" ).innerHTML = Time.toTimecode( data.duration, 0 );

    thumbnailImg = document.createElement( "img" );
    thumbnailImg.src = data.thumbnail;

    thumbnailBtn.appendChild( thumbnailImg );
    thumbnailBtn.src = data.thumbnail;

    el.classList.add( "mg-" + data.type.toLowerCase() );

    if ( data.denied ) {
      el.querySelector( ".mg-error" ).innerHTML = "Embedding disabled by request";
    }

    function addEvent() {
      var start = _butter.currentTime,
          end = start + data.duration,
          playWhenReady = false,
          trackEvent;

      function addTrackEvent() {
        var popcornOptions = {
          source: URI.makeUnique( data.source ).toString(),
          denied: data.denied,
          start: start,
          end: end,
          from: data.from || 0,
          title: data.title,
          duration: data.duration,
          hidden: data.hidden || false
        };

        trackEvent = _butter.generateSafeTrackEvent( "sequencer", popcornOptions );
      }

      if ( end > _media.duration ) {
        _butter.listen( "mediaready", function onMediaReady() {
          _butter.unlisten( "mediaready", onMediaReady );
          if ( playWhenReady ) {
            _media.play();
          }
          addTrackEvent();
        });

        playWhenReady = !_media.paused;
        setBaseDuration( end );
      } else {
        addTrackEvent();
      }
    }

    thumbnailBtn.addEventListener( "click", addEvent, false );

    _galleryList.insertBefore( el, _galleryList.firstChild );

    if ( _this.scrollbar ) {
      _this.scrollbar.update();
    }
  }

  function createAddMediaTask( url ) {
    return function( next ) {
      addMediaToGallery( url, next, onDenied );
    }
  }

  function addAllMediaToGallery( urlInput ) {
    urlInput = urlInput.replace(/(\n|\r|\r\n)/g, ' ');
    var urlList = urlInput.split(' ');
    // Fetch all urls from input
    for(i = 0; i < urlList.length; i++) {
      $(_galleryPanel).queue( 'addAllMediaTask', createAddMediaTask( urlList[i] ) );
    }

    _loadingSpinner.classList.remove( "hidden" );

    $(_galleryPanel).queue('addAllMediaTask', function(){
        _validMessage.innerHTML = MEDIA_LOADED;
        _errorMessage.classList.add( "hidden" );
        _validMessage.classList.remove( "hidden" );
        resetInput();
        setTimeout( function() {
          _validMessage.classList.add( "hidden" );
          _loadingSpinner.classList.add( "hidden" );
        }, 5000 );
    });
    $(_galleryPanel).dequeue('addAllMediaTask');
  }

  function addMediaToGallery( url, next, onDenied ) {
    var data = {};

    // Don't trigger with empty inputs
    if ( !url ) {
      return;
    }

    data.source = url;
    data.type = "sequencer";
    _mediaLoadTimeout = setTimeout( function() {
      next();
      onDenied( MEDIA_LOADING_ERROR );
    }, MEDIA_LOAD_TIMEOUT );
    MediaUtils.getMetaData( data.source, onSuccess, onDenied, next );
  }

  function onSuccess( data ) {
    var el = _GALLERYITEM.cloneNode( true ),
        source = data.source;

    if ( !_media.clipData[ source ] ) {
      _media.clipData[ source ] = data;
      _butter.dispatch( "mediaclipadded" );

      el.classList.add( "new" );

      setTimeout(function() {
        el.classList.remove( "new" );
      }, TRANSITION_TIME );

      addElements( data, el );
      // Necessary to avoid timeout errors
      clearTimeout( _mediaLoadTimeout );
    } else {
      onDenied( MEDIA_EXISTING );
    }
    // Call next media loading
    data.next();
  }

  function onDenied( error ) {
    clearTimeout( _cancelSpinner );
    clearTimeout( _mediaLoadTimeout );
    _errorMessage.innerHTML = error;
    _errorMessage.classList.remove( "hidden" );
    _addMediaPanel.classList.add( "invalid-field" );
    setTimeout( function() {
      _errorMessage.classList.add( "hidden" );
    }, 3000 );
  }

  function onFocus() {
    _oldValue = _urlInput.value;
  }

  function onInput() {
    if ( _urlInput.value ) {
      _addBtn.classList.remove( "hidden" );
    } else {
      _addBtn.classList.add( "hidden" );
    }
    clearTimeout( _cancelSpinner );
    clearTimeout( _mediaLoadTimeout );
    _addMediaPanel.classList.remove( "invalid-field" );
    _loadingSpinner.classList.add( "hidden" );
    _errorMessage.classList.add( "hidden" );
  }

  function onEnter( e ) {
    if ( e.keyCode === KeysUtils.ENTER ) {
      e.preventDefault();
      onAddMediaClick();
    }
  }

  function onBlur( e ) {
    e.preventDefault();
    setBaseDuration( _durationInput.value );
  }

  function onAddMediaClick() {
    // transitionend event is not reliable and not cross browser supported.
    _cancelSpinner = setTimeout( function() {
      _loadingSpinner.classList.remove( "hidden" );
    }, 300 );
    _addBtn.classList.add( "hidden" );
    addAllMediaToGallery( _urlInput.value );
  }

  function setup() {
    _addMediaTitle.addEventListener( "click", toggleAddNewMediaPanel, false );

    _urlInput.addEventListener( "focus", onFocus, false );
    _urlInput.addEventListener( "input", onInput, false );
    _urlInput.addEventListener( "keydown", onEnter, false );

    _addBtn.addEventListener( "click", onAddMediaClick, false );
    _addAllBtn.addEventListener( "click", onAddAllMediaClick, false );

    _durationInput.addEventListener( "keydown", onDurationChange, false );
    _durationInput.addEventListener( "blur", onBlur, false );
  }

  function onDurationChange( e ) {
    if ( e.keyCode === KeysUtils.ENTER ) {
      e.preventDefault();
      setBaseDuration( _durationInput.value );
    }
  }

  function onAddAllMediaClick() {
    var $galleryList = $($(_galleryList).find('li.media-gallery-item').get().reverse()),
      newMediaDuration = 0,
      lastStart = 0,
      lastEnd;

    // First adjust media total duration
    $galleryList.each(function() {
      var data = $(this).data("metaData");
      newMediaDuration += data.duration;
    });

    setBaseDuration( newMediaDuration );
    _media.duration = newMediaDuration;

    // Then add clips
    $galleryList.each(function() {
      var data = $(this).data("metaData"),
        hasTrackEvent = $(this).data("hasTrackEvent");
      lastEnd = lastStart + data.duration;

      if( !hasTrackEvent ) {
        addTrackEvent(data);
      }

      $(this).data("hasTrackEvent", true);
      // Add secturity margin to prevent the system to add trackevents
      // in a different track
      lastStart = lastEnd + 0.01;
    });

    function addTrackEvent(data) {
      var popcornOptions = {
        source: URI.makeUnique( data.source ).toString(),
        denied: data.denied,
        start: lastStart || 0,
        end: lastEnd,
        from: data.from || 0,
        title: data.title,
        duration: data.duration,
        hidden: data.hidden || false
      };

      trackEvent = _butter.generateSafeTrackEvent( "sequencer", popcornOptions, _mediaTrack );

      if(!_mediaTrack) {
        _mediaTrack = trackEvent.track;
      }
      _media.dispatch("sequencetrackeventadded", trackEvent);
    }

    // Send sequence track to chapter editor
    ///_media.dispatch("sequencetrackadded", _mediaTrack);
  }

  Editor.register( "media-editor", null, function( rootElement, butter ) {
    rootElement = _parentElement;
    _this = this;
    _butter = butter;
    _media = _butter.currentMedia;

    // We keep track of clips that are in the media gallery for a project once it is saved
    // and every time after it is saved.
    var clips = _media.clipData,
        clip;

    for ( var key in clips ) {
      if ( clips.hasOwnProperty( key ) ) {
        clip = clips[ key ];
        if ( typeof clip === "object" ) {
          addElements( clip );
        } else if ( typeof clip === "string" ) {
          // Load projects saved with just the url the old way.
          // Remove it too, so future saves don't come through here.
          delete clips[ key ];
          // Fire an onSuccess so a new, updated clip is added to clipData.
          MediaUtils.getMetaData( clip, onSuccess );
        }
      }
    }

    setup();

    Editor.BaseEditor.extend( _this, butter, rootElement, {
      open: function() {
        setBaseDuration( _media.duration );
      },
      close: function() {}
    });

  }, true );
});
