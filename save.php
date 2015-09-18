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

// Checks if a json string is a proper SJCL encrypted message.
// False if format is incorrect.
function validSJCL($jsonstring) {
	$accepted_keys=array('iv','v','iter','ks','ts','mode','adata','cipher','salt','ct');

	// Make sure content is valid json
	$decoded = json_decode($jsonstring);

	if($decoded==null)
		return false;

	$decoded = (array)$decoded;

	// Make sure required fields are present
	foreach($accepted_keys as $k) {
		if (!array_key_exists($k,$decoded))
			return false; 
	}

	// Make sure some fields are base64 data
	if(base64_decode($decoded['iv'],$strict=true)==null) 
		return false; 
	if(base64_decode($decoded['salt'],$strict=true)==null)  
		return false; 
	if(base64_decode($decoded['cipher'],$strict=true)==null)  
		return false; 

	// Make sure no additionnal keys were added.
	if(count(array_intersect(array_keys($decoded),$accepted_keys))!=10) 
		return false; 

	// Reject data if entropy is too low
	$ct = base64_decode($decoded['ct'], $strict=true);
	if(strlen($ct) > strlen(gzdeflate($ct))) 
		return false;

	// Make sure some fields have a reasonable size.
	if(strlen($decoded['iv'])>24) 
		return false;
	if(strlen($decoded['salt'])>65) 
		return false;


	return true;
}

function limitReached($ip) {
	$tfilename='./data/trafic_limiter.php';

	if(!is_file($tfilename)) {
		file_put_contents($tfilename,"<?php\n\$GLOBALS['trafic_limiter']=array();\n?>", LOCK_EX);
		chmod($tfilename,0705);
	}

	require $tfilename;
	$tl=$GLOBALS['trafic_limiter'];

	if(!empty($tl[$ip]) && ($tl[$ip]+10>=time()))
		return true;
		// FIXME: purge file of expired IPs to keep it small

	$tl[$ip]=time();
	file_put_contents($tfilename, "<?php\n\$GLOBALS['trafic_limiter']=".var_export($tl,true).";\n?>", LOCK_EX);

	return false;
}

if (!empty($_POST['data'])) {// Create new paste/comment{
	/* POST contains:
		 data (mandatory) = json encoded SJCL encrypted text (containing keys: iv,salt,ct)

		 All optional data will go to meta information:
		 expire (optional) = expiration delay (never,5min,10min,1hour,1day,1week,1month,1year,burn) (default:never)
		 syntaxcoloring (optional) = should this paste use syntax coloring when displaying.
	*/

	header('Content-type: application/json');
	$error = false;

	// Create storage directory if it does not exist.
	if(!is_dir('data')) {
		mkdir('data',0705);
		file_put_contents('data/.htaccess',"Allow from none\nDeny from all\n", LOCK_EX);
	}

	// Make sure last paste from the IP address was more than 10 seconds ago.
	if(limitReached($_SERVER['REMOTE_ADDR'])) {
	   echo json_encode(array('status'=>1,'message'=>'Please wait 10 seconds between each post.'));
	   exit;
	}

	// Make sure content is not too big.
	$data = $_POST['data'];

	if(strlen($data) > 2000000) { 
		echo json_encode(array('status'=>1,'message'=>'Paste is too big! File size limit for encrypted data is 2mb.')); 
		exit; 
	}

	// Make sure format is correct.
	if(!validSJCL($data)) { 
		echo json_encode(array('status'=>1,'message'=>'Invalid data.')); 
		exit; 
	}

	// Read additional meta-information.
	$meta=array();	

	if($error) {
		echo json_encode(array('status'=>1,'message'=>'Invalid data.'));
		exit;
	}

	// We just want a small hash to avoid collisions: Half-MD5 (64 bits) will do the trick.
	$dataid = substr(hash('md5',$data),0,16);

	$storage = array('data'=>$data);

	$storagedir = dataid2path($dataid);
	if(!is_dir($storagedir)) 
		mkdir($storagedir,$mode=0705,$recursive=true);

	if(is_file($storagedir.$dataid)) { // Oups... improbable collision.
		echo json_encode(array('status'=>1,'message'=>'Infite improbability drive activated! Try again, please.'));
		exit;
	}
	
	// New paste
	file_put_contents($storagedir.$dataid,json_encode($storage), LOCK_EX);

	// Generate the "delete" token.
	// The token is the hmac of the pasteid signed with the server salt.
	// The paste can be delete by calling http://myserver.com/zerobin/?pasteid=<pasteid>&deletetoken=<deletetoken>
	$deletetoken = hash_hmac('sha1', $dataid, getServerSalt());

	echo json_encode(array('status'=>0,'id'=>$dataid,'deletetoken'=>$deletetoken)); // 0 = no error
	exit;

	echo json_encode(array('status'=>1,'message'=>'Server error.'));
	exit;
} else {
	echo json_encode(array('status'=>1,'message'=>'No data.')); 
}
?>