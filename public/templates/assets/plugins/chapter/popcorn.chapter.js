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
        position: {
          elem: "select",
          options: [ "Custom", "Middle", "Bottom", "Top" ],
          values: [ "custom", "middle", "bottom", "top" ],
          label: "Text Position",
          "default": "top"
        },
        alignment: {
          elem: "select",
          options: [ "Center", "Left", "Right" ],
          values: [ "center", "left", "right" ],
          label: "Text Alignment",
          "default": "left"
        },
        transition: {
          elem: "select",
          options: [ "None", "Pop", "Fade", "Slide Up", "Slide Down" ],
          values: [ "popcorn-none", "popcorn-pop", "popcorn-fade", "popcorn-slide-up", "popcorn-slide-down" ],
          label: "Transition",
          "default": "popcorn-fade"
        },
        fontFamily: {
          elem: "select",
          label: "Font",
          styleClass: "",
          googleFonts: true,
          group: "advanced",
          "default": "Open Sans"
        },
        fontSize: {
          elem: "input",
          type: "number",
          label: "Font Size",
          "default": 6,
          units: "%",
          group: "advanced"
        },
        fontColor: {
          elem: "input",
          type: "color",
          label: "Font colour",
          "default": DEFAULT_FONT_COLOR,
          group: "advanced"
        },
        shadow: {
          elem: "input",
          type: "checkbox",
          label: "Shadow",
          "default": false,
          group: "advanced"
        },
        shadowColor: {
          elem: "input",
          type: "color",
          label: "Shadow colour",
          "default": DEFAULT_SHADOW_COLOR,
          group: "advanced"
        },
        background: {
          elem: "input",
          type: "checkbox",
          label: "Background",
          "default": false,
          group: "advanced"
        },
        backgroundColor: {
          elem: "input",
          type: "color",
          label: "Background colour",
          "default": DEFAULT_BACKGROUND_COLOR,
          group: "advanced"
        },
        fontDecorations: {
          elem: "checkbox-group",
          labels: { bold: "Bold", italics: "Italics" },
          "default": { bold: false, italics: false },
          group: "advanced"
        },
        left: {
          elem: "input",
          type: "number",
          label: "Left",
          units: "%",
          "default": 25,
          hidden: true
        },
        top: {
          elem: "input",
          type: "number",
          label: "Top",
          units: "%",
          "default": 0,
          hidden: true
        },
        width: {
          elem: "input",
          type: "number",
          units: "%",
          label: "Width",
          "default": 50,
          hidden: true
        },
        zindex: {
          hidden: true
        }
      }
    },

    _setup: function( options ) {
      var target,
          text = newlineToBreak( options.text ),
          container = options._container = document.createElement( "div" ),
          innerContainer = document.createElement( "div" ),
          innerSpan = document.createElement( "span" ),
          innerDiv = document.createElement( "div" ),
          fontSheet,
          fontDecorations = options.fontDecorations || options._natives.manifest.options.fontDecorations[ "default" ],
          position = options.position || options._natives.manifest.options.position[ "default" ],
          alignment = options.alignment,
          transition = options.transition || options._natives.manifest.options.transition[ "default" ],
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
      container.style.position = "absolute";
      container.classList.add( "popcorn-text" );

      // backwards comp
      if ( "center left right".match( position ) ) {
        alignment = position;
        position = "middle";
      }

      // innerDiv inside innerSpan is to allow zindex from layers to work properly.
      // if you mess with this code, make sure to check for zindex issues.
      innerSpan.appendChild( innerDiv );
      innerContainer.appendChild( innerSpan );
      container.appendChild( innerContainer );
      target.appendChild( container );

      // Add transition class
      // There is a special case where popup has to be added to the innerDiv, not the outer container.
      options._transitionContainer = ( position !== "custom" && ( transition === "popcorn-pop" || "popcorn-fade" ) ) ? innerDiv : container;

      options._transitionContainer.classList.add( transition );
      options._transitionContainer.classList.add( "off" );

      // Handle all custom fonts/styling

      options.fontColor = options.fontColor || DEFAULT_FONT_COLOR;
      innerContainer.classList.add( "text-inner-div" );
      innerContainer.style.color = options.fontColor;
      innerContainer.style.fontStyle = fontDecorations.italics ? "italic" : "normal";
      innerContainer.style.fontWeight = fontDecorations.bold ? "bold" : "normal";

     if ( options.background ) {
        innerDiv.style.backgroundColor = backgroundColor;
      }
      if ( options.shadow ) {
        innerDiv.style.textShadow = "0 1px 5px " + shadowColor + ", 0 1px 10px " + shadowColor;
      }

      // Escape HTML text if requested
      text = !!options.escape ? escapeHTML( options.text ) : options.text;

      // Swap newline for <br> if requested
      text = !!options.multiline ? newlineToBreak ( text ) : text;

      fontSheet = document.createElement( "link" );
      fontSheet.rel = "stylesheet";
      fontSheet.type = "text/css";
      options.fontFamily = options.fontFamily ? options.fontFamily : options._natives.manifest.options.fontFamily[ "default" ];
      // Store reference to generated sheet for removal later, remove any existing ones
      options._fontSheet = fontSheet;
      document.head.appendChild( fontSheet );

      fontSheet.onload = function () {
        innerContainer.style.fontFamily = options.fontFamily;
        innerContainer.style.fontSize = options.fontSize + "%";
        if ( position === "custom" ) {
          container.classList.add( "text-custom" );
          innerContainer.classList.add( alignment );
          container.style.left = options.left + "%";
          container.style.top = options.top + "%";
          if ( options.width ) {
            container.style.width = options.width + "%";
          }
          container.style.zIndex = +options.zindex;
        }
        else {
          container.classList.add( "text-fixed" );
          innerContainer.classList.add( position );
          innerContainer.classList.add( alignment );
          innerDiv.style.zIndex = +options.zindex;
        }

        if ( linkUrl ) {

          if ( !linkUrl.match( /^http(|s):\/\// ) ) {
            linkUrl = "//" + linkUrl;
          }

          link = document.createElement( "a" );
          link.href = linkUrl;
          link.target = "_blank";
          link.innerHTML = text;

          link.addEventListener( "click", function() {
            context.media.pause();
          }, false );

          link.style.color = innerContainer.style.color;

          innerDiv.appendChild( link );
        } else {
          innerDiv.innerHTML = text;
        }
      };
      fontSheet.href = "//fonts.googleapis.com/css?family=" + options.fontFamily.replace( /\s/g, "+" ) + ":400,700";

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
