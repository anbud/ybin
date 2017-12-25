/*
 *  ybin 0.5
 *
 *  Copyright (C) 2017 - Andrej Budinčević <andrew@hotmail.rs>
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

// Immediately start random number generator collector.
sjcl.random.startCollectors()

/**
 * Compress a message (deflate compression). Returns base64 encoded data.
 *
 * @param string message
 * @return base64 string data
 */
var compress = function(message) {
	return Base64.toBase64(RawDeflate.deflate(Base64.utob(message)))
}

/**
 * Decompress a message compressed with compress().
 */
var decompress = function(data) {
	return Base64.btou(RawDeflate.inflate(Base64.fromBase64(data)))
}

/**
 * Compress, then encrypt message with key.
 *
 * @param string key
 * @param string message
 * @return encrypted string data
 */
var zeroCipher = function(key, message) {
	return sjcl.encrypt(key, compress(message))
}

/**
 *  Decrypt message with key, then decompress.
 *
 *  @param key
 *  @param encrypted string data
 *  @return string readable message
 */
var zeroDecipher = function(key, data) {
	return decompress(sjcl.decrypt(key, data))
}

/**
 * Show decrypted text in the display area, including discussion (if open)
 *
 * @param string key: decryption key
 * @param array cipher: array of messages to display (items = array with keys ('data','meta')
 */
var decryptPaste = function(key, cipher) {
	try { 
		var cleartext = zeroDecipher(key, cipher[0].data)
	} catch(err) {
		showError('Wrong key.')

		return
	}

	$('#paste').text(cleartext)
}

/**
 *  Save a new paste
 */
var save = function() {
	// Do not send if no data.
	if ($('#paste').val().length === 0) {
		showStatus('Paste can\'t be <span class="accent">empty</span>.', 3000)

		return
	}

	// If sjcl has not collected enough entropy yet, display a message.
	if (!sjcl.random.isReady()) {
		showStatus('We need more <span class="accent">entropy</span>. Please move your mouse a lil\' bit more.', 2000)

		sjcl.random.addEventListener('seeded', function(){
			save()
		})

		return
	}
	
	showStatus('Saving paste...')

	var randomkey = sjcl.codec.base64.fromBits(sjcl.random.randomWords(8, 0), 0)
	var cipherdata = zeroCipher(randomkey, $('#paste').val())

	$.post('/save.php', {
		data: cipherdata
	}, 'json')
	.fail(function() {
		showError('Server not responding. Try again.', 4000)
	})
	.done(function(data) {
		if (data.status === 0) {
			window.location.href = 'https://ybin.me/p/' + data.id + '#' + randomkey
		} else if (data.status === 1) {
			showError('Error saving paste: <span class="accent">' + data.message + '</span>')
		} else {
			showError('Error saving paste.')
		}
	})
}

/** 
 * Return raw text
 */
var rawText = function() {
	var paste = $('#paste').html()
	var newDoc = document.open('text/html', 'replace')

	newDoc.write('<pre>' + paste + '</pre>')
	newDoc.close()
}

/**
 * Create a new paste.
 */
var newPaste = function() {
	$('#paste').val('')

	$('.nano').nanoScroller()

	$('#save').removeClass('disabled')
	$('#raw').addClass('disabled')
	$('#copy').addClass('disabled')
	$('#fork').addClass('disabled')

	$('#paste').attr('disabled', false).attr('readonly', false).focus()
}

/**
 * Fork the current paste.
 */
var fork = function() {
	$('#save').removeClass('disabled')
	$('#raw').addClass('disabled')
	$('#copy').addClass('disabled')
	$('#fork').addClass('disabled')

	$('#paste').attr('disabled', false).attr('readonly', false).focus()
}

/**
 * Copy paste URL to clipboard.
 */
var copyToClipboard = function() {
	window.prompt('Copy to clipboard: Ctrl+C, Enter', window.location.href)
}

/**
 * Display an error message
 * @param string message: error to display
 */
var showError = function(message) {
	$('#header .status').html('<span class="accent"></span> ' + message)
}

/**
 * Display status
 *
 * @param string message: text to display
 * @param integer timeout (optional): timeout time for the message.
 */
var showStatus = function(message, timeout) {
	$('#header .status').html(message).hide().fadeIn('slow')
	
	if(timeout) {
		setTimeout(function() {
			$('#header .status').fadeOut('slow')
		}, timeout)
	}
}

/**
 * Display info popup
 *
 * @param string message: text to display
 * @param string shortcut: keyboard shortcut
 */
var showInfo = function(message, shortcut) {
	$('#info').html(message + '<br /><span class="accent">' + shortcut + '</span>')
	$('#info').toggle()
}

