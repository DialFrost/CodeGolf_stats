const pageInfo = document.getElementById("pageInfo");
const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");

let tableData = [];
let currPage = 1;
const rowsPerPage = 20;
let pageCount = null;

function goldsLost(json, user) {
    const userMatch = json.find(d => d.login === user);
    if(!userMatch) {
        status.innerText = "Error: no user found";
        return;
    }

    document.querySelector(".table-container").classList.remove("hidden");
    document.getElementById("plot-container").classList.add("hidden");

    let writer = [];
    let current_record = {};
    json.sort((a, b) => Number(new Date(a.submitted)) - Number(new Date(b.submitted))).forEach(row => {
        let key = [row.hole, row.lang];
        let time = row.submitted;
        // 1 - user holds gold, new user gets diamond
        // 2 - user holds diamond, new user gets diamond
        // 3 - user holds diamonds, new user gets gold
        if(current_record[key] === undefined) {
            current_record[key] = {"users": [row.login], "bytes": row.bytes, "time": time};
        } else if(row.bytes < current_record[key]["bytes"] && current_record[key]["users"].length > 1) {
            // user holds gold, new user gets diamond
            if(current_record[key]["users"].includes(user)) {
                writer.push({"user": row.login, "gold": true, "hole": row.hole, "lang": row.lang, "bytes": row.bytes, "oldbytes": current_record[key]["bytes"], "time": time});
            }
            current_record[key] = {"users": [row.login], "bytes": row.bytes, "time": time};
        } else if(row.bytes == current_record[key]["bytes"] && current_record[key]["users"].length == 1) {
            // user holds diamond, new user gets gold
            if(current_record[key]["users"].includes(user)) {
                writer.push({"user": row.login, "gold": false, "hole": row.hole, "lang": row.lang, "bytes": row.bytes, "oldbytes": current_record[key]["bytes"], "time": time});
            }
            current_record[key] = {"users": [row.login, ...current_record[key]["users"]], "bytes": row.bytes, "time": time};
        } else if(row.bytes < current_record[key]["bytes"] && current_record[key]["users"].length == 1) {
            // user holds diamond, new user gets diamond
            if(current_record[key]["users"].includes(user)) {
                writer.push({"user": row.login, "gold": false, "hole": row.hole, "lang": row.lang, "bytes": row.bytes, "oldbytes": current_record[key]["bytes"], "time": time});
            }
            current_record[key] = {"users": [row.login], "bytes": row.bytes, "time": time};
        }
    });

    const medalType = document.querySelector("#golds-lost #table").value;
    if(medalType === "gold") {
        writer = writer.filter(item => item["gold"]);
    } else if(medalType === "diamond") {
        writer = writer.filter(item => !item["gold"]);
    }

    tableData = writer.reverse();
    pageCount = Math.ceil(tableData.length / rowsPerPage);

    currPage = 1;
    displayTablePage(1);
}

function displayTablePage(page) {
    const tbody = document.getElementById("table-body");
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = tableData.slice(startIndex, endIndex);

    tbody.innerHTML = "";
    pageData.forEach(item => {
        const row = `
            <tr>
                <td>${item["gold"] ? "🥇" : "💎"}</td>
                <td>
                    <a href="https://code.golf/${item["hole"]}#${item["lang"]}" target="_blank">
                        ${item["hole"]}
                    </a>
                </td>
                <td>${item["lang"]}</td>
                <td>${item["oldbytes"]} → ${item["bytes"]}</td>
                <td>${item["user"]}</td>
                <td>${new Date(item["time"]).toLocaleDateString()}</td>
            </tr>
        `;

        tbody.insertAdjacentHTML("beforeend", row);
    });

    // empty rows to push pagination down
    const emptyRows = rowsPerPage - pageData.length;
    for(let i = 0; i < emptyRows; i++)
        tbody.innerHTML += `
            <tr>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
            </tr>
        `;

    pageInfo.innerText = `Page ${currPage} of ${pageCount}`;

    prevBtn.disabled = currPage == 1;
    nextBtn.disabled = currPage == pageCount;
}

prevBtn.addEventListener("click", () => {
    if(currPage > 1) {
        currPage--;
        displayTablePage(currPage);
    }
});

nextBtn.addEventListener("click", () => {
    if(currPage < pageCount) {
        console.log("hi");
        currPage++;
        displayTablePage(currPage);
    }
});