const SAMPLE_PROJECT = 255565;
const DEFAULT_DOWNLOAD_OPTIONS = {
    date: new Date(),
};
const DEFAULT_LIMIT = 40;
const DEFAULT_OFFSET = 0;

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
        .then((success) => {
            if (!success) {
                throw("Could not find user data! Did you type your username correctly?");
            }
            userData = success;
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
            
            let downloadOptions = DEFAULT_DOWNLOAD_OPTIONS;

            // Recurse through all project IDs and download each one with SBDL
            for (let i = 0; i < projectIDs.length; i++) {
                let id = projectIDs[i];

                // Fetch project data
                fetchProject(id, downloadOptions)
                .then((project) => {
                    if (project) {
                        pageLog(`Project ${projectMetadata[id].title} downloaded!`, id, (i + 1), projectIDs.length);
                        projectData[id] = project;
                        downloadCount++;
                    }
                    else {
                        pageLog(`Error occurred downloading ${projectMetadata[id].title}!`, `ERROR ${id}`);
                    }
                })
                .catch((error) => {
                    pageLog(`Error occurred downloading ${projectMetadata[id].title}!`, `ERROR ${id}`);
                });
            }
        })
        .then((response) => {
            pageLog("End!");
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

async function fetchProjectsFromMetadata(projectIndex, downloadOptions) {
    let projectID = SAMPLE_PROJECT;

    let downloadOptions = DEFAULT_DOWNLOAD_OPTIONS;
    downloadOptions.customOptions = { process: projectID, step: 0 };

    // May be called periodically with progress updates.
    downloadOptions.onProgress = (type, loaded, total) => {
        // type is 'metadata', 'project', 'assets', or 'compress'
        pageLog(
            `${(loaded / total * 100).toFixed(0)}% - ${type}`,
            downloadOptions.customOptions.process,
            downloadOptions.customOptions.step, 2
        );
    }

    fetchProject(SAMPLE_PROJECT, downloadOptions)
    .then((id) => {
        //pageLog(`Successfully fetched ${projectMetadata[id].title}.${p.type}`, id, 2, 2);
        return Promise.resolve();
    })
    .catch((error) => {
        if (error && error.name === 'AbortError') {
            //pageLog(`Download of ${projectMetadata[projectID].title} aborted!`, id, 1, 2);
        } else {
            //pageLog(`Error occurred downloading ${projectMetadata[projectID].title}! ${error}`, id, 1, 2);
        }
        return Promise.reject();
    });
}

async function fetchProject(id = SAMPLE_PROJECT, downloadOptions = DEFAULT_DOWNLOAD_OPTIONS) {
    pageLog(`Fetching Project...`, id, [1, 2]);

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
function downloadAll(label) {
    let zip = new JSZip();

    zip.file(`${username}.json`, JSON.stringify(userData));

    // Zip up the metadata and project file for each project
    for (let p in projectData)
    {
        zip.file(`${p}-${projectData[p].title}.${projectData[p].type}`, projectData[p].arrayBuffer);
        zip.file(`${p}-${projectData[p].title}.json`, JSON.stringify(projectMetadata[p]));
    }
    
    // Save JSZip with filename, include accountName if it exists
    zip.generateAsync({type:"blob"})
    .then(function (blob) {
        saveAs(blob, `scratch-backup-${label}.zip`);
    });
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
