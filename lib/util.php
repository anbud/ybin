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

// Generate a large random hexadecimal salt.
function generateRandomSalt() {
    $randomSalt='';
    if(function_exists("mcrypt_create_iv"))
        $randomSalt = bin2hex(mcrypt_create_iv(256, MCRYPT_DEV_URANDOM));
    else
        for($i=0;$i<16;$i++)
          $randomSalt.=base_convert(mt_rand(),10,16);

    return $randomSalt;
}

/* Return this ZeroBin server salt.
   This is a random string which is unique to each ZeroBin installation.
   It is automatically created if not present.

   Salt is used:
      - to generate unique VizHash in discussions (which are not reproductible across ZeroBin servers)
      - to generate unique deletion token (which are not re-usable across ZeroBin servers)
*/
function getServerSalt() {
    $saltfile = 'data/salt.php';
    if (!is_file($saltfile))
        file_put_contents($saltfile,'<?php /* |'.generateRandomSalt().'| */ ?>',LOCK_EX);
    $items=explode('|',file_get_contents($saltfile));
    return $items[1];
}

function slow_equals($a, $b) {
    $diff = strlen($a) ^ strlen($b);

    for($i = 0; $i < strlen($a) && $i < strlen($b); $i++) {
        $diff |= ord($a[$i]) ^ ord($b[$i]);
    }

    return $diff === 0;
}


/* Convert paste id to storage path.
   The idea is to creates subdirectories in order to limit the number of files per directory.
   (A high number of files in a single directory can slow things down.)
   eg. "f468483c313401e8" will be stored in "data/f4/68/f468483c313401e8"
   High-trafic websites may want to deepen the directory structure (like Squid does).

   eg. input 'e3570978f9e4aa90' --> output 'data/e3/57/'
*/
function dataid2path($dataid) {
    return 'data/' . substr($dataid, 0, 2) . '/' . substr($dataid, 2, 2) . '/';
}
?>