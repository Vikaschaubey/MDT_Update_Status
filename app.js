let cleanedData = [];
let pieChartInstance = null;
let barChartInstance = null;

// Columns to remove
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

            let vehicleCol = null;
            if ("vehicle_type" in data[0]) vehicleCol = "vehicle_type";
            else if ("vehicale_type" in data[0]) vehicleCol = "vehicale_type";

            if (!vehicleCol) {
                alert("Vehicle type column not found");
                return;
            }

            cleanedData = data
                .map(row => {
                    COLUMNS_TO_REMOVE.forEach(col => delete row[col]);

                    row[vehicleCol] = String(row[vehicleCol] || "")
                        .trim().toLowerCase();

                    if (!row.current_version) row.current_version = "0";

                    return row;
                })
                .filter(row =>
                    ["ambulance", "crane", "patrol vehicle"]
                        .includes(row[vehicleCol]) &&
                    String(row.intouch_active_status).toLowerCase() === "true"
                );

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
    const total = values.reduce((a,b)=>a+b,0);

    const ctx = document.getElementById("pieChart");

    if (pieChartInstance) pieChartInstance.destroy();

    pieChartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [{ data: values }]
        },
        options: {
            plugins: {
                datalabels: {
                    color: "#fff",
                    font: { weight: "bold" },
                    formatter: (value, ctx) => {
                        const pct = ((value / total) * 100).toFixed(1);
                        return `${ctx.chart.data.labels[ctx.dataIndex]}\n${value} (${pct}%)`;
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

/* ================= STACKED BAR CHART ================= */
function drawStackedBarChart(vehicleCol) {

    const vehicles = ["ambulance", "crane", "patrol vehicle"];
    const versions = ["0", "2.0.8", "2.0.9"];

    const counts = {};
    vehicles.forEach(v => {
        counts[v] = { "0": 0, "2.0.8": 0, "2.0.9": 0 };
    });

    cleanedData.forEach(row => {
        const vType = row[vehicleCol];
        const ver = row.current_version;
        if (counts[vType] && counts[vType][ver] !== undefined) {
            counts[vType][ver]++;
        }
    });

    const datasets = versions.map(version => ({
        label: version,
        data: vehicles.map(v => counts[v][version]),
        stack: "versions"
    }));

    const ctx = document.getElementById("barChart");

    if (barChartInstance) barChartInstance.destroy();

    barChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: vehicles.map(v => v.toUpperCase()),
            datasets: datasets
        },
        options: {
            responsive: true,
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true }
            },
            plugins: {
                datalabels: {
                    color: "#fff",
                    font: {
                        weight: "bold",
                        size: 11
                    },
                    formatter: (value) => {
                        return value > 0 ? value : "";
                    },
                    anchor: "center",
                    align: "center"
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.raw}`;
                        }
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}


/* ================= DOWNLOADS ================= */
/* ================= DOWNLOAD CSV ================= */
function downloadCSV() {
    if (!cleanedData.length) {
        alert("No data available");
        return;
    }

    const csv = Papa.unparse(cleanedData);
    const blob = new Blob([csv], { type: "text/csv" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cleaned_data.csv";
    a.click();
}

/* ================= DOWNLOAD PIE CHART ================= */
function downloadPieChart() {
    if (!pieChartInstance) {
        alert("Pie chart not available");
        return;
    }

    const link = document.createElement("a");
    link.download = "current_version_pie_chart.png";
    link.href = document.getElementById("pieChart").toDataURL("image/png");
    link.click();
}

/* ================= DOWNLOAD BAR CHART ================= */
function downloadBarChart() {
    if (!barChartInstance) {
        alert("Bar chart not available");
        return;
    }

    const link = document.createElement("a");
    link.download = "vehicle_version_stacked_bar_chart.png";
    link.href = document.getElementById("barChart").toDataURL("image/png");
    link.click();
}
