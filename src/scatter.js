function scatter(json) {
    const lang = document.getElementById("language").value;
    const hole = document.getElementById("hole").value;
    const medal = document.getElementById("medal").value;
    const weight = document.getElementById("weight").value;
    const plotType = document.getElementById("plot").value;
    const diamonds = medal === "diamonds";

    writer = [];
    current_record = {};
    holes = [];
    langs = [];
    num_holes = 0;
    num_langs = 0;

    json.sort(d => Number(new Date(d.submitted))).forEach(row => {
        time = Number(new Date(row.submitted));
        key = [row.hole, row.lang];
        if((hole === "All" || row.hole === hole) && (lang === "All" || row.lang === lang)) {
            if(diamonds) {
                // first submission for hole-lang combo
                if(!(key.toString() in current_record)) {
                    current_record[key] = {"min": row.bytes, "holders": [row.login]};
                    if(!holes.includes(row.hole)) {
                        num_holes++;
                        holes.push(row.hole);
                    }
                    if(!langs.includes(row.lang)) {
                        num_langs++;
                        langs.push(row.lang);
                    }
                    writer.push({"user": row.login, "change": 1, "time": time, "hole": num_holes, "lang": num_langs});
                } else {
                    const curr_min = current_record[key]["min"];
                    holders = current_record[key]["holders"];

                    // diamond beaten
                    if(row.bytes < curr_min) {
                        // case 1 - sole holder
                        if(holders.length == 1) {
                            if(row.login !== holders[0]) {
                                writer.push({"user": row.login, "change": 1, "time": time, "hole": num_holes, "lang": num_langs});
                                writer.push({"user": holders[0], "change": -1, "time": time, "hole": num_holes, "lang": num_langs});
                            }
                            current_record[key] = {"min": row.bytes, "holders": [row.login]};
                        }
                        // case 2 - >1 holder
                        else {
                            writer.push({"user": row.login, "change": 1, "time": time, "hole": num_holes, "lang": num_langs});
                            current_record[key] = {"min": row.bytes, "holders": [row.login]};
                        }
                    }
                    // tie diamond
                    else if(row.bytes == curr_min) {
                        if(holders.length == 1 && row.login !== holders[0]) {
                            writer.push({"user": holders[0], "change": -1, "time": time, "hole": num_holes, "lang": num_langs});
                        }
                        if(!holders.includes(row.login)) {
                            holders.push(row.login);
                        }
                    }
                } // if(!(key in current_record))
            } else {
                // first submission for hole-lang combo
                if(!(key.toString() in current_record)) {
                    current_record[key] = {"min": row.bytes, "holders": [row.login]};
                    if(!holes.includes(row.hole)) {
                        num_holes++;
                        holes.push(row.hole);
                    }
                    if(!langs.includes(row.lang)) {
                        num_langs++;
                        langs.push(row.lang);
                    }
                    writer.push({"user": row.login, "change": 1, "time": time, "hole": num_holes, "lang": num_langs});
                } else {
                    const curr_min = current_record[key]["min"];
                    holders = current_record[key]["holders"];
                    // beat tied gold
                    if(row.bytes < curr_min) {
                        current_record[key]["holders"].forEach(old_holder => {
                            if(row.login !== old_holder) {
                                writer.push({"user": old_holder, "change": -1, "time": time, "hole": num_holes, "lang": num_langs});
                            }
                        });
                        if(!holders.includes(row.login)) {
                            writer.push({"user": row.login, "change": 1, "time": time, "hole": num_holes, "lang": num_langs});
                        }
                        current_record[key] = {"min": row.bytes, "holders": [row.login]}
                    }
                    // tie tied gold
                    else if(row.bytes == curr_min) {
                        if(!holders.includes(row.login)) {
                            holders.push(row.login);
                            writer.push({"user": row.login, "change": 1, "time": time, "hole": num_holes, "lang": num_langs});
                        }
                    }
                } // if(!(key in current_record))
            } // if diamonds
        }
    });

    // preparing data
    dt = aq.from(writer);

    const topN = dt
        .groupby("user")
        .rollup({ total: d => aq.op.sum(d.change) })
        .orderby(aq.desc("total"))
        .slice(lower-1, upper);

    plot_df = dt
        .semijoin(topN, "user")
        .groupby("time", "hole", "lang")
        .pivot("user", "change", { aggregate: aq.op.sum, fill: 0 })
        .ungroup()
        .orderby("time");

    rows = plot_df.objects();
    // cumsum - aq doesn"t support
    topN.array("user").forEach(user => {
        runningtotal = 0;
        for(i = 0; i < rows.length; i++) {
            runningtotal += parseFloat(rows[i][user]) || 0;
            rows[i][user] = runningtotal;
        }
    });
    plot_df = aq.from(rows);

    // plotting
    const times = plot_df.array("time");
    const holes_df = plot_df.array("hole");
    const langs_df = plot_df.array("lang");

    traces = topN.array("user").map(user => {
        const finalY = plot_df.array(user).map((val, index) => {
            if(weight === "per hole") return val / holes_df[index];
            else if(weight === "per lang") return val / langs_df[index];
            else if(weight === "per hole&lang") return val / (holes_df[index] * langs_df[index]);
            return val;
        });

        traces =  {
            x: times,
            y: finalY,
            name: user,
            mode: "lines"
        };

        if(plotType === "graph") {
            traces.line = { shape: "linear" };
            traces.type = "scatter";
        } else if(plotType === "stack") {
            traces.stackgroup = "one";
            traces.groupnorm = "fraction"; // y-axis [0.0, 1.0]
            traces.line = { shape: "spline" };
            traces.fill = "tonexty"; // fill area in between lines
        }

        return traces;
    });

    title = "Bytes Golds";
    if(diamonds) title = "Bytes Diamonds";
    if(weight === "per hole") title += " per hole";
    else if(weight === "per lang") title += " per lang";
    else if(weight === "per hole&lang") title += " per hole&lang";

    const layout = {
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
            title: title,
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
    Plotly.newPlot("plot-container", traces, themedLayout, { responsive: true });

    if(writer.length > 0)
        status.innerText = "";
    else
        status.innerText = "There is no data for these options!";
}
