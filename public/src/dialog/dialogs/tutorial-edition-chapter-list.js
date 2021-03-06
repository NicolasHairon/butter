/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define( [ "text!dialog/dialogs/tutorial-edition-chapter-list.html", "dialog/dialog", "util/lang" ],
  function( LAYOUT_SRC, Dialog, LangUtils ) {
    Dialog.register( "tutorial-edition-chapter-list", LAYOUT_SRC, function ( dialog ) {
      dialog.assignEscapeKey( "default-close" );
    });
});