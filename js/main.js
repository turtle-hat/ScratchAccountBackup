const SAMPLE_PROJECT = 255565;
const DEFAULT_DOWNLOAD_OPTIONS = {
    date: new Date(),
};
const DEFAULT_LIMIT = 40;
const DEFAULT_OFFSET = 0;

// Page elements
let inAccountName;
let btnFetch;
let btnDownload;
let outLog
let outDownloads

// User data retrieved from Scratch API
let userData

// Project data to be downloaded
let projectMetadata;
let projectData;

// Application progress tracking
let running;
let jobsRunning;

window.onload = (e) => {
    // Find elements on page
    inAccountName = document.querySelector("#name");
    btnFetch = document.querySelector("#fetch");
    btnDownload = document.querySelector("#download");
    outLog = document.querySelector("#log");
    outDownloads = document.querySelector("#downloads");

    // Initialize variables
    running = false;
    jobsRunning = 0;

    // Add functions to site elements
    btnFetch.onclick = fetchProjects;
    btnDownload.onclick = downloadProjects;
    projectData = {};
    projectMetadata = {};
}

function fetchProjects() {
    if (!running && inAccountName.value)
    {
        // Prevent from running twice
        running = true;
        // Clear projects, metadata, and log
        projectData = {};
        projectMetadata = {};
        pageLogClear();
        // Fetch project data, then download info
        fetchUserData(inAccountName.value);
    }
}

function downloadProjects() {
    if (!running && inAccountName.value)
    {
        // Prevent from running twice
        running = true;
        // Clear projects, metadata, and log
        projectData = {};
        projectMetadata = {};
        pageLogClear();
        // Fetch project data, then download info
        fetchProjectData();
    }
}

async function fetchUserData(username = "turtlehat", limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET) {
    jobsRunning++

    pageLogUser(`Fetching User Data...`, username);

    let url = `php/get-user-projects-scratch.php?username=${username}&limit=${limit}&offset=${offset}`;
    console.log(url);

    // Fetch API code from https://developer.mozilla.org/en-US/docs/Web/API/fetch#examples

    const request = new Request(
        url,
        { method: 'GET' }
        );

    console.log(request.url);

    doAjax(request)
    .then((response) => {
        pageLogUser(`Fetching user data successful!`, username);
        console.log(response);
    })
    .catch((e) => {
        pageLogUser(e, username);
    })
    .then(() => {
        finishJob();
    });
}

// Code instructions for reading Response from https://developer.mozilla.org/en-US/docs/Web/API/Response
async function doAjax(request) {
    const response = await fetch(request);

    if (response.ok) {
        console.log(response);
        const responseJson = await response.json();
        return Promise.resolve(responseJson);
    }
    else {
        return Promise.reject(`Error occurred fetching user data! ${response.status}`);
    }
}

async function fetchProjectData(id = SAMPLE_PROJECT) {
    jobsRunning++;
    
    pageLogProject(`Fetching Project...`, id, 1);

    // Pass custom info to be printed with progress updates,
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

    // Promise handling code clipped from .sb Downloader documentation
    // https://github.com/forkphorus/sb-downloader#aborting
    // Also referenced MDN page on Using Promises
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises

    // First get project metadata
    SBDL.getProjectMetadata(id, downloadOptions)
    .then((m) => {
        jobsRunning++;
        // If successful, log it in metadata object
        downloadOptions.customOptions.step = 2;

        pageLogProject(`Metadata download of ${m.title} successful!`, id, 1);
        projectMetadata[id] = m;

        // Start a new promise to get project data
        SBDL.downloadProjectFromID(id, downloadOptions)
        .then((p) => {
            pageLogProject(`Download of ${projectMetadata[id].title}.${p.type} successful!`, id, 2);
            projectData[id] = p;

            downloadAll(inAccountName.value);
        })
        .catch((e) => {
            if (e && e.name === 'AbortError') {
                pageLogProject(`Download of ${projectMetadata[id].title} aborted!`, id, 1);
            } else {
                pageLogProject(`Error occurred downloading ${projectMetadata[id].title}! ${e}`, id, 1);
            }
        })
        .then(() => {
            finishJob();
        });
    })
    .catch((e) => {
        if (e && e.name === 'AbortError') {
            pageLogProject(`Metadata download aborted!`, id, 0);
        } else {
            pageLogProject(`Error occurred downloading metadata! ${e}`, id, 0);
        }
    })
    .then(() => {
        finishJob();
    });
}


// Downloads all project data and metadata in a zip using JSZip
function downloadAll(label) {
    let zip = new JSZip();

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

function finishJob() {
    jobsRunning--;
        
    if (jobsRunning <= 0)
    {
        jobsRunning = 0;
        running = false;
    }
}

function pageLog(message, element = null) {
    let logMessage = element;
    if (!element) {
        logMessage = document.createElement("p")
    }
    logMessage.innerHTML = message;
    outLog.appendChild(logMessage);
}

function pageLogUser(message, username) {
    pageLog(
        `[${username}] ${message}`,
        pageFindMessage(`message-${username}`)
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
