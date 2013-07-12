/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define( [ "text!dialog/dialogs/tutorial-add-media-added.html", "dialog/dialog", "util/lang" ],
  function( LAYOUT_SRC, Dialog, LangUtils ) {
    Dialog.register( "tutorial-add-media-added", LAYOUT_SRC, function ( dialog ) {
      dialog.assignEscapeKey( "default-close" );
    });
});