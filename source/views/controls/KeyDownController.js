import { Class } from '../../core/Core';
import Obj from '../../foundation/Object';
import RunLoop from '../../foundation/RunLoop';
import { isApple } from '../../ua/UA';
import ViewEventsController from '../ViewEventsController';

const KeyDownController = Class({

    Extends: Obj,

    key: isApple ? 'Meta' : 'Ctrl',

    // Delay between trigger key being pressed in becoming visible
    delay: 0,

    init: function () {
        KeyDownController.parent.init.apply( this, arguments );
        ViewEventsController.addEventTarget( this, 100 );
        this._invocationToken = null;
    },

    destroy () {
        this.isUp();
        ViewEventsController.removeEventTarget( this );
        KeyDownController.parent.destroy.call( this );
    },

    isKeyDown: false,

    _activate () {
        this.set( 'isKeyDown', true );
    },

    _cancel () {
        if ( this._invocationToken !== null ) {
            RunLoop.cancel( this._invocationToken );
            this._invocationToken = null;
        }
    },

    isDown () {
        const delay = this.get( 'delay' );
        this._cancel();
        if ( delay ) {
            this._invocationToken =
                RunLoop.invokeAfterDelay( this._activate, delay, this );
        } else {
            this._activate();
        }
        return this;
    },

    isUp () {
        this._cancel();
        return this.set( 'isKeyDown', false );
    },

    isKey ( event ) {
        return event.key === this.get( 'key' );
    },

    keydown: function ( event ) {
        if ( !this.isKey( event ) ) {
            return;
        }
        this.isDown();
    }.on( 'keydown' ),

    keyup: function ( event ) {
        if ( event.type === 'keyup' && !this.isKey( event ) ) {
            return;
        }
        this.isUp();
    }.on( 'keyup', 'blur' ),
});

export default KeyDownController;
