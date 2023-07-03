const SAMPLE_PROJECT = 255565;
const DEFAULT_DOWNLOAD_OPTIONS = {
    date: new Date(),
};

// Page elements
let inAccountName;
let inSubmit;
let outLog
let outDownloads

// Project data
let metadata;
let projects;
let files;

// Application progress tracking
let running;
let xhrJobsRunning;

window.onload = (e) => {
    // Find elements on page
    inAccountName = document.querySelector("#name");
    inSubmit = document.querySelector("#submit");
    outLog = document.querySelector("#log");
    outDownloads = document.querySelector("#downloads");

    // Initialize variables
    running = false;
    xhrJobsRunning = 0;

    // Add functions to site elements
    inSubmit.onclick = fetch;
    projects = {};
    metadata = {};
}

function fetch() {
    if (!running)
    {
        // Prevent from running twice
        running = true;
        // Clear projects, metadata, and log
        projects = {};
        metadata = {};
        pageLogClear();
        // Fetch project, then download info
        fetchProject();
    }
}

async function fetchProject(id = SAMPLE_PROJECT) {
    xhrJobsRunning++;
    
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
        // If successful, log it in metadata object
        downloadOptions.customOptions.step = 2;

        pageLogProject(`Metadata download of ${m.title} successful!`, id, 1);
        metadata[id] = m;

        // Start a new promise to get project data
        SBDL.downloadProjectFromID(id, downloadOptions)
        .then((p) => {
            pageLogProject(`Download of ${metadata[id].title}.${p.type} successful!`, id, 2);
            projects[id] = p;

            downloadAll(inAccountName.value);
        })
        .catch((e) => {
            if (e && e.name === 'AbortError') {
                pageLogProject(`Download of ${metadata[id].title} aborted!`, id, 1);
            } else {
                pageLogProject(`Error occurred downloading ${metadata[id].title}! ${e}`, id, 1);
            }
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
        xhrJobsRunning--;
        
        if (xhrJobsRunning <= 0)
        {
            xhrJobsRunning = 0;
            running = false;
        }
    });
}

// Download file prompt code by Rik Schennink
// https://pqina.nl/blog/how-to-prompt-the-user-to-download-a-file-instead-of-navigating-to-it/

// function download(file) {
//     // Create a link to the object as a file
//     const link = document.createElement("a");
//     //link.style.display = none;
//     link.href = URL.createObjectURL(file);
//     link.download = file.name;

//     // Add link to DOM to allow it to be clicked, then click it
//     outDownloads.appendChild(link);
//     link.click();
// }

// Downloads all project data and metadata in a zip using JSZip
function downloadAll(label) {
    let zip = new JSZip();

    // Zip up the metadata and project file for each project
    for (let p in projects)
    {
        zip.file(`${p}-${projects[p].title}.${projects[p].type}`, projects[p].arrayBuffer);
        zip.file(`${p}-${projects[p].title}.json`, JSON.stringify(metadata[p]));
    }

    // Save JSZip with filename, include accountName if it exists
    zip.generateAsync({type:"blob"})
    .then(function (blob) {
        saveAs(blob, `scratch-backup-${label}.zip`);
    });
}

function pageLog(message) {
    let logMessage = document.createElement("p");
    logMessage.innerHTML = message;
    outLog.appendChild(logMessage);
}

function pageLogProject(message, projectID, step, stepMax = 2) {
    // Try to find 
    let logMessage = document.querySelector(`#message-${projectID}-${step}`);
    // let logMessage = document.createElement("p");
    if (!logMessage) {
        logMessage = document.createElement("p");
        logMessage.id = `message-${projectID}-${step}`
    }
    logMessage.innerHTML = `[ ${projectID} | ${step}/${stepMax} ] ${message}`;
    outLog.appendChild(logMessage);
}

function pageLogClear() {
    outLog.innerHTML = null;
    // let logMessages = outLog.querySelectorAll("p");
    // console.log(logMessages);
}