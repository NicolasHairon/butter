// PLUGIN: text

(function ( Popcorn ) {

  /**
   * chapter Popcorn plug-in
   * Based on popcorn.text.js by @humph
   * @param {Object} options
   *
   * Example:

   **/

  var DEFAULT_FONT_COLOR = "#000000",
      DEFAULT_SHADOW_COLOR = "#444444",
      DEFAULT_BACKGROUND_COLOR = "#888888";

  function newlineToBreak( string ) {
    // Deal with both \r\n and \n
    return string.replace( /\r?\n/gm, "<br>" );
  }

  Popcorn.plugin( "chapter", {

    manifest: {
      about: {
        name: "Popcorn chapter Plugin",
        version: "0.1",
        author: "@k88hudson, @mjschranz"
      },
      options: {
        start: {
          elem: "input",
          type: "number",
          label: "In",
          "units": "seconds"
        },
        end: {
          elem: "input",
          type: "number",
          label: "Out",
          "units": "seconds"
        },
        text: {
          elem: "input",
          type: "text",
          label: "Label",
          "default": "New label"
        },
        level: {
          elem: "input",
          type: "number",
          label: "Level",
          "default": 1
        },
        zindex: {
          hidden: true
        }
      }
    },

    _setup: function( options ) {


      var target,
          text = newlineToBreak( options.text ),
          innerContainer = document.createElement( "div" ),
          innerSpan = document.createElement( "span" ),
          innerDiv = document.createElement( "div" ),
          link,
          linkUrl = options.linkUrl,
          shadowColor = options.shadowColor || DEFAULT_SHADOW_COLOR,
          backgroundColor = options.backgroundColor || DEFAULT_BACKGROUND_COLOR,
          context = this;

      // Get toc target DOM object
      if ( options.target ) {
        // Try to use supplied target
        target = Popcorn.dom.find( options.target );
      }

      // Cache reference to actual target
      options._target = target;

      var $target = $(target),
        $tocEntries,
        $tocLinks,
        $tocLinksByStartLevel,
        $tocLinksByStartText,
        $tocLinksByEndText,
        $tocLinksByLevelText,
        text,
        tocNewLink,
        tocNewLi,
        tocNewOl,
        $tocLiOl;

      // Escape HTML text if requested
      text = !!options.escape ? escapeHTML( options.text ) : options.text;

      // Swap newline for <br> if requested
      text = !!options.multiline ? newlineToBreak ( text ) : text;


      /* FIND OUT IF ENTRY IS ALREADY IN THE TOC LIST */

      // Case of text label change:
      // search for an existing entry with same start date and level
      $tocLinksByStartLevel = $target.find("a[data-start='"+ options.start +"'][data-level='"+ options.level +"']");

      // If the entry already exists, get the existing DOM object
      if( $tocLinksByStartLevel.length > 0 ) {
        tocNewLink = $tocLinksByStartLevel.get(0);
        tocNewLi = tocNewLink.parentNode;
      }

      // Case of level change:
      // search for an existing entry with same start date and text
      $tocLinksByStartText = $target.find("a[data-start='"+ options.start +"']:contains('"+text+"')");

      // If the entry already exists, get the existing DOM object
      if( $tocLinksByStartText.length > 0 ) {
        tocNewLink = $tocLinksByStartText.get(0);
        tocNewLi = tocNewLink.parentNode;
      }

      // Case of level change:
      // search for an existing entry with same end date and text
      $tocLinksByEndText = $target.find("a[data-end='"+ options.end +"']:contains('"+text+"')");

      // If the entry already exists, get the existing DOM object
      if( $tocLinksByEndText.length > 0 ) {
        tocNewLink = $tocLinksByEndText.get(0);
        tocNewLi = tocNewLink.parentNode;
      }

      // Case of start or end date change:
      // search for an existing entry with same level and text
      /*$tocLinksByLevelText = $target.find("a[data-level='"+ options.level +"']:contains('"+text+"')");

      // If the entry already exists, get the existing DOM object
      if( $tocLinksByLevelText.length > 0 ) {
        tocNewLink = $tocLinksByLevelText.get(0);
        tocNewLi = tocNewLink.parentNode;
      }*/

      /* CREATE/UPDATE TOC ENTRY ELEMENT */

      if( !tocNewLi ) {
        // If entry in not yet in the toc,
        // create it
        tocNewLink = document.createElement("a");
        tocNewLink.setAttribute("href","#");

        // Create new toc entry item
        tocNewLi = options._tocNewLi = document.createElement( "li" );
        tocNewLi.appendChild( tocNewLink );
        tocNewLi.style.fontWeight = "normal";
      }
      else {
        // If the entry is already in the toc,
        // remove the entry from the toc DOM,
        // in case it has to be moved (change of date or level)

        //$tocLiOl = $( tocNewLi ).find("ol:first");

        $( tocNewLi ).remove();
      }

      // Set or reset link attributes
      tocNewLink.setAttribute("data-start",options.start);
      tocNewLink.setAttribute("data-end",options.end);
      tocNewLink.setAttribute("data-level",options.level);
      tocNewLink.innerHTML = text || "";

      // Set behavior on click
      tocNewLink.onclick = function() {
        // Navigate to the start point un the video
        Popcorn.instances.forEach( function( video ) {
          video.currentTime( options.start );
        });
      }

      // Set style attributes
      tocNewLi.style.fontWeight = "normal";

      // Cache new entry reference
      options._tocNewLi = tocNewLi;

      /*if( $tocLiOl ) {
        $( tocNewLi  ).append( $tocLiOl );
      }*/

      options.toString = function() {
        // use the default option if it doesn't exist
        return options.text || options._natives.manifest.options.text[ "default" ];
      };
    },

    start: function( event, options ) {
      if ( options._transitionContainer ) {
        options._transitionContainer.classList.add( "on" );
        options._transitionContainer.classList.remove( "off" );
      }
    },

    end: function( event, options ) {
      if ( options._transitionContainer ) {
        options._transitionContainer.classList.add( "off" );
        options._transitionContainer.classList.remove( "on" );
      }
    },

    _teardown: function( options ) {
      if ( options._tocNewLi ) {
        // Remove entry only if no child list is associated
        //if( $( options._tocNewLi ).find("ol").length == 0 ) {
          $( options._tocNewLi ).remove();
        //}
      }

    }
  });
}( window.Popcorn ));
