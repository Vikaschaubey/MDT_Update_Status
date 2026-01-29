let cleanedData = [];
let chartInstance = null;

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

            // Detect vehicle type column
            let vehicleCol = null;
            if (data[0].hasOwnProperty("vehicle_type")) vehicleCol = "vehicle_type";
            else if (data[0].hasOwnProperty("vehicale_type")) vehicleCol = "vehicale_type";

            if (!vehicleCol) {
                alert("Vehicle type column not found");
                return;
            }

            cleanedData = data
                .map(row => {
                    // Remove unwanted columns
                    COLUMNS_TO_REMOVE.forEach(col => delete row[col]);

                    // Normalize vehicle type
                    row[vehicleCol] = String(row[vehicleCol] || "")
                        .trim()
                        .toLowerCase();

                    // Handle current_version
                    if (!row.current_version || row.current_version === "")
                        row.current_version = 0;

                    return row;
                })
                .filter(row =>
                    ["ambulance", "patrol vehicle", "crane"].includes(row[vehicleCol]) &&
                    String(row.intouch_active_status).toLowerCase() === "true"
                );

            drawChart();
        }
    });
}

function drawChart() {
    const versionCounts = {};

    cleanedData.forEach(row => {
        const v = row.current_version;
        versionCounts[v] = (versionCounts[v] || 0) + 1;
    });

    const labels = Object.keys(versionCounts);
    const values = Object.values(versionCounts);
    const total = values.reduce((a, b) => a + b, 0);

    const ctx = document.getElementById("pieChart");

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [{
                data: values
            }]
        },
        options: {
            plugins: {
                datalabels: {
                    color: "#ffffff",
                    font: {
                        weight: "bold",
                        size: 12
                    },
                    formatter: (value, context) => {
                        const pct = ((value / total) * 100).toFixed(1);
                        return `${context.chart.data.labels[context.dataIndex]}\n${value} (${pct}%)`;
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const pct = ((context.raw / total) * 100).toFixed(1);
                            return `${context.raw} (${pct}%)`;
                        }
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

function downloadCSV() {
    if (!cleanedData.length) {
        alert("No data to download");
        return;
    }

    const csv = Papa.unparse(cleanedData);
    const blob = new Blob([csv], { type: "text/csv" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "cleaned_data.csv";
    link.click();
}

function downloadChart() {
    if (!chartInstance) {
        alert("Chart not generated");
        return;
    }

    const link = document.createElement("a");
    link.download = "current_version_pie_chart.png";
    link.href = document.getElementById("pieChart").toDataURL("image/png");
    link.click();
}
