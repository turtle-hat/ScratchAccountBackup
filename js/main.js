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
let userProjectIDs;

// Project data to be downloaded
let projectMetadata;
let projectData;

// Application progress tracking
let running;

window.onload = (e) => {
    // Find elements on page
    inAccountName = document.querySelector("#name");
    btnDownload = document.querySelector("#download");
    outLog = document.querySelector("#log");
    outDownloads = document.querySelector("#downloads");

    // Initialize variables
    running = false;
    jobsRunning = 0;

    // Add functions to site elements
    btnDownload.onclick = download;
    projectData = {};
    projectMetadata = {};
}

// Thanks to Tapas Adhikary for helping me understand Promises with their article!
// https://www.freecodecamp.org/news/javascript-promise-tutorial-how-to-resolve-or-reject-promises-in-js/

function download() {
    if (!running && inAccountName.value)
    {
        username = inAccountName.value;
        // Prevent from running twice
        running = true;
        // Clear projects, metadata, and log
        projectData = {};
        projectMetadata = {};
        pageLogClear();

        // Fetch user data, then download project info
        fetchUser(username)
        .then(fetchUserProjectData())
        .then()
        .catch()
        .finally(() => {
            running = false;
        });
    }
}

// Code instructions for reading Response from https://developer.mozilla.org/en-US/docs/Web/API/Response
async function doAjax(url) {    
    const request = new Request(
        url,
        { method: 'GET' }
        );

    // Fetch API code from https://developer.mozilla.org/en-US/docs/Web/API/fetch#examples
    const response = await fetch(request);
    if (response.ok) {
        const responseJson = await response.json();
        return Promise.resolve(responseJson);
    }
    else {
        return Promise.reject();
    }
}

// Pass Ajax request into a function just to send the right messages
async function fetchUser(user) {
    doAjax(`php/get-user-scratch.php?username=${user}`)
        .then((response) => {
            userData = response;
            pageLog("Success! User data stored.", user);
            return Promise.resolve();
        })
        .catch(() => {
            pageLog(`Could not find data for that user!`, user);
            return Promise.reject();
        });
}

async function fetchUserProjectData(username) {
    // Setup custom info to be printed with progress updates,
    // obtained from .sb Downloader documentation

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
        pageLog(`Successfully fetched ${projectMetadata[id].title}.${p.type}`, id, 2, 2);
        return Promise.resolve();
    })
    .catch((error) => {
        if (error && error.name === 'AbortError') {
            pageLog(`Download of ${projectMetadata[projectID].title} aborted!`, id, 1, 2);
        } else {
            pageLog(`Error occurred downloading ${projectMetadata[projectID].title}! ${error}`, id, 1, 2);
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

    SBDL.downloadProjectFromID(id, downloadOptions)
    .then((project) => {
        projectData[id] = project;
        return Promise.resolve(id);
    })
    .catch((error) => {
        return Promise.reject(error);
    });
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
function pageLog(message, process = "", step = 0, max = 0) {
    let logMessage = document.createElement("p");
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
