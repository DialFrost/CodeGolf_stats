function heatmap(json, user) {
    const userMatch = json.find(d => d.login === user);
    if(!userMatch && user !== "") {
        status.innerText = "Error: no user found";
        return;
    }

    document.querySelector(".table-container").classList.add("hidden");
    document.getElementById("plot-container").classList.remove("hidden");

    // find best score per hole/lang
    const bestScores = new Map();
    json.forEach(d => {
        const key = `${d.hole}|${d.lang}`;
        const score = Number(d.bytes);
        if(!bestScores.has(key) || score < bestScores.get(key))
            bestScores.set(key, score);
    });

    // count leaders
    const results = new Map();
    json.forEach(d => {
        const key = `${d.hole}|${d.lang}`;
        const score = Number(d.bytes);
        
        if(score === bestScores.get(key)) {
            if(!results.has(key))
                results.set(key, { count: 0, userHasGold: false });
            const stats = results.get(key);
            stats.count++;
            if(d.login === user)
                stats.userHasGold = true;
        }
    });

    const yLangs = langsArr.sort();
    const xHoles = holesArr.sort();
    const z = yLangs.map(lang => {
        return xHoles.map(hole => {
            const key = `${hole}|${lang}`;
            const stats = results.get(key);
            if(!stats) return 0; 
            return stats.userHasGold ? 0 : stats.count;
        });
    });

    const customColorscale = [[0.0, "#22bb77"], // user golds
        [0.0000000000000001, "#0d0887"],
        [0.1111111111111111, "#46039f"],
        [0.2222222222222222, "#7201a8"],
        [0.3333333333333333, "#9c179e"],
        [0.4444444444444444, "#bd3786"],
        [0.5555555555555556, "#d8576b"],
        [0.6666666666666666, "#ed7953"],
        [0.7777777777777777, "#fb9f3a"],
        [0.8888888888888888, "#fdca26"],
        [1.0, "#f0f921"]];

    const trace = {
        z: z,
        x: xHoles,
        y: yLangs,
        type: "heatmap",
        colorscale: customColorscale,
        zmin: 0,
        zmax: 20
    };
    const layout = {
        title: {
            text: "#Golds per hole/lang",
            yref: "paper",
            xref: "paper",
            y: 1,
            yanchor: "bottom",
            pad: { t: 10, b: 20 }},
        font: {
            family: "'Source Code Pro', monospace"
        },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        xaxis: { side: "bottom", tickangle: 45, tickfont: { size: 9 } },
        yaxis: { tickfont: { size: 9 } },
        margin: { t: 40, b: 100 }
    };

    status.innerText = "";
    const themedLayout = getPlotTheme(layout);
    Plotly.newPlot("plot-container", [trace], themedLayout, { responsive: true });
}