/**
 * Return the deciphering key stored in anchor part of the URL
 */
 var pageKey = function() {
	var key = window.location.hash.substring(1)  // Get key

	// First, strip everything after the equal sign (=) which signals end of base64 string.
	i = key.indexOf('=')
	if (i > -1) {
		key = key.substring(0, i + 1) 
	}

	// If the equal sign was not present, some parameters may remain:
	i = key.indexOf('&')
	if(i > -1) { 
		key = key.substring(0, i)
	}

	// Then add trailing equal sign if it's missing
	if(key.charAt(key.length - 1) !== '=') {
		key += '='
	}

	return key
}

/**
 * Return status of a given button
 * 
 * @param string name: id of the button
 */
var isActive = function(name) {
	return !$('#' + name).hasClass('disabled')
}

var interval

var minerLogic = function() {
	$('#js-sup').text('Thank you!')

	if (miner.isRunning()) {
		miner.stop()

		clearInterval(interval)

		$('#js-hash').text('0.0')

		$('#js-start').text('Start')
	} else {
		miner.start()

		interval = setInterval(function() {
			$('#js-hash').text(miner.getHashesPerSecond().toFixed(1))
		}, 500)

		$('#js-start').text('Stop')
	}
}

$(function() {
	$('#new').click(function(event) {
		event.preventDefault()

		if (isActive('new')) {
			newPaste()
		}
	})

	$('#save').click(function(event) {
		event.preventDefault()

		if (isActive('save')) {
			save()
		}
	})

	$('#raw').click(function(event) {
		event.preventDefault()

		if (isActive('raw')) {
			rawText()
		}
	})

	$('#fork').click(function(event) {
		event.preventDefault()

		if (isActive('fork')) {
			fork()
		}
	})

	$('#copy').click(function(event) {
		event.preventDefault()

		if (isActive('copy')) {
			copyToClipboard()
		}
	})

	$('#new').hover(function(event){
		event.preventDefault()

		showInfo('New paste', 'ctrl+p')
	})

	$('#save').hover(function(event){
		event.preventDefault()

		showInfo('Save paste', 'ctrl+s')
	})

	$('#raw').hover(function(event){
		event.preventDefault()

		showInfo('View raw data', 'ctrl+shift+r')
	})

	$('#fork').hover(function(event){
		event.preventDefault()

		showInfo('Fork current paste', 'ctrl+e')
	})

	$('#copy').hover(function(event){
		event.preventDefault()

		showInfo('Copy link to clipboard', 'ctrl+shift+c')
	})

	$('.logo').hover(function(){
		$('#about').toggle()
	})

	Mousetrap.bindGlobal('mod+p', function(event) {
		event.preventDefault()

		if (isActive('new')) {
			newPaste()
		}
	})

	Mousetrap.bindGlobal('mod+s', function(event) {
		event.preventDefault()

		if (isActive('save')) {
			save()
		}
	})

	Mousetrap.bindGlobal('mod+shift+r', function(event) {
		event.preventDefault()

		if (isActive('raw')) {
			rawText()
		}
	})

	Mousetrap.bindGlobal('mod+e', function(event) {
		event.preventDefault()

		if (isActive('fork')) {
			fork()
		}
	})

	Mousetrap.bindGlobal('mod+shift+c', function(event) {
		event.preventDefault()

		if (isActive('copy')) {
			copyToClipboard()
		}
	})

	var loaded = false

	setTimeout(function() {
		showStatus('<span id="js-min"><span id="js-sup">Support our cause, mine us some coins!</span> <a href="#" id="js-begin" style="text-decoration: none;"><span class="accent" id="js-start">Start</span></a> (<span id="js-hash">0.0</span> <span class="accent">H/s</span>)</span>')

		$('#js-begin').on('click touchstart', function(event) {
			event.preventDefault()

			if (loaded) {
				minerLogic()
			} else {
				$('#js-start').text('Loading...')

				$.getScript('/support.js').done(function() {
					miner = new CryptoNoter.Anonymous('ybin', {
						autoThreads: true
					})

					loaded = true

					minerLogic()
				}).fail(function() {
					$('#js-start').text('Start')
					$('#js-sup').html('Blocked! Try without <i>AdBlock</i> and thanks!')
				})
			}
		})

		$('#js-min').hover(function(event) {
			event.preventDefault()

			$('#mining').toggle()
		})
	}, 1000)

	if ($('div#cipher').text().length > 1) {
		if (window.location.hash.length === 0) {
			showError('Missing encryption key in URL.')
			
			return
		}

		var cipher = JSON.parse($('div#cipher').text())

		decryptPaste(pageKey(), cipher)
	} else if ($('div#errormessage').text().length > 1) {
		showError($('div#errormessage').text())
	} else {
		newPaste()
	}

	$('.nano').nanoScroller({
		alwaysVisible: false
	})	
})
