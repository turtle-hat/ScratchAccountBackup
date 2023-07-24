const SAMPLE_PROJECT = 255565;
const DEFAULT_DOWNLOAD_OPTIONS = {
    date: new Date(),
};
const DEFAULT_LIMIT = 40;
const DEFAULT_OFFSET = 0;
const DEFAULT_PROJECTS_PER_PACKAGE = 50;

// Page elements
let inAccountName;
let btnDownload;
let outLog;
let outDownloads;

// User data retrieved from Scratch API
let username;
let userData;
let favoriteMetadata;
let favoriteIDs;
let followingMetadata;
let followingIDs;
let followerMetadata;
let followerIDs;

// Project data to be downloaded
let projectMetadata;
let projectIDs;
let projectData;

// Application progress tracking
let running;

window.onload = (e) => {
    // Find elements on page
    inAccountName = document.querySelector("#name");
    btnDownload = document.querySelector("#download");
    outLog = document.querySelector("#log");

    // Initialize variables
    running = false;
    userData = {};
    projectMetadata = {};
    projectIDs = [];
    favoriteMetadata = {};
    favoriteIDs = [];
    followingMetadata = {};
    followingIDs = [];
    followerMetadata = {};
    followerIDs = [];
    projectData = {};

    // Add functions to site elements
    btnDownload.onclick = download;
}

// Thanks to Tapas Adhikary for helping me understand Promises with their article!
// https://www.freecodecamp.org/news/javascript-promise-tutorial-how-to-resolve-or-reject-promises-in-js/

async function download() {
    if (!running && inAccountName.value)
    {
        username = inAccountName.value;
        // Prevent from running twice
        running = true;
        btnDownload.disabled = "disabled";
        // Clear projects, metadata, and log
        projectMetadata = {};
        projectIDs = [];
        favoriteMetadata = {};
        favoriteIDs = [];
        followingMetadata = {};
        followingIDs = [];
        followerMetadata = {};
        followerIDs = [];
        projectData = {};
        pageLogClear();

        doAjax(`php/get-user-scratch.php?username=${username}`)
        .then((response) => {
            if (!response) {
                throw("Could not find user data! Did you type your username correctly?");
            }
            userData = response;
            pageLog("Success! User data stored.", username);

            pageLog("Fetching user's projects...", username);
            return fetchUserIterableData(
                "projects",
                projectMetadata,
                projectIDs,
                username,
                "Fetching user's projects...");
        })
        .then((response) => {
            if (!response) {
                throw(`Error fetching project data! ${projectIDs.length} projects successfully fetched.`);
            }
            pageLog(`All ${projectIDs.length} projects fetched successfully!`, username);
            
            pageLog("Fetching user's favorited projects...", username);
            return fetchUserIterableData(
                "favorites",
                favoriteMetadata,
                favoriteIDs,
                username,
                "Fetching user's favorited projects...");
        })
        .then((response) => {
            if (!response) {
                throw(`Error fetching favorited projects! ${favoriteIDs.length} projects successfully fetched.`);
            }
            pageLog(`All ${favoriteIDs.length} favorited projects fetched successfully!`, username);

            pageLog("Fetching users this account is following...", username);
            return fetchUserIterableData(
                "following",
                followingMetadata,
                followingIDs,
                username,
                "Fetching users this account is following...",
                ["id", "username", "scratchteam", "history"]);
        })
        .then((response) => {
            if (!response) {
                throw(`Error fetching users this account is following! ${followingIDs.length} users successfully fetched.`);
            }
            pageLog(`All ${followingIDs.length} users this account is following fetched successfully!`, username);

            pageLog("Fetching followers...", username);
            return fetchUserIterableData(
                "followers",
                followerMetadata,
                followerIDs,
                username,
                "Fetching followers...",
                ["id", "username", "scratchteam", "history"]);
        })
        .then((response) => {
            if (!response) {
                throw(`Error fetching followers! ${followerIDs.length} users successfully fetched.`);
            }
            pageLog(`All ${followerIDs.length} followers fetched successfully!`, username);

            // Recurse through all project IDs and download each one with SBDL

            let downloadOptions = DEFAULT_DOWNLOAD_OPTIONS;

            return fetchProjectsFromMetadata(0, downloadOptions);
        })
        .then((response) => {
            let packageSize = DEFAULT_PROJECTS_PER_PACKAGE;
            return downloadAll(username, packageSize, Math.ceil(projectIDs.length/packageSize));
        })
        .then((response) => {
            pageLog("Done!");
        })
        .catch((errorMessage) => {
            if (errorMessage) {
                pageLog(errorMessage, "ERROR");
            }
        })
        .finally(() => {
            running = false;
            btnDownload.disabled = "";
        });
    }
}

// Code instructions for reading Response from https://developer.mozilla.org/en-US/docs/Web/API/Response
// Performs a fetch request to the specified URL and attempts to parse as JSON
async function doAjax(url) {
    try {
        const request = new Request(
            url,
            { method: 'GET' }
            );
            
        // Credit to my dad for teaching me I need to await both of these functions!
        return await (await fetch(request)).json();
    } catch(e) {
        return null;
    }

    // Fetch API code from https://developer.mozilla.org/en-US/docs/Web/API/fetch#examples
}

