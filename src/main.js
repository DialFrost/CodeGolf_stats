const graphBtn = document.getElementById("graph");

const tabBtns = document.querySelectorAll(".tab-btn");
const contents = document.querySelectorAll(".option-content");

// tab buttons
tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-target");

        tabBtns.forEach(btn => btn.classList.remove("active"));
        btn.classList.add("active");

        contents.forEach(content => {
            content.classList.add("hidden");
        });
        // show target content by removing hidden
        document.getElementById(target).classList.remove("hidden");
    });
});

globalJson = null;
const status = document.getElementById("status");
const fileInput = document.getElementById("file-upload");
fileInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const json = JSON.parse(e.target.result);
                globalJson = json;
            } catch(error) {
                status.innerText = "Invalid json parsing";
            }
        };
        reader.readAsText(file);
    }
});

graphBtn.addEventListener("click", () => {
    // clear previous graph
    Plotly.purge("plot-container");
    generateGraph();
});

function getPlotTheme(layout) {
    const isDark = !document.body.classList.contains("light-mode");

    const color = isDark ? "#ffffff" : "#000000";
    const grid = isDark ? "#333333" : "#e1e1e1";

    layout.template = isDark ? "plotly_dark" : "plotly_white";
    layout.paper_bgcolor = "transparent";
    layout.plot_bgcolor = "transparent";

    layout.font ??= {};
    layout.font.color = color;

    ["xaxis", "yaxis"].forEach(ax => {
        layout[ax] ??= {};
        layout[ax].gridcolor = grid;
        layout[ax].linecolor = color;

        layout[ax].tickfont ??= {};
        layout[ax].tickfont.color = color;
    });

    return layout;
}

const toggle = document.querySelector("#togglebox");
toggle.addEventListener("change", () => {
    if(!toggle.checked)
        document.body.classList.add("light-mode");
    else
        document.body.classList.remove("light-mode");

    const graph = document.querySelector(".js-plotly-plot");
    if(graph) {
        const newTheme = getPlotTheme(graph.layout);
        Plotly.react(graph, graph.data, newTheme);
    }
});

async function fetchApiOptions() {
    // don't allow user to generate graph without options loaded
    graphBtn.disabled = true;

    try {
        const [response1, response2] = await Promise.all([
            fetch("https://code.golf/api/holes"),
            fetch("https://code.golf/api/langs")
        ]);

        if(!response1.ok)
            throw new Error(`HTTP error, status: ${response1.status}`);
        if(!response2.ok)
            throw new Error(`HTTP error, status: ${response2.status}`);

        const holeData = await response1.json();
        const langData = await response2.json();

        holes = holeData.filter(hole => !("experiment" in hole));
        langs = langData.filter(lang => !("experiment" in lang));

        const holeselect = document.getElementById("hole");
        ["All", ...holes].forEach(hole => {
            const option = document.createElement("option");
            option.value = hole === "All" ? "All" : hole["id"];
            option.text = hole === "All" ? "All" : hole["name"];
            holeselect.appendChild(option);
        });

        const langselect = document.getElementById("language");
        ["All", ...langs].forEach(lang => {
            const option = document.createElement("option");
            option.value = lang === "All" ? "All" : lang["id"];
            option.text = lang === "All" ? "All" : lang["name"];
            langselect.appendChild(option);
        });

        graphBtn.disabled = false;
        return [holes.map(hole => hole["id"]), langs.map(lang => lang["id"])];
    } catch (error) {
        graphBtn.disabled = false;
        console.log("Error:", error);
    }
}

fetchApiOptions().then(([res1, res2]) => {
    [holesArr, langsArr] = [res1, res2];
});

function isInt(val) {
    return !isNaN(val) && parseInt(Number(val)) == val && !isNaN(parseInt(val, 10));
}

async function generateGraph() {
    graphBtn.innerText = "Wait...";
    graphBtn.disabled = true;

    if(globalJson) {
        json = globalJson;
    } else {
        try {
            // daily updated API json
            const response = await fetch("./all.json");
            json = await response.json();
        } catch(error) {
            status.innerText = "Error fetching json";
            graphBtn.innerText = "Generate";
            graphBtn.disabled = false;
            return;
        }
    }

    json = json.filter(d => d.scoring === "bytes")
            .filter(d => holesArr.includes(d.hole))
            .filter(d => langsArr.includes(d.lang));

    const plotContainer = document.getElementById("plot-container");

    // error checking with bounds
    lower = document.getElementById("lowerBound").value;
    upper = document.getElementById("upperBound").value;

    if(!isInt(lower) || !isInt(upper)) {
        status.innerText = "Error - Invalid rank bounds";
        return;
    }

    lower = parseInt(lower);
    upper = parseInt(upper);
    if(Math.abs(upper - lower) > 30) {
        status.innerText = "Error - Invalid rank bounds (keep difference<30)";
        return;
    }
    if(lower<1 || upper<1 || lower > upper) {
        status.innerText = "Error - Invalid rank bounds";
        return;
    }

    status.innerText = "Processing...";

    const activeTab = document.querySelector(".tab-btn.active");
    const currMode = activeTab.getAttribute("data-target");

    if(currMode === "scatter") {
        scatter(json);
    } else if(currMode === "heatmap") {
        const user = document.getElementById("username").value;
        heatmap(json, user);
    }
    
    graphBtn.disabled = false;
    graphBtn.innerText = "Generate";
}