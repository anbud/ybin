<?php
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

include("lib/util.php");

if(!empty($_GET['pasteid'])) {
	$showmode = true;
	$pasteid = $_GET['pasteid'];
} else {
	$showmode = false;
}

function processPasteFetch($pasteid) {
	if(preg_match('/\A[a-f\d]{16}\z/', $pasteid)) {  // Is this a valid paste identifier ?
	    $filename = dataid2path($pasteid).$pasteid;
	    if(!is_file($filename)) {// Check that paste exists.
	        return array('','Paste does not exist!','');
	    }
	} else
	    return array('','Invalid data!','');

	// Get the paste itself.
	$paste = json_decode(file_get_contents($filename));

	$messages = array($paste); // The paste itself is the first in the list of encrypted messages.
	    
	$CIPHERDATA = json_encode($messages);

	return array($CIPHERDATA,'','');
}

if($showmode) 
	$pasteObj = processPasteFetch($pasteid);

?>
<html lang="en">
<head>
	<meta charset="utf-8">
	<title>ybin | private paste</title>

	<link rel="stylesheet" type="text/css" href="/css/main.css?version=3">
	<link rel="stylesheet" type="text/css" href="/css/font-awesome.min.css">

	<script src="/js/main.min.js?version=1"></script>

	<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
	<div id="header">
		<div id="info"></div>
		<div id="about">
			ybin is a <span class="accent">private</span> pastebin.
			<br /><br /
			>We do not know what you paste.
			<br />
			All data is <span class="accent">encrypted</span> on our servers and we <span class="accent">never</span> store your key or info.
			<br />
		</div>
		<div class="logo">
			<a href="http://zx.rs/7/ybin---paste-data-privately/" target="_blank"><span class="accent">y</span>bin</a>
		</div>
		<div class="nav">
			<a role="button" class="button fa-file-text fa" id="new"></a>
			<a role="button" class="button fa-floppy-o fa <?php echo (!$showmode ? "" : "disabled"); ?>" id="save"></a>
			<a role="button" class="button fa-pencil fa <?php echo ($showmode ? "" : "disabled"); ?>" id="fork"></a>
			<a role="button" class="button fa-file-code-o fa <?php echo ($showmode ? "" : "disabled"); ?>" id="raw"></a>
			<a role="button" class="button fa-clipboard fa <?php echo ($showmode ? "" : "disabled"); ?>" id="copy"></a>
		</div>
		<div class="status"></div>
		<div id="mining">
			We will <span class="accent">never</span> mine without your permission. Local miner is loaded only if you click on the <span class="accent">Start</span> button, and it's <span class="accent">100% anonymous</span>.
		</div>
	</div>
	<div id="main" class="nano">
		<textarea class="paste nano-content" id="paste" spellcheck="false" <?php echo (!$showmode ? "" : "readonly"); ?>></textarea>
	</div>
	<?php
	if($showmode)
		if($pasteObj[0] == '') 
			echo "<div id=\"errormessage\">" . $pasteObj[1] . "</div>
";
		else
			echo "<div id=\"cipher\">" . $pasteObj[0] . "</div>
";
	?>
</body>
</html>