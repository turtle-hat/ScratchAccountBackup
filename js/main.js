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

// Thanks to
// https://www.freecodecamp.org/news/javascript-promise-tutorial-how-to-resolve-or-reject-promises-in-js/
// for helping me understand Promises!

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
        fetchUserData(username)
        .then(fetchProjectData)
        .then(downloadAll(username))
        .finally(() => {
            running = false;
        });
    }
}

async function fetchUserData(user = "turtlehat", offset = DEFAULT_OFFSET) {

    pageLogUser(`Fetching User Data...`, user);

    const url = `php/get-user-scratch.php?username=${user}`;

    // Fetch API code from https://developer.mozilla.org/en-US/docs/Web/API/fetch#examples

    const request = new Request(
        url,
        { method: 'GET' }
        );

    doAjax(request)
    .then((response) => {
        pageLogUser(`Fetching user data successful!`, user);
        userData = response;
        return Promise.resolve();
    })
    .catch((error) => {
        pageLogUser(`Error occurred fetching user data! ${error}`, user);
        return Promise.reject();
    });
}

// Code instructions for reading Response from https://developer.mozilla.org/en-US/docs/Web/API/Response
async function doAjax(request) {
    const response = await fetch(request);
    if (response.ok) {
        return Promise.resolve(response.json());
    }
    else {
        return Promise.reject(response.status);
    }
}

async function fetchUserProjects(username) {
    // Setup custom info to be printed with progress updates,
    // obtained from .sb Downloader documentation

    let downloadOptions = DEFAULT_DOWNLOAD_OPTIONS;
    downloadOptions.customOptions = { id: id, step: 0 };

    // May be called periodically with progress updates.
    downloadOptions.onProgress = (type, loaded, total) => {
        // type is 'metadata', 'project', 'assets', or 'compress'
        pageLogProject(
            `${(loaded / total * 100).toFixed(0)}% - ${type}`,
            downloadOptions.customOptions.id,
            downloadOptions.customOptions.step
        );
    }

    fetchProjectData(SAMPLE_PROJECT, downloadOptions)
    .then((id) => {
        pageLogProject(`Download of ${projectMetadata[id].title}.${p.type} successful!`, id, 2);
        return Promise.resolve();
    })
    .catch((error) => {
        if (error && error.name === 'AbortError') {
            pageLogProject(`Download of ${projectMetadata[id].title} aborted!`, id, 1);
        } else {
            pageLogProject(`Error occurred downloading ${projectMetadata[id].title}! ${error}`, id, 1);
        }
        return Promise.reject();
    });
}

async function fetchProjectData(id = SAMPLE_PROJECT, downloadOptions = DEFAULT_DOWNLOAD_OPTIONS) {
    pageLogProject(`Fetching Project...`, id, 1);

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

function pageLog(message, element = null) {
    let logMessage = element;
    if (!element) {
        logMessage = document.createElement("p")
    }
    logMessage.innerHTML = message;
    outLog.appendChild(logMessage);
}

function pageLogUser(message, user) {
    pageLog(
        `[${user}] ${message}`,
        pageFindMessage(`message-${user}`)
    );
}

function pageLogProject(message, projectID, step, stepMax = 2) {
    pageLog(
        `[${projectID}|${step}/${stepMax}] ${message}`,
        pageFindMessage(`message-${projectID}-${step}`)
    );
}

function pageFindMessage(id) {
    // Try to find existing message with same generated ID
    let logMessage = document.querySelector(`#${id}`);
    // If message doesn't exist, make it and set its ID
    if (!logMessage) {
        logMessage = document.createElement("p");
        logMessage.id = id;
    }
    return logMessage;
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
