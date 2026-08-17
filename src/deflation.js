function deflation(json, user) {
    const userMatch = json.find(d => d.login === user);
    if(!userMatch) {
        status.innerText = "Error: no user found";
        return;
    }

    document.querySelector(".table-container").classList.add("hidden");
    document.getElementById("plot-container").classList.remove("hidden");
    
    const lang = document.querySelector("#deflation .language").value;
    const hole = document.querySelector("#deflation .hole").value;

    let times = [];
    let scores = [];
    let bestScores = {};

    if(hole !== "All")
        json = json.filter(d => d.hole === hole);
    if(lang !== "All")
        json = json.filter(d => d.lang === lang);
    if(user !== "")
        json = json.filter(d => d.login === user);

    json
        .sort((a, b) => Number(new Date(a.submitted)) - Number(new Date(b.submitted)))
        .forEach(row => {
            let key = [row.hole, row.lang];
            if(bestScores[key] === undefined || row.bytes < bestScores[key]) {
                bestScores[key] = row.bytes;
                scores.push(Object.values(bestScores).reduce((a, b) => a+b, 0));
                times.push(row.submitted);
            }
        });

    const trace = {
        x: times,
        y: scores,
        line: {shape: "hv"},
        type: "scatter",
        mode: "lines"
    };
    
    const layout = {
        font: {
            family: "'Source Code Pro', monospace"
        },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        margin: { l: 60, r: 10, t: 30, b: 40, pad: 0 },
        xaxis: {
            title: "Date",
            type: "date",
            griddash: "2, 2",
            linewidth: 1,
            showline: true,
            mirror: true,
            ticks: "outside"
        },
        yaxis: {
            title: "Bytes",
            griddash: "2, 2",
            linewidth: 1,
            showline: true,
            mirror: true,
            ticks: "outside",
            nticks: 20
        },
        legend: { x: 1.02, y: 0.5, yanchor: "middle" }
    };

    const themedLayout = getPlotTheme(layout);
    Plotly.newPlot("plot-container", [trace], themedLayout, { responsive: true });
}