import * as pdfjsLib from 'https://mozilla.github.io/pdf.js/build/pdf.mjs';

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.mjs';

document.getElementById('toggle-carat').addEventListener('change', function(event) {
    const cells = document.querySelectorAll('.constituent');
    cells.forEach(cell => {
        if (cell.innerHTML.includes('&lt;')) {
            cell.innerHTML = cell.innerHTML.replace('&lt;', '');
            cell.classList.add('non-detect');
        } else {
            if (cell.classList.contains('non-detect')) {
                cell.innerHTML = '&lt;' + cell.innerHTML;
                cell.classList.remove('non-detect');
            }
        }
    })
})

// Handle file input
document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function() {
            try {
                const arrayBuffer = reader.result;
                processPDF(arrayBuffer);
            } catch (error) {
                console.error("Error Processing PDF:", error);
            }
            
        };
        reader.readAsArrayBuffer(file);
    }
});

async function processPDF(arrayBuffer) {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let textContent = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        textContent += content.items.map(item => item.str).join(' ') + ' ';
    }

    console.log(textContent);
    extractResults(textContent);
}

function extractResults(text) {
    // Regular expression to match sample data, including sampling date
    const samplePattern = /Sample:\s+([^\s]+).*?Lab ID:\s+(\d+).*?Collected:\s+([^\s]+).*?Parameters\s+Results[\s\S]*?Analytical Method:\s+EPA\s(8011|8260|8015B)([\s\S]*?)REPORT OF LABORATORY ANALYSIS/gi;
    
    // Adjusted pattern to capture parameter, value, unit, date, etc.                                                                                                                                                                                                                                                                                            // Match ND, Number, <Number, and J-flags
    const resultPattern = /(\bbenzene\b|\bethylbenzene\b|\btph-gro\b|\bgasoline range organics\b|\btoluene\b|\bMethyl-tert-butyl ether\b|\bTotal Petroleum Hydrocarbons\b|\bDiesel Fuel\b|\bFuel Oil\b|\bJet Fuel\b|\bKerosene\b|\bMineral Spirits\b|\bMotor Oil\b|\bxylene \(total\)\b|\b1,2-Dichloroethane\b|\b1,2-Dibromoethane \(EDB\)\b|\bNaphthalene\b)\s+(ND|<[\d\.]+|[\d\.]+J|[\d\.]+)(?:.*?)(\d+\.\d*)/gi;
                        
    let match;
    const results = [];

    while ((match = samplePattern.exec(text)) !== null) {

        console.log(match);

        const resultsSection = match[0];
        const sampleId = match[1];
        const sampleDate = match[3];
        const analysis = match[5];

        console.log(`Extracting results for Sample ID: ${sampleId}`); // Debug log
        console.log(`Results Section: ${analysis}`); // Debug log
        
        const resultMatch = [...analysis.matchAll(resultPattern)];

        console.log("Matched results", resultMatch);

        // Initialize default values
        let benzene = '';
        let toluene = '';
        let ethylbenzene = '';
        let xylenes = '';
        let tphGRO = '';
        let mtbe = ''; 
        let teph = 0;
        let tephMax = 0;
        let EDB = '';
        let DCA = '';
        let naph = '';

        resultMatch.forEach(([_, param, value, reportLimit]) => {
            let finalValue = value === 'ND' ? '<' + reportLimit : value;

            // Debug log for each parameter
            console.log(`Param: ${param}, Value: ${value}, Report Limit: ${reportLimit}`); 

            // Check for known parameters
            switch (param.toLowerCase()) {
                case 'benzene':
                    benzene = finalValue;
                    break;
                case 'toluene':
                    toluene = finalValue;
                    break;
                case 'ethylbenzene':
                    ethylbenzene = finalValue;
                    break;
                case 'xylene (total)':
                    xylenes = finalValue;
                    break;
                case 'gasoline range organics':
                case 'tph-gro':
                    tphGRO = finalValue;
                    break;
                case 'methyl-tert-butyl ether':
                case 'mtbe':
                    mtbe = finalValue;
                    break;
                case 'diesel fuel': // Add TEPH-related parameters to evaluation
                case 'fuel oil':
                case 'jet fuel':
                case 'kerosene':
                case 'mineral spirits':
                case 'motor oil':
                case 'total petroleum hydrocarbons':
                    if (finalValue > tephMax) {
                        tephMax = finalValue; // Update max value
                        teph = value;        // Store raw value
                    }
                    break;
                case '1,2-dibromoethane (edb)':
                    EDB = finalValue;
                    break;
                case '1,2-dichloroethane':
                    DCA = finalValue;
                    break;
                case 'naphthalene':
                    naph = finalValue;
                    break;
            }
        });

        results.push({ sampleId, sampleDate, benzene, toluene, ethylbenzene, xylenes, mtbe, tphGRO, teph, EDB, DCA, naph });
    }

    console.log(`Results Extracted:`, results); // Debug log for results
    displayResults(results);
}

function displayResults(results) {
    const tableBody = document.querySelector('#resultsTable');
    tableBody.innerHTML = ''; // Clear existing rows

    results.forEach(result => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${result.sampleId}</td>
            <td>${result.sampleDate}</td>
            <td class="constituent">${result.benzene}</td>
            <td class="constituent">${result.toluene}</td>
            <td class="constituent">${result.ethylbenzene}</td>
            <td class="constituent">${result.xylenes}</td>
            <td class="constituent">${result.mtbe || ''}</td> <!-- Empty if MTBE is not present -->
            <td class="constituent">${result.tphGRO}</td>
            <td class="constituent">${result.teph}</td> <!-- Empty if TEPH not present -->
            <td class="constituent">${result.EDB}</td>
            <td class="constituent">${result.DCA}</td> 
            <td class="constituent">${result.naph}</td> 
        `;
        tableBody.appendChild(row);
    });
}
