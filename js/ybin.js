/*
 *  ybin 0.3 
 *
 *  Copyright (C) 2015 - Andrej Budinčević <andrew@hotmail.rs>
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *  You should have received a copy of the GNU General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 */

/*
 * Based on ZeroBin
 *
 * @link http://sebsauvage.net/wiki/doku.php?id=php:zerobin
 * @author sebsauvage
 */

var shown = false;
var aShown = false;

// Immediately start random number generator collector.
sjcl.random.startCollectors();

/**
 * Compress a message (deflate compression). Returns base64 encoded data.
 *
 * @param string message
 * @return base64 string data
 */
function compress(message) {
	return Base64.toBase64(RawDeflate.deflate(Base64.utob(message)));
}

/**
 * Decompress a message compressed with compress().
 */
function decompress(data) {
	return Base64.btou(RawDeflate.inflate(Base64.fromBase64(data)));
}

/**
 * Compress, then encrypt message with key.
 *
 * @param string key
 * @param string message
 * @return encrypted string data
 */
function zeroCipher(key, message) {
	return sjcl.encrypt(key,compress(message));
}

/**
 *  Decrypt message with key, then decompress.
 *
 *  @param key
 *  @param encrypted string data
 *  @return string readable message
 */
function zeroDecipher(key, data) {
	return decompress(sjcl.decrypt(key,data));
}

/**
 * @return the current script location (without search or hash part of the URL).
 *   eg. http://server.com/zero/?aaaa#bbbb --> http://server.com/zero/
 */
function scriptLocation() {
  return "https://ybin.me/";
}

/**
 * @return the paste unique identifier from the URL
 *   eg. 'c05354954c49a487'
 */
function pasteID() {
	return window.location.pathname.substring(3);
}

/**
 * Show decrypted text in the display area, including discussion (if open)
 *
 * @param string key: decryption key
 * @param array cipher: array of messages to display (items = array with keys ('data','meta')
 */
function decryptPaste(key, cipher) {
	try { 
		var cleartext = zeroDecipher(key, cipher[0].data);
	} catch(err) {
		showError("Wrong key.");
		return;
	}

	$('#paste').text(cleartext)
}

/**
 *  Save a new paste
 */
function save() {
	// Do not send if no data.
	if ($('#paste').val().length == 0) {
		showStatus("Paste can\'t be <span class=\"accent\">empty</span>.", 3000)
		return;
	}

	// If sjcl has not collected enough entropy yet, display a message.
	if (!sjcl.random.isReady()) {
		showStatus('We need more <span class="accent">entropy</span>. Please move your mouse a lil\' bit more.', 2000);
		sjcl.random.addEventListener('seeded', function(){ save(); }); 
		return; 
	}
	
	showStatus('Saving paste...');

	var randomkey = sjcl.codec.base64.fromBits(sjcl.random.randomWords(8, 0), 0);
	var cipherdata = zeroCipher(randomkey, $('#paste').val());

	var data_to_send = { data: cipherdata };
	$.post("/save.php", data_to_send, 'json')
	.error(function() {
		showError('Server not responding. Try again.', 4000);
	})
	.success(function(data) {
		if (data.status == 0) {
			window.location.href = scriptLocation() + "p/" + data.id + '#' + randomkey;
		}
		else if (data.status==1) {
			showError('Error saving paste: <span class="accent">' + data.message + '</span>');
		}
		else {
			showError('Error saving paste.');
		}
	});
}

/** 
 * Return raw text
 */
function rawText() {
	var paste = $('#paste').html();
	var newDoc = document.open('text/html', 'replace');

	newDoc.write('<pre>'+paste+'</pre>');
	newDoc.close();
}

/**
 * Create a new paste.
 */
function newPaste() {
	$("#paste").val("");

	$('.nano').nanoScroller();

	$("#save").removeClass("disabled");
	$("#raw").addClass("disabled");
	$("#copy").addClass("disabled");
	$("#fork").addClass("disabled");

	$("#header .status").html("");

	$("#paste").attr('disabled', false).attr('readonly', false).focus();
}

/**
 * Fork the current paste.
 */
