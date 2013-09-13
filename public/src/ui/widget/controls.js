/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define( [ "util/lang", "util/time", "util/sanitizer",
  "ui/toggler",
  "text!layouts/controls.html" ],
  function( LangUtils, Time, Sanitizer,
    Toggler,
    CONTROLS_LAYOUT ) {

  function Controls( container, options ) {

    var LEFT_MOUSE_BUTTON = 0,
        SPACE_BAR = 32;

    var _controls = LangUtils.domFragment( CONTROLS_LAYOUT ).querySelector( "#butter-controls" ),
        _container = typeof container === "string" ? document.getElementById( container ) : container, p,
        
        // variables
        muteButton, playButton, prevButton, nextButton, currentTimeDialog, fullscreenButton,
        durationDialog, tocbar, timebar, timeTooltip, progressBar, bigPlayButton,
        scrubber, seeking, playStateCache, active, duration,
        controlsBars,
        volume, volumeProgressBar, volumeScrubber, position,
        controlsShare, controlsRemix, controlsFullscreen, //controlsToc,
        jsonToc, htmlToc, tocItems, tocTooltips, currentTocTooltip, playingTocTooltip,
        tooltipTime, tooltipTitles, tooltipH1, tooltipH2, tooltipH3,
        // functions
        bigPlayClicked, activate, deactivate, volumechange,
        togglePlay, timeMouseOver, timeMouseUp,
        onTocReady,
        //timeToolTipMouseMove,
        timeMouseDown, timeMouseMove, volumeMouseMove, volumeMouseUp,
        volumeMouseDown, durationchange, mutechange;

    // Deal with callbacks for various buttons in controls
    options = options || {};
    var nop = function(){},
        onShareClick = options.onShareClick || nop,
        onRemixClick = options.onRemixClick || nop,
        onFullscreenClick = options.onFullscreenClick || nop,
        //onTocClick = onTocClick,
        init = options.init || nop;

    function onInit() {

      document.removeEventListener( "click", onInit, false );
      function setPopcorn( popcorn ) {
        p = popcorn;
      }
      init( setPopcorn );

      p.controls( false );
      if ( p.readyState() >= 1 ) {

        ready();
      } else {

        p.media.addEventListener( "loadedmetadata", ready, false );
      }
    }

    var ready = function() {
      p.media.removeEventListener( "loadedmetadata", ready, false );

      muteButton = document.getElementById( "controls-mute" );
      playButton = document.getElementById( "controls-play" );
      prevButton = document.getElementById( "controls-prev" );
      nextButton = document.getElementById( "controls-next" );
      currentTimeDialog = document.getElementById( "controls-currenttime" );
      durationDialog = document.getElementById( "controls-duration" );
      controlsBars = document.getElementById( "controls-bars" );
      tocbar = document.getElementById( "controls-tocbar" );
      timebar = document.getElementById( "controls-timebar" );
      timeTooltip = document.getElementById( "controls-time-tooltip" );
      progressBar = document.getElementById( "controls-progressbar" );
      bigPlayButton = document.getElementById( "controls-big-play-button" );
      scrubber = document.getElementById( "controls-scrubber" );
      volume = document.getElementById( "controls-volume" );
      fullscreenButton = document.getElementById( "controls-fullscreen" );
      volumeProgressBar = document.getElementById( "controls-volume-progressbar" );
      volumeScrubber = document.getElementById( "controls-volume-scrubber" );
      controlsShare = document.getElementById( "controls-share" );
      controlsRemix = document.getElementById( "controls-remix" );
      controlsFullscreen = document.getElementById( "controls-fullscreen" );
      //controlsToc = document.getElementById( "controls-toc" );
      //controlsLogo = document.getElementById( "controls-logo" );
      seeking = false;
      playStateCache = false;
      active = false;
      duration = p.duration();

      tooltipTime = document.createElement("span");
      tooltipTime.classList.add("tooltip-time");
      tooltipTitles = document.createElement("div");
      tooltipTitles.classList.add("tooltip-titles");
      tooltipH1 = document.createElement("span");
      tooltipH1.classList.add("tooltip-h1");
      tooltipH2 = document.createElement("span");
      tooltipH2.classList.add("tooltip-h2");
      tooltipH3 = document.createElement("span");
      tooltipH3.classList.add("tooltip-h3");

      timeTooltip.appendChild(tooltipTime);
      tooltipTitles.appendChild(tooltipH1);
      tooltipTitles.appendChild(tooltipH2);
      tooltipTitles.appendChild(tooltipH3);

      timeTooltip.appendChild(tooltipTitles);
      /*timeTooltip.appendChild(tooltipH2);
      timeTooltip.appendChild(tooltipH3);*/

      jsonToc = p.data.running.toc[0].jsonml;
      htmlToc = JsonML.toHTML( jsonToc );
      //tocItems = p.data.running.toc[0].tocItems;
      tocTooltips = p.data.running.toc[0].tocTooltips;

      // Wire custom callbacks for right-hand buttons
      controlsShare.addEventListener( "click", onShareClick, false );
      controlsRemix.addEventListener( "click", onRemixClick, false );
      controlsFullscreen.addEventListener( "click", onFullscreenClick, false );

      var tocLinks = htmlToc.querySelectorAll(".toc-item-link"),
        h1Count = 0,
        h2Count = 0,
        h3Count = 0;

      // Set toc bar items
      for( var i = 0; i < tocLinks.length; i++) {
        var tocLink = tocLinks[ i ],
          newTocbarItem = document.createElement('div');
        
        //newTocbarItem.classList.add("controls-tocbar-item");

        tocLink.innerHTML = Sanitizer.reconstituteHTML( tocLink.innerHTML );

        var end = tocLink.getAttribute('data-end'),
          start = tocLink.getAttribute('data-start'),
          level = tocLink.getAttribute('data-level');


        var itemLeft = start/duration * 100 + "%",
          itemWidth = (end-start)/duration * 100 + "%";

        newTocbarItem.style.position = "absolute";
        newTocbarItem.style.left = itemLeft;
        newTocbarItem.style.width = itemWidth;

        if( level==1 ) {
          ++h1Count;
          //tocLink.innerHTML = "Partie "+h1Count+"<br/>"+tocLink.innerHTML;
          newTocbarItem.classList.add("controls-tocbar-item-h1");
        }
        else if( level==2 ) {
          ++h2Count;
          newTocbarItem.classList.add("controls-tocbar-item-h2");          
        }
        else if( level==3 ) {
          ++h3Count;
          (h3Count%2 === 0) ? newTocbarItem.classList.add("even") : newTocbarItem.classList.add("odd");
          newTocbarItem.classList.add("controls-tocbar-item-h3");
        }

        tocbar.appendChild( newTocbarItem );

        // Set associated tooltip
        matchTocbarAndTooltip( newTocbarItem, parseFloat( start ), parseFloat( end ) );
      }

      function matchTocbarAndTooltip ( tocBarItem, start, end ) {
        for (var i = 0; i < tocTooltips.length; i++) {
          var tocTooltip = tocTooltips[i];
          if( tocTooltip.start >= start && tocTooltip.start <= end
            && tocTooltip.end >= start && tocTooltip.end <= end ) {
            tocTooltip.tocBars.push( tocBarItem );
          }
        }
      }

      toggleTocBars = function (tocBars, myClass, on) {
        jQuery.each( tocBars, function() {
          if(on)
            this.classList.add(myClass);
          else
            this.classList.remove(myClass);
        });
      }

      toggleCurrentTocBars = function(on) {
        if(!currentTocTooltip) return;
        toggleTocBars( currentTocTooltip.tocBars, "current-tocbar-item", on);
      }

      togglePlayingTocBars = function(on) {
        if(!playingTocTooltip) return;
        toggleTocBars( playingTocTooltip.tocBars, "playing-tocbar-item", on);
      }

      setPlayingTocBar = function() {
        togglePlayingTocBars(false);
        var currentTime = p.currentTime();

        for (var i = 0; i < tocTooltips.length; i++) {
          var tocTooltip = tocTooltips[i];
          if( currentTime >= tocTooltip.start && currentTime <= tocTooltip.end ) {
            if( playingTocTooltip != tocTooltip ) {
              playingTocTooltip = tocTooltip;
            }
          }
        }
        togglePlayingTocBars(true);
      }

      // Set triggers on tooltip change
      for (var i = 0; i < tocTooltips.length; i++) {
        var tocTooltip = tocTooltips[i];
        p.cue( tocTooltip.start, setPlayingTocBar);
      }

      if ( bigPlayButton ) {

        bigPlayButton.classList.add( "controls-ready" );

        bigPlayClicked = function() {

          p.media.removeEventListener( "play", bigPlayClicked, false );
          bigPlayButton.removeEventListener( "click", bigPlayClicked, false );
          bigPlayButton.classList.remove( "controls-ready" );
          bigPlayButton.classList.add( "hide-button" );
          p.media.addEventListener( "mouseover", activate, false );
          if ( p.paused() ) {
            p.play();
          }
        };

        bigPlayButton.addEventListener( "click", bigPlayClicked, false );
        p.media.addEventListener( "play", bigPlayClicked, false );
      }

      // this block is used to ensure that when the video is played on a mobile device that the controls and playButton overlay
      // are in the correct state when it begins playing
      if ( !p.paused() ) {
        if ( bigPlayButton ) {
          bigPlayClicked();
        }
        playButton.classList.remove( "controls-paused" );
        playButton.classList.add( "controls-playing" );
      }

      _controls.classList.add( "controls-ready" );

      activate = function() {
        active = true;
        _controls.classList.add( "controls-active" );
      };

      deactivate = function() {

        active = false;
        if ( !seeking ) {
          _controls.classList.remove( "controls-active" );
        }
      };

      p.media.addEventListener( "mouseout", deactivate, false );
      _controls.addEventListener( "mouseover", activate, false );
      _controls.addEventListener( "mouseout", deactivate, false );

      togglePlay = function( e ) {

        // Only continue if event was triggered by the left mouse button or the spacebar
        if ( e.button !== LEFT_MOUSE_BUTTON && e.which !== SPACE_BAR ) {
          return;
        }

        if ( p.paused() ) {

          p.play();
        } else {

          p.pause();
        }
      };

      prevClick = function( e ) {
        goToStep( true );
      };

      nextClick = function( e ) {
        goToStep( false );
      }

      goToStep = function( toPrev ) {
        var currentTime = p.currentTime(),
          targetTocTooltip;

        /*for (var i = 0; i < tocItems.length; i++) {
          var item = tocItems[i];
          if( currentTime >= item.start && currentTime <= item.end ) {
            currentItem = item;
            if( toPrev ) {
              if( i > 0 )
                targetItem = tocItems[i-1];
              else if(i==0)
                targetItem = tocItems[0];
            }
            else {
              if( i < tocItems.length-1 )
                targetItem = tocItems[i+1];
              else if(i == tocItems.length-1)
                targetItem = tocItems[tocItems.length-1];
            }
            break;
          }
        }*/
        for (var i = 0; i < tocTooltips.length; i++) {
          var tocTooltip = tocTooltips[i];
          if( currentTime >= tocTooltip.start && currentTime < tocTooltip.end ) {
            if( toPrev ) {
              if( i > 0 )
                targetTocTooltip = tocTooltips[i-1];
              else if(i == 0)
                targetTocTooltip = tocTooltips[0];
            }
            else {
              if( i < tocTooltips.length-1 )
                targetTocTooltip = tocTooltips[i+1];
              else if(i == tocTooltips.length-1)
                targetTocTooltip = tocTooltips[tocTooltips.length-1];
            }
            break;
          }
        }

        if ( p.paused() ) {
          p.pause( targetTocTooltip.start );
        } else {
          p.play( targetTocTooltip.start );
        }
      }

      p.media.addEventListener( "click", togglePlay, false );
      window.addEventListener( "keypress", togglePlay, false );

      if ( playButton ) {

        playButton.addEventListener( "click", togglePlay, false );

        p.on( "play", function() {
          playButton.classList.remove( "controls-paused" );
          playButton.classList.add( "controls-playing" );
        });

        p.on( "pause", function() {
          playButton.classList.remove( "controls-playing" );
          playButton.classList.add( "controls-paused" );
        });
      }

      if( prevButton ) {
        prevButton.addEventListener( "click", prevClick, false );
      }

      if( nextButton ) {
        nextButton.addEventListener( "click", nextClick, false );
      }

      if ( muteButton ) {

        muteButton.addEventListener( "click", function( e ) {

          if ( e.button !== 0 ) {

            return;
          }

          p[ p.muted() ? "unmute" : "mute" ]();
        }, false );

        mutechange = function() {

          if ( p.muted() ) {

            muteButton.classList.remove( "controls-unmuted" );
            muteButton.classList.add( "controls-muted" );
          } else {

            muteButton.classList.remove( "controls-muted" );
            muteButton.classList.add( "controls-unmuted" );
          }
        };

        p.on( "volumechange", mutechange );
        mutechange();
      }

      if ( volume ) {

        volumeMouseMove = function( e ) {

          e.preventDefault();

          position = e.clientX - volume.getBoundingClientRect().left;

          if ( position <= 0 ) {

            p.mute();
            position = 0;
          } else if ( position > volume.offsetWidth ) {

            position = volume.offsetWidth;
          } else if ( p.muted() ) {

            p.unmute();
          }

          if ( volumeProgressBar ) {

            volumeProgressBar.style.width = ( position / volume.offsetWidth * 100 ) + "%";
          }

          if ( volumeScrubber ) {

            volumeScrubber.style.left = ( ( position - ( volumeScrubber.offsetWidth / 2 ) ) / volume.offsetWidth * 100 ) + "%";
          }

          p.volume( position / volume.offsetWidth );
        };

        volumeMouseUp = function( e ) {

          if ( e.button !== 0 ) {

            return;
          }

          e.preventDefault();
          window.removeEventListener( "mouseup", volumeMouseUp, false );
          window.removeEventListener( "mousemove", volumeMouseMove, false );
        };

        volumeMouseDown = function( e ) {

          if ( e.button !== 0 ) {

            return;
          }

          position = e.clientX - volume.getBoundingClientRect().left;

          e.preventDefault();
          window.addEventListener( "mouseup", volumeMouseUp, false );
          window.addEventListener( "mousemove", volumeMouseMove, false );

          if ( position === 0 ) {

            p.mute();
          } else if ( p.muted() ) {

            p.unmute();
          }

          if ( volumeProgressBar ) {

            volumeProgressBar.style.width = ( position / volume.offsetWidth * 100 ) + "%";
          }

          if ( volumeScrubber ) {

            volumeScrubber.style.left = ( ( position - ( volumeScrubber.offsetWidth / 2 ) ) / volume.offsetWidth * 100 ) + "%";
          }

          p.volume( position / volume.offsetWidth );
        };

        volume.addEventListener( "mousedown", volumeMouseDown, false );

        volumechange = function() {

          var width;

          if ( p.muted() ) {

            width = 0;
          } else {

            width = p.volume();
          }

          if ( width === 0 ) {

            if ( muteButton ) {

              muteButton.classList.remove( "controls-unmuted" );
              muteButton.classList.add( "controls-muted" );
            }
          }

          if ( volumeProgressBar ) {

            volumeProgressBar.style.width = ( width * 100 ) + "%";
          }

          if ( volumeScrubber ) {

            volumeScrubber.style.left = ( ( width - ( volumeScrubber.offsetWidth / 2 ) ) * 100 ) + "%";
          }
        };

        p.on( "volumechange", volumechange );

        // fire to get and set initially volume slider position
        volumechange();
      }

      if ( durationDialog ) {

        durationchange = function() {
          durationDialog.innerHTML = Time.toTimecode( p.duration(), 0 );
        };

        durationchange();
      }

      if ( timebar ) {

        setTimeTooltip = function () {
          var currentTime = Math.floor(position / timebar.offsetWidth * duration);
          tooltipTime.innerHTML = Time.toTimecode( currentTime, 0 );

          /*tooltipH1.innerHTML = "";
          for (var i = 0; i < tocItems.length; i++) {
            var item = tocItems[i];
            if( currentTime > item.start && currentTime < item.end ) {
              tooltipH1.innerHTML = item.link.innerHTML;
              break;
            }
          }*/

          for (var i = 0; i < tocTooltips.length; i++) {
            var tocTooltip = tocTooltips[i];
            if( currentTime >= tocTooltip.start && currentTime <= tocTooltip.end ) {

              if(currentTocTooltip != tocTooltip) {
                toggleCurrentTocBars(false);
                currentTocTooltip = tocTooltip;
                toggleCurrentTocBars(true);                
              }

              tooltipH1.innerHTML = tocTooltip.titles[0];
              if(tocTooltip.titles.length >= 2)
                  tooltipH2.innerHTML = tocTooltip.titles[1];
              if(tocTooltip.titles.length == 3)
                  tooltipH3.innerHTML = tocTooltip.titles[2];
          
              //tooltipH1.innerHTML = tocTooltip.titles.join("<br/>");
              break;
            }
          }

        }

        timeMouseMove = function( e ) {

          e.preventDefault();

          position = e.clientX - timebar.getBoundingClientRect().left;

          if ( position < 0 ) {

            position = 0;
          } else if ( position > timebar.offsetWidth ) {

            position = timebar.offsetWidth;
          }

          if ( progressBar ) {

            progressBar.style.width = ( position / timebar.offsetWidth * 100 ) + "%";
          }

          if ( scrubber ) {

            scrubber.style.left = ( ( position - ( scrubber.offsetWidth / 2 ) ) / timebar.offsetWidth * 100 ) + "%";
          }

          p.currentTime( position / timebar.offsetWidth * 100 * p.duration() / 100 );
          //timeTooltip.style.left = position + "px";
          setTimeTooltip();
        };
/*
        timeToolTipMouseMove = function( e ) {
          position = e.clientX - timebar.getBoundingClientRect().left;
          timeTooltip.style.left = position + "px";
          setTimeTooltip();
        }
*/
        timeMouseUp = function( e ) {
          if ( e.button !== 0 ) {
            return;
          }

          e.preventDefault();
          seeking = false;
          if ( !active ) {
            deactivate();
          }
          if ( playStateCache ) {
            p.play();
          }
          window.removeEventListener( "mouseup", timeMouseUp, false );
          window.removeEventListener( "mousemove", timeMouseMove, false );
          p.emit("updateToc");
          setPlayingTocBar();
        };

        timeMouseDown = function( e ) {
          if ( e.button !== 0 ) {
            return;
          }

          position = e.clientX - timebar.getBoundingClientRect().left;

          e.preventDefault();
          seeking = true;
          playStateCache = !p.paused();
          p.pause();
          window.addEventListener( "mouseup", timeMouseUp, false );
          window.addEventListener( "mousemove", timeMouseMove, false );

          if ( progressBar ) {
            progressBar.style.width = ( position / timebar.offsetWidth * 100 ) + "%";
          }

          if ( scrubber ) {
            scrubber.style.left = ( ( position - ( scrubber.offsetWidth / 2 ) ) / timebar.offsetWidth * 100 ) + "%";
          }

          p.currentTime( position / timebar.offsetWidth * p.duration() );
          p.emit("updateToc");
          setPlayingTocBar();
        };

        function onTimelineMouseMove( e ) {
          position = e.clientX - timebar.getBoundingClientRect().left;

          if ( position < 0 ) {
            position = 0;
          } else if ( position > _container.offsetWidth ) {
            position = _container.offsetWidth;
          }

          timeTooltip.style.left = position + "px";
          setTimeTooltip();
        }

        /*function setTimeTooltip() {
          //timeTooltip.innerHTML = Time.toTimecode( p.currentTime(), 0 );
          timeTooltip.innerHTML = Time.toTimecode( position / timebar.offsetWidth * _media.duration, 0 );
        }*/

        timeMouseOver = function( e ) {
          onTimelineMouseMove( e );
          timeTooltip.classList.add( "tooltip-no-transition-on" );

          timebar.addEventListener( "mousemove", onTimelineMouseMove, false );
          timebar.removeEventListener( "mouseover", timeMouseOver, false );
          timebar.addEventListener( "mouseout", timeMouseOut, false );
        }

        timeMouseOut = function( e ) {
          timeTooltip.classList.remove( "tooltip-no-transition-on" );

          timebar.removeEventListener( "mousemove", onTimelineMouseMove, false );
          timebar.removeEventListener( "mouseout", timeMouseOut, false );
          timebar.addEventListener( "mouseover", timeMouseOver, false );

          toggleCurrentTocBars(false);
        }

        timebar.addEventListener( "mouseover", timeMouseOver, false );
        timebar.addEventListener( "mousedown", timeMouseDown, false );


        p.on( "timeupdate", function() {

          var time = p.currentTime(),
              width = ( time / p.duration() * 100 * timebar.offsetWidth / 100 );

          if ( progressBar ) {

            progressBar.style.width = ( width / timebar.offsetWidth * 100 ) + "%";
          }

          if ( scrubber ) {

            scrubber.style.left = ( ( width - ( scrubber.offsetWidth / 2 ) ) / timebar.offsetWidth * 100 ) + "%";
          }

          if ( currentTimeDialog ) {

            currentTimeDialog.innerHTML = Time.toTimecode( time, 0 );
          }
        });
      }
    };

    _container.appendChild( _controls );

    // If we're not autoPlay, wait for user interaction before we're ready.
    if ( !options.preload ) {
      document.addEventListener( "click", onInit, false );
    } else {
      onInit();
    }

    if ( !_container ) {

      return;
    }

    return _container;
  }

  return {
    create: Controls
  };
});
