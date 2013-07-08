/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define( [ "text!dialog/dialogs/tutorial.html", "dialog/dialog", "util/lang" ],
  function( LAYOUT_SRC, Dialog, LangUtils ) {

  	var layout = LangUtils.domFragment( LAYOUT_SRC, ".butter-tutorial-dialog" ),
  		tutorialIntro = LangUtils.domFragment( LAYOUT_SRC, ".tutorial-intro" ),
  		tutorialParts = LangUtils.domFragment( LAYOUT_SRC, ".tutorial-parts" )

  		;


  	layout.querySelector( ".butter-dialog-offset" ).appendChild( tutorialIntro );

    Dialog.register( "tutorial", LAYOUT_SRC, function ( dialog ) {
      dialog.assignEscapeKey( "default-close" );
    });
});