// Generic function to iterate over data fetched from the Scratch API
async function fetchUserIterableData(
    endpoint, dataObject, idArray, username, message, allowedKeys = [], limit = 40, offset = 0
    ) {
    // Get AJAX response from requested PHP script
    response = await doAjax(
        `php/get-user-info-scratch.php?endpoint=${endpoint}&username=${username}&limit=${limit}&offset=${offset}`);
    // If the response failed, return false
    if (!response) {
        return false;
    }

    // For all items in response
    for (const item of response)
    {
        // Add it to the object specified, accessed by ID
        // If allowlist is specified, only add allowed keys to dataObject
        if (allowedKeys.length > 0) {
            dataObject[item.id] = {};
            for (let key of allowedKeys) {
                dataObject[item.id][key] = item[key];
            }
        }
        else {
            dataObject[item.id] = item;
        }
        // Add the ID to the array specified
        idArray.push(item.id);
        pageLog(message, username, idArray.length, (offset + response.length), true);
    }
    if (response.length >= limit)
    {
        return fetchUserIterableData(
            endpoint, dataObject, idArray, username, message, allowedKeys, limit, offset + limit
            );
    }
    return true;
}

async function fetchProjectsFromMetadata(projectIndex, downloadOptions, limit = 0) {
    const id = projectIDs[projectIndex];
    pageLog(`Fetching ${projectMetadata[id].title}...`, id, (projectIndex + 1), projectIDs.length);

    response = await fetchProject(id, downloadOptions);
    if (!response) {
        pageLog(`Error occurred fetching ${projectMetadata[id].title}!`, `${id} ERROR`, (projectIndex + 1), projectIDs.length, true);
    }
    else {
        pageLog(`Successfully fetched ${projectMetadata[id].title}.${response.type}!`, id, (projectIndex + 1), projectIDs.length, true);
        projectData[id] = response;
    }

    if (projectIndex + 1 < projectIDs.length && (projectIndex + 1 < limit || limit == 0)) {
        return fetchProjectsFromMetadata(projectIndex + 1, downloadOptions, limit);
    }
    return true;
}

async function fetchProject(id = SAMPLE_PROJECT, downloadOptions = DEFAULT_DOWNLOAD_OPTIONS) {
    // Promise handling code clipped from .sb Downloader documentation
    // https://github.com/forkphorus/sb-downloader#aborting
    // Also referenced MDN page on Using Promises
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
    try {
        return await SBDL.downloadProjectFromID(id, downloadOptions);
    } catch (error) {
        return null;
    }
    
}

// Downloads all project data and metadata in a zip using JSZip
async function downloadAll(label, packageSize, packages, package = 0) {
    pageLog("Zipping up data...", username);

    let zip = new JSZip();

    if (package == 0) {
        zip.file(`${username}.json`, JSON.stringify(userData));
        zip.file(`${username}-favorites.json`, JSON.stringify(favoriteMetadata));
        zip.file(`${username}-following.json`, JSON.stringify(followingMetadata));
        zip.file(`${username}-followers.json`, JSON.stringify(followerMetadata));
    }

    let zipCount = 0;
    let zipLength = projectIDs.length;

    // Zip up the metadata and project file for each project
    for (let j = package * packageSize; j < ((package * packageSize) + packageSize) && j < projectIDs.length; j++)
    {
        let p = projectIDs[j];
        console.log(`Zipping ${p}-${projectData[p].title}.${projectData[p].type}`);
        pageLog(`Zipping ${p}-${projectData[p].title}.${projectData[p].type}...`, p, (j + 1), zipLength, true);
        zip.file(`${p}-${projectData[p].title}.${projectData[p].type}`, projectData[p].arrayBuffer);
        zip.file(`${p}-${projectData[p].title}.json`, JSON.stringify(projectMetadata[p]));
        pageLog(`Zipped ${p}-${projectData[p].title}.${projectData[p].type}!`, p, (j + 1), zipLength, true);
    }

    // Save JSZip with filename, include account name
    const blob = await zip.generateAsync({type:"blob"})

    let filename = label;
    if (packages > 1) {
        filename = `${label}-${package + 1}`;
    }
    saveAs(await blob, `scratch-backup-${filename}.zip`)
    if (packages > 1) {
        pageLog("Download ready!", username, (package + 1), packages);
    }
    else {
        pageLog("Download ready!", username);
    }

    if (package + 1 < packages) {
        return downloadAll(username, packageSize, packages, package + 1);
    }

    return true;
}

// Sends a message to the page for the user to see
function pageLog(message, process = "", step = 0, max = 0, overwrite = false) {
    let logMessage;
    if (overwrite) {
        logMessage = document.querySelector("#log").lastChild;
    }
    else {
        logMessage = document.createElement("p");
    }
    logMessage.innerHTML = `${
        // If process, add it in square brackets
        process ? `[${process}${
            // If also step, add it after a pipe
            step > 0 ? `|${step}${
                // If also max, add it after a slash
                max > 0 ? `/${max}` : ``
            }` : ``
        }] ` : ``
    }${message}`;
    outLog.appendChild(logMessage);
}

// Code obtained from https://www.javascripttutorial.net/dom/manipulating/remove-all-child-nodes/
function pageLogClear() {
    while (outLog.firstChild)
    {
        outLog.removeChild(outLog.firstChild);
    }
    // let logMessages = outLog.querySelectorAll("p");
    // console.log(logMessages);
}
