const SAMPLE_PROJECT = 209978732;

// Page elements
let inAccountName;
let inSubmit;
let outLog

// Object
let metadata;

// Application Progress Tracking
let running;
let xhrJobsRunning;

const downloadOptions = {
    // May be called periodically with progress updates.
    onProgress: (type, loaded, total) => {
      // type is 'metadata', 'project', 'assets', or 'compress'
      pageLog(type, loaded / total);
    }
};

window.onload = (e) => {
    // Find elements on page
    inAccountName = document.querySelector("#name");
    inSubmit = document.querySelector("#submit");
    outLog = document.querySelector("#log");

    // Initialize variables
    running = false;
    xhrJobsRunning = 0;

    // Add
    inSubmit.onclick = fetch;
}

function fetch() {
    if (!running)
    {
        running = true;
        pageLogClear();
        downloadProject();
    }
}

function downloadProject(id = SAMPLE_PROJECT) {
    xhrJobsRunning++;
    
    pageLog(`Fetching Project ${id}`);

    SBDL.downloadProjectFromID(id, downloadOptions)
    .then((project) => {
      pageLog(`Download of Project ${id} successful!`);
    })
    .catch((error) => {
      if (error && error.name === 'AbortError') {
        pageLog(`Download of Project ${id} aborted!`);
    } else {
        pageLog(`${error} occurred downloading Project${id}!`);
      }
    })
    .finally((e) => {
        xhrJobsRunning--;
        
        if (xhrJobsRunning <= 0)
        {
            xhrJobsRunning = 0;
            running = false;
        }
    });
}

function pageLog(message) {
    let logMessage = document.createElement("p");
    logMessage.innerHTML = message;
    outLog.appendChild(logMessage);
}

function pageLogClear() {
    outLog.innerHTML = null;
    // let logMessages = outLog.querySelectorAll("p");
    // console.log(logMessages);
}