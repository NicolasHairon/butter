/*! This Source Code Form is subject to the terms of the MIT license
 *  If a copy of the MIT license was not distributed with this file, you can
 *  obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

function init() {

  var stateClasses = [
    "embed-playing",
    "embed-paused",
    "embed-dialog-open"
  ];

  // Sometimes we want to show the info div when we pause, sometimes
  // we don't (e.g., when we open the share dialog).
  var hideInfoDiv = false;

  var tocItems = [];

  /**
   * embed.js is a separate, top-level entry point into the requirejs
   * structure of src/.  We use it in order to cherry-pick modules from
   * Butter as part of our embed scripts.  The embed.js file is meant
   * to be used on its own, without butter.js, and vice versa.  See
   * tools/embed.js and tools/embed.optimized.js, and the `make embed`
   * target for more info.
   */

  function $( id ) {
    if ( typeof id !== "string" ) {
      return id;
    }
    return document.querySelector( id );
  }

  function reconstituteHTML( s ) {
    return s.replace( /&#34;/g, '"' )
            .replace( /&#39;/g, "'" )
            .replace( /&quot;/g, '"' )
            .replace( /&apos;/g, "'" )
            .replace( /&lt;/g, '<' )
            .replace( /&gt;/g, '>' )
            .replace( /&amp;/g, '&' );
  }

  function show( elem ) {
    elem = $( elem );
    if ( !elem ) {
      return;
    }
    elem.style.display = "block";
  }

  function requestFullscreen( elem ) {
    if ( elem.requestFullscreen ) {
      elem.requestFullscreen();
    } else if ( elem.mozRequestFullscreen ) {
      elem.mozRequestFullscreen();
    } else if ( elem.mozRequestFullScreen ) {
      elem.mozRequestFullScreen();
    } else if ( elem.webkitRequestFullscreen ) {
      elem.webkitRequestFullscreen();
    }
  }

  function isFullscreen() {
    return !((document.fullScreenElement && document.fullScreenElement !== null) ||
            (!document.mozFullScreen && !document.webkitIsFullScreen));
  }

  function cancelFullscreen() {
    if ( document.exitFullScreen ) {
      document.exitFullScreen();
    } else if ( document.mozCancelFullScreen ) {
      document.mozCancelFullScreen();
    } else if ( document.webkitCancelFullScreen ) {
      document.webkitCancelFullScreen();
    }
  }

  function hide( elem ) {
    elem = $( elem );
    if ( !elem ) {
      return;
    }
    elem.style.display = "none";
  }

  function shareClick( popcorn ) {
    if ( !popcorn.paused() ) {
      hideInfoDiv = true;
      popcorn.pause();
    }

    setStateClass( "embed-dialog-open" );
    hide( "#controls-big-play-button" );
    clearStateClass();
    show( "#share-container" );
  }

  function remixClick() {
    window.open( $( "#remix-post" ).href, "_blank" );
  }

  function fullscreenClick() {
    var container = document.getElementById( "container" );
    if( !isFullscreen() ) {
      requestFullscreen( container );
    } else {
      cancelFullscreen();
    }
  }

  function setupClickHandlers( popcorn, config ) {
    function replay() {
      popcorn.play( config.start );
    }

    $( "#replay-post" ).addEventListener( "click", replay, false );
    $( "#replay-share" ).addEventListener( "click", replay, false );
    $( "#share-post" ).addEventListener( "click", function() {
      shareClick( popcorn );
    }, false );
  }

  function buildIFrameHTML() {
    var src = window.location,
      // Sizes are strings: "200x400"
      shareSize = $( ".size-options .current .dimensions" ).textContent.split( "x" ),
      width = shareSize[ 0 ],
      height = shareSize[ 1 ];

    return '<iframe src="' + src + '" width="' + width + '" height="' + height +
           '" frameborder="0" mozallowfullscreen webkitallowfullscreen allowfullscreen></iframe>';
  }

  // We put the embed's cannoncial URL in a <link rel="cannoncial" href="...">
  function getCanonicalURL() {
    var links = document.querySelectorAll( "link" ),
        link;

    for ( var i = 0; i < links.length; i++ ) {
      link = links[ i ];
      if ( link.rel === "canonical" ) {
        return link.href;
      }
    }
    // Should never happen, but for lint...
    return "";
  }

  // indicate which state the post roll is in
  function setStateClass( state ) {
    var el = $( "#post-roll-container" );

    if ( el.classList.contains( state ) ) {
      return;
    }

    clearStateClass( el );

    el.classList.add( state );
  }

  // clear the state class indicator for the post roll container
  function clearStateClass( el ) {
    el = el || $( "#post-roll-container" );

    for ( var i = 0; i < stateClasses.length; i++ ) {
      el.classList.remove( stateClasses[ i ] );
    }
  }

  function setupEventHandlers( popcorn, config ) {
    var sizeOptions = document.querySelectorAll( ".option" ),
        i, l;

    $( "#share-close" ).addEventListener( "click", function() {
      hide( "#share-container" );

      // If the video is done, go back to the postroll
      if ( popcorn.ended() ) {
        setStateClass( "embed-dialog-open" );
      }
    }, false );

    function sizeOptionFn( e ) {
      e.preventDefault();
      $( ".size-options .current" ).classList.remove( "current" );
      this.classList.add( "current" );
      $( "#share-iframe" ).value = buildIFrameHTML();
    }

    for ( i = 0, l = sizeOptions.length; i < l; i++ ) {
      sizeOptions[ i ].addEventListener( "click", sizeOptionFn, false );
    }

    popcorn.on( "ended", function() {
      setStateClass( "embed-dialog-open" );
    });

    popcorn.on( "pause", function() {
      if ( hideInfoDiv ) {
        setStateClass( "embed-dialog-open" );
        hideInfoDiv = false;
      } else {
        setStateClass( "embed-paused" );
      }
    });

    popcorn.on( "playing", function() {
      hide( "#share-container" );
      hide( "#controls-big-play-button" );
      setStateClass( "embed-playing" );
    });

    function onCanPlay() {
      if ( config.autoplay ) {
        popcorn.play();
      }
    }
    popcorn.on( "canplay", onCanPlay );

    // See if Popcorn was ready before we got setup
    if ( popcorn.readyState() >= 3 && config.autoplay ) {
      popcorn.off( "canplay", onCanPlay );
      popcorn.play();
    }
  }

  /*function onTocClick(){
  _toggler = new Toggler( document.getElementById( "controls-toc" ),
    function() {
      var newState = !_container.classList.contains( "minimized" );

      var onTransitionEnd = function(){
        LangUtils.removeTransitionEndListener( _container, onTransitionEnd );
        //_this.dispatch( "editortoggled", newState );
      };

      _toggler.state = newState;
      if ( newState ) {
        document.body.classList.remove( "editor-open" );
        _container.classList.add( "minimized" );
      }
      else {
        document.body.classList.add( "editor-open" );
        _container.classList.remove( "minimized" );
      }

      LangUtils.applyTransitionEndListener( _container, onTransitionEnd );

    }, "Show/Hide Editor", true );
  }*/

  function setupAttribution( popcorn ) {
    var //icon = $( ".media-icon" ),
        src = $( ".attribution-media-src" ),
        toggler = $( ".attribution-logo" ),
        //closeBtn = $( ".attribution-close" ),
        container = $( ".attribution-info" ),
        extraContent = $( ".attribution-content" ),
        classes = {
          html5: "html5-icon",
          youtube: "youtube-icon",
          vimeo: "vimeo-icon",
          soundcloud: "soundcloud-icon",
          baseplayer: "html5-icon"
        },
        youtubeRegex = /(?:http:\/\/www\.|http:\/\/|www\.|\.|^)youtu/,
        type,
        jsonToc = popcorn.data.running.toc[0].jsonml,
        htmlToc = JsonML.toHTML( jsonToc );

    type = popcorn.media._util ? popcorn.media._util.type.toLowerCase() : "html5";

    extraContent.appendChild( htmlToc );

    var tocLinks = htmlToc.querySelectorAll(".toc-item-link");

    function updateCurrentTocItem() {
      var currentLinks = htmlToc.querySelectorAll(".current-toc-item");
      if( currentLinks ) {
        jQuery.each( currentLinks, function() {
          this.classList.remove("current-toc-item");
        });
      }

      var newLinks = [];
      for (var j = 0; j < tocItems.length; j++) {
        var item = tocItems[j],
          currentTime = context.currentTime();
        if( currentTime >= item.start && currentTime < item.end ) {
          item.link.classList.add("current-toc-item");
          newLinks.push( item.link );
        }
      }
    }

    // Build toc items data list.
    // Used to switch from one par to another. 
    for( var i = 0; i < tocLinks.length; i++) {
      var tocLink = tocLinks[ i ];
      tocLink.innerHTML = reconstituteHTML( tocLink.innerHTML );

      var end = tocLink.getAttribute('data-end'),
        start = tocLink.getAttribute('data-start'),
        level = tocLink.getAttribute('data-level'),
        tocItem = {};

      // Set data. Usefull to display tooltips of current chapter.
      tocItem.end = parseFloat( end );
      tocItem.start = parseFloat( start );
      tocItem.level = parseFloat( level );
      tocItem.link = tocLink;

      tocItems.push(tocItem);

      context.cue( tocItem.start, updateCurrentTocItem);

      tocLink.onclick = function(e) {
        e.preventDefault();
        var start = e.target.getAttribute("data-start");
        if( context.paused() ) {
          context.pause( start );
        }
        else {
          context.play( start );
        }
      }
    }

    // Set as global var of the popcorn instance to get it in controls.js
    popcorn.data.running.toc[0].tocItems = tocItems;

    // Build toc labels list.
    // Used for tooltips in the player timeline.

    var tocStarts = [];

    var tocTooltips = [],
      h1Count = 0;

    jQuery( htmlToc ).find(".toc-item-link[data-level='3']").each(function() {
      tocStarts.push( this.getAttribute("data-start") );
    });

    function addTooltip( start, end, h1Count, titles ) {
      var tocTooltip = {};
      tocTooltip.start = parseFloat( start );
      tocTooltip.end = parseFloat( end );
      tocTooltip.h1Count = parseFloat( h1Count );
      tocTooltip.titles = titles;
      tocTooltip.tocBars = [];
      tocTooltips.push( tocTooltip );
    }

    jQuery( htmlToc ).find("[data-level='1']").each(function() {
      var h1Chapter = this,
        titles = [],
        tocTooltip = {};

      ++h1Count;

      // If no further child, add a toc tooltip
      if( jQuery( h1Chapter ).parent().children().length == 1 ) {
        titles.push( h1Chapter.innerHTML );
        addTooltip( h1Chapter.getAttribute("data-start"),
          h1Chapter.getAttribute("data-end"),
          h1Count,
          titles );
      }

      jQuery( h1Chapter ).parent().find("[data-level='2']").each(function() {
        var h2Chapter = this;

        // If no further child, add a toc tooltip
        if( jQuery( h2Chapter ).parent().children().length == 1 ) {
          titles.push( h2Chapter.innerHTML );
          addTooltip( h2Chapter.getAttribute("data-start"),
            h2Chapter.getAttribute("data-end"),
            h1Count,
            titles );          
          titles = [];
        }

        jQuery( h2Chapter ).parent().find("[data-level='3']").each(function() {
          var h3Chapter = this;

          titles.push( h1Chapter.innerHTML );
          titles.push( h2Chapter.innerHTML );
          titles.push( h3Chapter.innerHTML );

          addTooltip( h3Chapter.getAttribute("data-start"),
            h3Chapter.getAttribute("data-end"),
            h1Count,
            titles );

          titles = [];
        });
      });
    });

    // Set as global var of the popcorn instance to get it in controls.js
    popcorn.data.running.toc[0].tocTooltips = tocTooltips;

    // First fetch only h3 chapter to get start ime list
    /*for( var i = 0; i < tocStarts.length; i++) {

      var start = tocStarts[i],
        tocTooltip = {},
        tocTitles = [];

      jQuery( htmlToc ).find(".toc-item-link[data-start='"+start+"']").each( function() {
        var level = jQuery(this).attr("data-level");
        if( level == 1 ) {
          ++h1Count;
        }
        tocTitles.push( jQuery(this).html() );
      });

      tocTooltip.start = start;
      tocTooltip.h1Count = h1Count;
      tocTooltip.titles = tocTitles;
      tocTooltips.push( tocTooltip );

    }*/

    /*var tocLabels = [],
      tocLink,
      level;
    for( var i = 0; i < tocLinks.length; i++) {
      var tocLink = tocLinks[ i ],
        level = tocLink.getAttribute('data-level');
    }*/

    // Update toc whenever receives the order to update it
    context.on("updateToc", updateCurrentTocItem);

    // YouTube currently won't have a popcorn.media._util this is a fallback check for YT
    if ( type === "html5" ) {
      type = youtubeRegex.test( src.href ) ? "youtube" : type;
    }

    //icon.classList.add( classes[ type ] );

    toggler.addEventListener( "click", function() {
      container.classList.toggle( "attribution-on" );
      videoContainer = document.querySelectorAll( ".container" )[ 0 ]
      videoContainer.classList.toggle( "reduced-on" );
    }, false );

    /*closeBtn.addEventListener( "click", function() {
      container.classList.toggle( "attribution-on" );
    }, false );*/
  }

  var require = requirejs.config({
    baseUrl: "/src",
    paths: {
      "text": "../external/require/text"
    }
  });

  define("embed-main",
    [
      "util/uri",
      "ui/widget/controls",
      "ui/widget/textbox",
      "popcorn"
    ],
    function( URI, Controls, TextboxWrapper ) {
      /**
       * Expose Butter so we can get version info out of the iframe doc's embed.
       * This "butter" is never meant to live in a page with the full "butter".
       * We warn then remove if this happens.
       **/
      var Butter = {
            version: "Butter-Embed-@VERSION@"
          },
          popcorn,
          config,
          qs = URI.parse( window.location.href ).queryKey,
          container = document.querySelectorAll( ".container" )[ 0 ];

      /**
       * the embed can be configured via the query string:
       *   autohide   = 1{default}|0    automatically hide the controls once playing begins
       *   autoplay   = 1|{default}0    automatically play the video on load
       *   controls   = 1{default}|0    display controls
       *   start      = {integer 0-end} time to start playing (default=0)
       *   end        = {integer 0-end} time to end playing (default={end})
       *   fullscreen = 1{default}|0    whether to allow fullscreen mode (e.g., hide/show button)
       *   loop       = 1|0{default}    whether to loop when hitting the end
       *   showinfo   = 1{default}|0    whether to show video title, author, etc. before playing
       *   preload    = auto{default}|none    whether to preload the video, or wait for user action
       **/
      config = {
        autohide: qs.autohide === "1" ? true : false,
        autoplay: qs.autoplay === "1" ? true : false,
        controls: qs.controls === "0" ? false : true,
        preload: qs.preload !== "none",
        start: qs.start|0,
        end: qs.end|0,
        fullscreen: qs.fullscreen === "0" ? false : (function( document ) {
          // Check for prefixed/unprefixed Fullscreen API support
          if ( "fullScreenElement" in document ) {
            return true;
          }

          var pre = "khtml o ms webkit moz".split( " " ),
              i = pre.length,
              prefix;

          while ( i-- ) {
            prefix = pre[ i ];
            if ( (prefix + "FullscreenElement" ) in document ) {
              return true;
            }
          }
          return false;
        }( document )),
        loop: qs.loop === "1" ? true : false,
        branding: qs.branding === "0" ? false : true,
        showinfo: qs.showinfo === "0" ? false : true
      };

      Controls.create( "controls", {
        onShareClick: function() {
          shareClick( popcorn );
        },
        onRemixClick: function() {
          remixClick( popcorn );
        },
        onFullscreenClick: function() {
          fullscreenClick();
        },
        init: function( setPopcorn ) {
          // cornfield writes out the Popcorn initialization code as popcornDataFn()
          window.popcornDataFn();
          popcorn = Popcorn.byId( "Butter-Generated" );
          setPopcorn( popcorn );
          // Always show controls.  See #2284 and #2298 on supporting
          // options.controls, options.autohide.
          popcorn.controls( true );

          if ( config.loop ) {
            popcorn.loop( true );
          }

          // Either the video is ready, or we need to wait.
          if ( popcorn.readyState() >= 1 ) {
            onLoad();
          } else {
            popcorn.media.addEventListener( "canplay", onLoad );
          }

          if ( config.branding ) {
            setupClickHandlers( popcorn, config );
            setupEventHandlers( popcorn, config );

            // Wrap textboxes so they click-to-highlight and are readonly
            TextboxWrapper.applyTo( $( "#share-url" ), { readOnly: true } );
            TextboxWrapper.applyTo( $( "#share-iframe" ), { readOnly: true } );

            // Write out the iframe HTML necessary to embed this
            $( "#share-iframe" ).value = buildIFrameHTML();

            // Get the page's canonical URL and put in share URL
            $( "#share-url" ).value = getCanonicalURL();
          }

          setupAttribution( popcorn );
        },
        preload: config.preload
      });

      // Setup UI based on config options
      if ( !config.showinfo ) {
        var embedInfo = document.getElementById( "embed-info" );
        embedInfo.parentNode.removeChild( embedInfo );
      }

      // Some config options want the video to be ready before we do anything.
      function onLoad() {
        var start = config.start,
            end = config.end;

        if ( config.fullscreen ) {
          // dispatch an event to let the controls know we want to setup a click listener for the fullscreen button
          popcorn.emit( "butter-fullscreen-allowed", container );
        }

        popcorn.off( "load", onLoad );

        // update the currentTime to the embed options start value
        // this is needed for mobile devices as attempting to listen for `canplay` or similar events
        // that let us know it is safe to update the current time seem to be futile
        function timeupdate() {
          popcorn.currentTime( start );
          popcorn.off( "timeupdate", timeupdate );
        }
        // See if we should start playing at a time other than 0.
        // We combine this logic with autoplay, since you either
        // seek+play or play or neither.
        if ( start > 0 && start < popcorn.duration() ) {
          popcorn.on( "seeked", function onSeeked() {
            popcorn.off( "seeked", onSeeked );
            if ( config.autoplay ) {
              popcorn.play();
            }
          });
          popcorn.on( "timeupdate", timeupdate );
        } else if ( config.autoplay ) {
          popcorn.play();
        }

        // See if we should pause at some time other than duration.
        if ( end > 0 && end > start && end <= popcorn.duration() ) {
          popcorn.cue( end, function() {
            popcorn.pause();
            popcorn.emit( "ended" );
          });
        }
      }

      if ( window.Butter && console && console.warn ) {
        console.warn( "Butter Warning: page already contains Butter, removing." );
        delete window.Butter;
      }
      window.Butter = Butter;
    }
  );

  require(["util/shims"], function() {
    require(["embed-main"]);
  });
}

document.addEventListener( "DOMContentLoaded", function() {
  // Source tree case vs. require-built case.
  if ( typeof require === "undefined" ) {
    var rscript = document.createElement( "script" );
    rscript.onload = function() {
      init();
    };
    rscript.src = "/external/require/require.js";
    document.head.appendChild( rscript );
  } else {
    init();
  }
}, false );
