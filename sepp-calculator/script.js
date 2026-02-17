const LIFE_TABLE = { 30: 55.3, 31: 54.4, 32: 53.4, 33: 52.5, 34: 51.5, 35: 50.5, 40: 45.7, 45: 41.0, 50: 36.2, 55: 31.6, 60: 27.1 };

function calculatePMT(rate, nper, pv) {
    if (rate === 0) return pv / nper;
    return (rate * pv) / (1 - Math.pow(1 + rate, -nper));
}

// NEW: Update defaults based on destination
function updateDestinationDefaults() {
    const country = document.getElementById('country').value;
    const symbolInput = document.getElementById('currency-symbol');
    const exchangeInput = document.getElementById('base-exchange');
    const devalInput = document.getElementById('devaluation-rate');

    const defaults = {
        "India": { sym: "₹", exch: 84.00, deval: 2 },
        "Singapore": { sym: "S$", exch: 1.34, deval: 0 },
        "Dubai": { sym: "AED", exch: 3.67, deval: 0 },
        "UK": { sym: "£", exch: 0.79, deval: -1 } // Negative for appreciation
    };

    const data = defaults[country];
    if (data) {
        symbolInput.value = data.sym;
        exchangeInput.value = data.exch;
        devalInput.value = data.deval;
    }
    runCalculations();
}

function toggleStateInputs() {
    const status = document.getElementById('status').value;
    const groups = [document.getElementById('state-name-group'), document.getElementById('state-tax-group')];
    groups.forEach(g => status === 'nra' ? g.classList.add('disabled') : g.classList.remove('disabled'));
}

function runCalculations() {
    const balance = Math.round(parseFloat(document.getElementById('balance').value)) || 0;
    const startAge = parseInt(document.getElementById('age').value) || 40;
    const status = document.getElementById('status').value;
    const country = document.getElementById('country').value;
    const growthInput = parseFloat(document.getElementById('growth-rate').value) / 100 || 0;
    const stateTaxRate = (status === 'citizen') ? (parseFloat(document.getElementById('state-tax').value) / 100 || 0) : 0;
    const sym = document.getElementById('currency-symbol').value;
    const exchBase = parseFloat(document.getElementById('base-exchange').value) || 1;
    const deval = parseFloat(document.getElementById('devaluation-rate').value) / 100 || 0;

    const treatyRate = { "India": 0.15, "Singapore": 0.30, "Dubai": 0.30, "UK": 0.00 }[country] || 0.30;
    const lumpPenalty = Math.round(balance * 0.1);
    const lumpTax = Math.round(balance * (treatyRate + stateTaxRate));
    
    document.getElementById('tax-percent-display').innerText = ((treatyRate + stateTaxRate) * 100).toFixed(1);
    document.getElementById('lump-sum-penalty').innerText = "-$" + lumpPenalty.toLocaleString();
    document.getElementById('lump-sum-taxes').innerText = "-$" + lumpTax.toLocaleString();
    document.getElementById('lump-sum-final-net').innerText = "$" + (balance - lumpPenalty - lumpTax).toLocaleString();

    const nper = LIFE_TABLE[startAge] || (82.0 - startAge);
    const annualSEPP = Math.round(calculatePMT(0.05, nper, balance));
    document.getElementById('sepp-amount').innerText = "$" + annualSEPP.toLocaleString();

    const tbody = document.querySelector('#adventure-table tbody');
    tbody.innerHTML = '';
    let currentBalance = balance;
    let totalTaxesPaid = 0;
    let totalWithdrawn = 0;

    for (let age = startAge; age <= 59; age++) {
        const growthAmt = Math.round(currentBalance * growthInput);
        const fedStep = (age - startAge < 3) ? 0.18 : 0.27;
        const totalTaxRate = fedStep + stateTaxRate;
        const taxPaidYearly = Math.round(annualSEPP * totalTaxRate);
        const endYearBalance = currentBalance + growthAmt - annualSEPP;
        
        totalTaxesPaid += taxPaidYearly;
        totalWithdrawn += annualSEPP;

        let localStatus = "Resident";
        if (country === "India") localStatus = (age - startAge < 3) ? "RNOR" : "ROR";

        // Local Currency logic using dynamic symbol and exchange/devaluation
        const currentExch = exchBase * Math.pow(1 + deval, age - startAge);
        const netMo = Math.round(((annualSEPP - taxPaidYearly) / 12) * currentExch);

        tbody.innerHTML += `<tr>
            <td>${2026 + (age - startAge)}</td><td>${age === 59 ? "59.5" : age}</td>
            <td class="status-cell">${localStatus}</td>
            <td>$${currentBalance.toLocaleString()}</td><td>$${growthAmt.toLocaleString()}</td>
            <td>$${annualSEPP.toLocaleString()}</td><td>${(totalTaxRate * 100).toFixed(1)}%</td>
            <td class="text-danger">$${taxPaidYearly.toLocaleString()}</td>
            <td>$${endYearBalance.toLocaleString()}</td><td>${sym}${netMo.toLocaleString()}</td>
            <td></td>
        </tr>`;
        currentBalance = endYearBalance;
    }

    // UPDATED SUMMARY: Include Net Withdrawn
    document.getElementById('total-sepp-withdrawn').innerText = "$" + totalWithdrawn.toLocaleString();
    document.getElementById('total-sepp-taxes').innerText = "$" + totalTaxesPaid.toLocaleString();
    document.getElementById('net-sepp-withdrawn').innerText = "$" + (totalWithdrawn - totalTaxesPaid).toLocaleString();
    document.getElementById('final-sepp-balance').innerText = "$" + currentBalance.toLocaleString();
    document.getElementById('summary-penalty-saved').innerText = "$" + lumpPenalty.toLocaleString();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('status').addEventListener('change', () => { toggleStateInputs(); runCalculations(); });
    document.getElementById('country').addEventListener('change', updateDestinationDefaults); // AUTO-SWITCH SYMBOLS
    document.getElementById('btn-calculate').addEventListener('click', runCalculations);
    toggleStateInputs();
    runCalculations();
});