function fork() {
	$("#save").removeClass("disabled");
	$("#raw").addClass("disabled");
	$("#copy").addClass("disabled");
	$("#fork").addClass("disabled");

	$("#header .status").html("");

	$("#paste").attr('disabled', false).focus();
}

/**
 * Copy paste URL to clipboard.
 */
function copyToClipboard() {
	window.prompt("Copy to clipboard: Ctrl+C, Enter", window.location.href);
}

/**
 * Display an error message
 * @param string message: error to display
 */
function showError(message) {
	$("#header .status").html("<span class=\"accent\"></span> " + message);
}

/**
 * Display status
 *
 * @param string message: text to display
 * @param integer timeout (optional): timeout time for the message.
 */
function showStatus(message, timeout) {
	$("#header .status").html(message).hide().fadeIn("slow");
	
	if(timeout != undefined && timeout != 0)
		setTimeout(function(){ 
			$("#header .status").fadeOut("slow"); 
		}, timeout);
}

function showAbout() {
	if(!aShown)
		$("#about").show();
	else 
		$("#about").hide();

	aShown = !aShown;
}

/**
 * Display info popup
 *
 * @param string message: text to display
 * @param string shortcut: keyboard shortcut
 */
function showInfo(message, shortcut) {
	if(!shown) {
		$("#info").html(message + "<br /><span class=\"accent\">" + shortcut + "</span>");
		$("#info").show();
	} else {
		$("#info").html("");
		$("#info").hide();
	}

	shown = !shown;
}

/**
 * Return the deciphering key stored in anchor part of the URL
 */
 function pageKey() {
	var key = window.location.hash.substring(1);  // Get key

	// First, strip everything after the equal sign (=) which signals end of base64 string.
	i = key.indexOf('='); 
	if(i>-1)
		key = key.substring(0, i+1); 

	// If the equal sign was not present, some parameters may remain:
	i = key.indexOf('&'); 
	if(i>-1) 
		key = key.substring(0, i); 

	// Then add trailing equal sign if it's missing
	if(key.charAt(key.length-1)!=='=')
		key+='=';

	return key;
}

/**
 * Return status of a given button
 * 
 * @param string name: id of the button
 */
function isActive(name) {
	return !$("#" + name).hasClass("disabled");
}

$(function() {
	$("#new").click(function(){if(isActive("new")) newPaste()});
	$("#save").click(function(){if(isActive("save")) save()});
	$("#raw").click(function(){if(isActive("raw")) rawText()});
	$("#fork").click(function(){if(isActive("fork")) fork()});
	$("#copy").click(function(){if(isActive("copy")) copyToClipboard()});

	$("#new").hover(function(){showInfo("New paste", "ctrl+p")});
	$("#save").hover(function(){showInfo("Save paste", "ctrl+s")});
	$("#raw").hover(function(){showInfo("View raw data", "ctrl+shift+r")});
	$("#fork").hover(function(){showInfo("Fork current paste", "ctrl+e")});
	$("#copy").hover(function(){showInfo("Copy link to clipboard", "ctrl+shift+c")});

	$(".logo").hover(function(){showAbout()});

	Mousetrap.bindGlobal('mod+p', function(e){if(isActive("new")) newPaste(); return false;});
	Mousetrap.bindGlobal('mod+s', function(e){if(isActive("save")) save(); return false;});
	Mousetrap.bindGlobal('mod+shift+r', function(e){if(isActive("raw")) rawText(); return false;});
	Mousetrap.bindGlobal('mod+e', function(e){if(isActive("fork")) fork(); return false;});
	Mousetrap.bindGlobal('mod+shift+c', function(e){if(isActive("copy")) copyToClipboard(); return false;});

	if($('div#cipher').text().length > 1) {
		if (window.location.hash.length == 0) {
			showError("Missing encryption key in URL.");
			return;
		}

		var cipher = jQuery.parseJSON($('div#cipher').text());

		decryptPaste(pageKey(), cipher);
	} else if ($('div#errormessage').text().length>1) 
		showError($('div#errormessage').text());
	else 
		newPaste();

	$(".nano").nanoScroller({ alwaysVisible: false });
	
});
