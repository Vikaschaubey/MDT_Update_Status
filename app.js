let cleanedData = [];
let pieChartInstance = null;
let barChartInstance = null;

/* ================= COLUMNS TO REMOVE ================= */
const COLUMNS_TO_REMOVE = [
    "driver_id","driver_name","driver_contact","entity_id","toll__plaza_code",
    "address","state","city","ro_id","record_id","available","fcm_token",
    "fcm_token_updation_time","mmi_id","fcm_token_web","user_type",
    "fcm_token_web_updation_time","is_breakdown","breakdowndatetime",
    "breakdown_lat","breakdown_lng","breakdown_desc",
    "breakdown_updation_time","regular_service","tyre_change",
    "tech_review_expiration","pollution_expiration",
    "registration_expiration","insurance_expiration","piu_id","zone",
    "compliance_score","device_imei","mobile_imei","intouch_remarks",
    "user_email","created_on","contractor_name","contract_startdate",
    "contract_enddate","lastmodifieddatetime","handset_calling_no",
    "contractor_email","contractor_mobile","ambulance_type",
    "breakdown_status","contractor_id","device_id",
    "device_updatedtime","incident_manager_id"
];

/* ================= WHITE BACKGROUND PLUGIN ================= */
const whiteBackgroundPlugin = {
    id: "whiteBackground",
    beforeDraw: (chart) => {
        const ctx = chart.canvas.getContext("2d");
        ctx.save();
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
    }
};

/* ================= PROCESS CSV ================= */
function processCSV() {
    const fileInput = document.getElementById("csvFile");
    if (!fileInput.files.length) {
        alert("Please select a CSV file");
        return;
    }

    Papa.parse(fileInput.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {

            let data = results.data;
            if (!data || !data.length) {
                alert("CSV is empty or invalid");
                return;
            }

            let vehicleCol = null;
            const firstRow = data.find(r => r && typeof r === "object");

            if ("vehicle_type" in firstRow) vehicleCol = "vehicle_type";
            else if ("vehicale_type" in firstRow) vehicleCol = "vehicale_type";

            if (!vehicleCol) {
                alert("Vehicle type column not found");
                return;
            }

            cleanedData = data
                .filter(row => row && typeof row === "object")
                .map(row => {

                    COLUMNS_TO_REMOVE.forEach(col => {
                        if (row.hasOwnProperty(col)) delete row[col];
                    });

                    if (row[vehicleCol]) {
                        row[vehicleCol] = row[vehicleCol].toString().trim().toLowerCase();
                    }

                    row.current_version = row.current_version
                        ? row.current_version.toString().trim()
                        : "0";

                    return row;
                })
                .filter(row =>
                    ["ambulance", "crane", "patrol vehicle"].includes(row[vehicleCol]) &&
                    String(row.intouch_active_status).toLowerCase() === "true"
                );

            if (!cleanedData.length) {
                alert("No valid data after filtering");
                return;
            }

            drawPieChart();
            drawStackedBarChart(vehicleCol);
        }
    });
}

/* ================= PIE CHART ================= */
function drawPieChart() {

    const versionCounts = {};
    cleanedData.forEach(row => {
        versionCounts[row.current_version] =
            (versionCounts[row.current_version] || 0) + 1;
    });

    const labels = Object.keys(versionCounts);
    const values = Object.values(versionCounts);
    const total = values.reduce((a, b) => a + b, 0);

    if (pieChartInstance) pieChartInstance.destroy();

    pieChartInstance = new Chart(
        document.getElementById("pieChart"),
        {
            type: "pie",
            data: { labels, datasets: [{ data: values }] },
            plugins: [ChartDataLabels],
            options: {
                plugins: {
                    datalabels: {
                        color: "#fff",
                        font: { weight: "bold", size: 12 },
                        formatter: (value, ctx) => {
                            const pct = ((value / total) * 100).toFixed(1);
                            return `${ctx.chart.data.labels[ctx.dataIndex]}\n${value} (${pct}%)`;
                        }
                    }
                }
            }
        }
    );
}

/* ================= STACKED BAR CHART ================= */
function drawStackedBarChart(vehicleCol) {

    const vehicles = ["ambulance", "crane", "patrol vehicle"];
    const versions = ["0", "2.0.8", "2.0.9"];

    const counts = {};
    vehicles.forEach(v => counts[v] = { "0": 0, "2.0.8": 0, "2.0.9": 0 });

    cleanedData.forEach(row => {
        if (counts[row[vehicleCol]] && counts[row[vehicleCol]][row.current_version] !== undefined) {
            counts[row[vehicleCol]][row.current_version]++;
        }
    });

    const datasets = versions.map(ver => ({
        label: ver,
        data: vehicles.map(v => counts[v][ver]),
        stack: "versions"
    }));

    if (barChartInstance) barChartInstance.destroy();

    barChartInstance = new Chart(
        document.getElementById("barChart"),
        {
            type: "bar",
            data: {
                labels: vehicles.map(v => v.toUpperCase()),
                datasets
            },
            plugins: [ChartDataLabels, whiteBackgroundPlugin],
            options: {
                responsive: true,
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true }
                },
                plugins: {
                    datalabels: {
                        color: "#fff",
                        font: { weight: "bold", size: 11 },
                        formatter: v => v > 0 ? v : ""
                    }
                }
            }
        }
    );
}

/* ================= DOWNLOAD CSV ================= */
function downloadCSV() {
    if (!cleanedData.length) return alert("No data to download");

    const csv = Papa.unparse(cleanedData);
    const blob = new Blob([csv], { type: "text/csv" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cleaned_data.csv";
    a.click();
}

/* ================= DOWNLOAD PIE CHART ================= */
function downloadPieChart() {
    if (!pieChartInstance) return alert("Pie chart not available");

    const a = document.createElement("a");
    a.download = "pie_chart.png";
    a.href = document.getElementById("pieChart").toDataURL("image/png");
    a.click();
}

/* ================= DOWNLOAD BAR CHART (WHITE BG) ================= */
function downloadBarChart() {
    if (!barChartInstance) return alert("Bar chart not available");

    const a = document.createElement("a");
    a.download = "stacked_bar_chart.png";
    a.href = document.getElementById("barChart").toDataURL("image/png");
    a.click();
}
