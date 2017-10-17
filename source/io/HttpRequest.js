/*global location */

import { Class } from '../core/Core';
import '../core/String';  // For String#contains
import Obj from '../foundation/Object';
import RunLoop from '../foundation/RunLoop';
import '../foundation/EventTarget';  // For Function#on
import XHR from './XHR';

/**
    Class: O.HttpRequest

    Extends: O.Object

    The O.HttpRequest class represents an HTTP request. It will automatically
    choose between an XHR and an iframe form submission for uploading form data,
    depending on browser support.
*/

const HttpRequest = Class({

    Extends: Obj,

    /**
        Property: O.HttpRequest#timeout
        Type: Number
        Default: 0

        Time in milliseconds to wait before timing out and aborting the request.
        If the value is 0, the request will not timeout but will wait
        indefinitely to complete.
    */
    timeout: 0,

    /**
        Property: O.HttpRequest#method
        Type: String
        Default: 'GET'

        The HTTP method to use for the request.
    */
    method: 'GET',

    /**
        Property: O.HttpRequest#url
        Type: String
        Default: The current location path (i.e. the URL before the ? or #).

        The URL to submit the request to.
    */
    url: location.pathname,

    /**
        Property: O.HttpRequest#contentType
        Type: String
        Default: 'application/x-www-form-urlencoded'

        The Content-type header for POST requests.
    */
    contentType: 'application/x-www-form-urlencoded',

    /**
        Property: O.HttpRequest#headers
        Type: Object
        Default:
                {Accept: 'application/json, * / *'}

        An object of default headers to be sent with each request (can be
        overriden individually in each request). The format of the object is
        `{headerName: headerValue}`.
    */
    headers: {
        'Accept': 'application/json, */*',
    },

    /**
        Property: O.HttpRequest#withCredentials
        Type: Boolean
        Default: false

        Send cookies with cross-domain requests?
    */
    withCredentials: false,

    /**
        Property: O.HttpRequest#responseType
        Type: String
        Default: ''

        What type should {data} in an {io:success} or {io:failure} event be?
        Refer to {XMLHttpRequest.responseType} for permitted values.
    */
    responseType: '',

    // ---

    init (/* ...mixins */) {
        this._transport = null;
        this._timer = null;
        this._lastActivity = 0;

        this.uploadProgress = 0;
        this.progress = 0;

        this.status = 0;
        this.responseHeaders = {};
        this.response = '';

        HttpRequest.parent.constructor.apply( this, arguments );
    },

    // ---

    setTimeout: function () {
        const timeout = this.get( 'timeout' );
        if ( timeout ) {
            this._lastActivity = Date.now();
            this._timer = RunLoop.invokeAfterDelay(
                this.didTimeout, timeout, this );
        }
    }.on( 'io:begin' ),

    resetTimeout: function () {
        this._lastActivity = Date.now();
    }.on( 'io:uploadProgress', 'io:loading', 'io:progress' ),

    clearTimeout: function () {
        const timer = this._timer;
        if ( timer ) {
            RunLoop.cancel( timer );
        }
    }.on( 'io:end' ),

    didTimeout () {
        this._timer = null;
        const timeout = this.get( 'timeout' );
        const timeSinceLastReset = Date.now() - this._lastActivity;
        const timeToTimeout = timeout - timeSinceLastReset;
        // Allow for 10ms jitter
        if ( timeToTimeout < 10 ) {
            this.fire( 'io:timeout' )
                .abort();
        } else {
            this._timer = RunLoop.invokeAfterDelay(
                this.didTimeout, timeToTimeout, this );
        }
    },

    // ---

    send () {
        const method = this.get( 'method' ).toUpperCase();
        let url = this.get( 'url' );
        let data = this.get( 'data' ) || null;
        const headers = this.get( 'headers' );
        const withCredentials = this.get( 'withCredentials' );
        const responseType = this.get( 'responseType' );
        const transport = new XHR();

        if ( data && method === 'GET' ) {
            url += ( url.contains( '?' ) ? '&' : '?' ) + data;
            data = null;
        }
        const contentType = headers[ 'Content-type' ];
        if ( contentType && method === 'POST' && typeof data === 'string' &&
                contentType.indexOf( ';' ) === -1 ) {
            // All string data is sent as UTF-8 by the browser.
            // This cannot be altered.
            headers[ 'Content-type' ] += ';charset=utf-8';
        }

        // Send the request
        this._transport = transport;
        transport.io = this;
        transport.send( method, url, data, headers, withCredentials,
            responseType );

        return this;
    },

    abort () {
        const transport = this._transport;
        if ( transport && transport.io === this ) {
            transport.abort();
        }
    },

    _releaseXhr: function () {
        const transport = this._transport;
        if ( transport instanceof XHR ) {
            transport.io = null;
            this._transport = null;
        }
    }.on( 'io:success', 'io:failure', 'io:abort' ),

    // ---

    /**
        Event: io:begin

        This event is fired when the request starts.
     */

    /**
        Event: io:abort

        This event is fired if the request is aborted.
    */

    /**
        Event: io:uploadProgress

        This event *may* be fired as data is uploaded, but only if the browser
        supports XHR2.
    */

    /**
        Event: io:loading

        This event is fired when the response body begins to download.
    */

    /**
        Event: io:progress

        This event *may* be fired periodically whilst the response body is
        downloading, but only if the browser supports XHR2.
    */

    /**
        Event: io:success

        This event is fired if the request completes successfully. It includes
        the following properties:

        status  - The HTTP status code of the response.
        headers - The headers of the response.
        data    - The data returned by the response.
    */

    /**
        Event: io:failure

        This event is fired if the request completes unsuccessfully (normally
        determined by the HTTP status code). It includes the following
        properties:

        status  - The HTTP status code of the response.
        headers - The headers of the response.
        data    - The data returned by the response.
    */

    /**
        Event: io:timeout

        This event is fired if the request times out.
    */

    /**
        Event: io:end

        This is the final event to be fired for the request, this will always
        fire no matter if the request was successful, failed or aborted.
    */
});

export default HttpRequest;