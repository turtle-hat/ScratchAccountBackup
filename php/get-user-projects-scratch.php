<?php
	$username = "turtlehat"; // the default project to search for
    $limit = "40"; // the default amount of projects to display at once
    $offset = "0"; // the default amount to offset the search

    // if there is ?project, grab the value
    if(array_key_exists('username', $_GET) && strlen($project)){
        $project = $_GET['username'];
        // encode spaces in the parameters as +
        $project = str_replace(' ', '+', $project);
    }
    // if there is ?limit, grab the value
    if(array_key_exists('limit', $_GET) && strlen($limit)){
        $limit = $_GET['limit'];
        // encode spaces in the parameters as +
        $limit = str_replace(' ', '+', $limit);
    }
    // if there is ?offset, grab the value
    if(array_key_exists('offset', $_GET) && strlen($offset)){
        $offset = $_GET['offset'];
        // encode spaces in the parameters as +
        $offset = str_replace(' ', '+', $offset);
    }

    // build URL to request from
	$URL = "https://api.scratch.mit.edu/users/$username";
	//$URL = "https://api.scratch.mit.edu/users/$username/projects?limit=$limit&offset=$offset";
	header('content-type:application/json');      // tell the requestor that this is JSON
	header("Access-Control-Allow-Origin: *");     // turn on CORS
	echo file_get_contents($URL);
?>