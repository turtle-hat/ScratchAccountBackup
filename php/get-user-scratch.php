<?php
	$username = "turtlehat"; // the default username to search for

    // if there is ?username, grab the value
    if(array_key_exists('username', $_GET) && strlen($username)){
        $username = $_GET['username'];
        // encode spaces in the parameters as +
        $username = str_replace(' ', '+', $username);
    }

    // build URL to request from
	$URL = "https://api.scratch.mit.edu/users/$username";
	header('content-type:application/json');      // tell the requestor that this is JSON
	header("Access-Control-Allow-Origin: *");     // turn on CORS
	echo file_get_contents($URL);
?>