const LIFE_TABLE = { 30: 55.3, 31: 54.4, 32: 53.4, 33: 52.5, 34: 51.5, 35: 50.5, 40: 45.7, 45: 41.0, 50: 36.2, 55: 31.6, 60: 27.1 };

function calculatePMT(rate, nper, pv) {
    if (rate === 0) return pv / nper;
    return (rate * pv) / (1 - Math.pow(1 + rate, -nper));
}

function updateDefaults() {
    const country = document.getElementById('country').value;
    const defaults = {
        "India": { sym: "₹", exch: 84.00, deval: 2, growth: 7, treaty: 0.15, local: 0.00 },
        "Singapore": { sym: "S$", exch: 1.34, deval: 0, growth: 6, treaty: 0.30, local: 0.00 },
        "Dubai": { sym: "AED", exch: 3.67, deval: 0, growth: 5, treaty: 0.30, local: 0.00 },
        "UK": { sym: "£", exch: 0.79, deval: 0, growth: 6, treaty: 0.00, local: 0.20 }
    };
    const data = defaults[country];
    if (data) {
        document.getElementById('currency-symbol').value = data.sym;
        document.getElementById('base-exchange').value = data.exch;
        document.getElementById('devaluation-rate').value = data.deval;
        document.getElementById('growth-rate').value = data.growth;
        // Hidden or global variables to store the rates for the loop
        window.currentTreatyRate = data.treaty;
    }
}

function runCalculations(e) {
    if (e) e.preventDefault();
    const form = document.getElementById('calc-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const balance = Math.round(parseFloat(document.getElementById('balance').value));
    const startAge = parseInt(document.getElementById('age').value);
    const growthInput = parseFloat(document.getElementById('growth-rate').value) / 100;
    const exchBase = parseFloat(document.getElementById('base-exchange').value);
    const deval = parseFloat(document.getElementById('devaluation-rate').value) / 100;
    const status = document.getElementById('status').value;
    const country = document.getElementById('country').value;
    const sym = document.getElementById('currency-symbol').value;
    const method = document.getElementById('method').value;
    const stateTaxRate = parseFloat(document.getElementById('state-tax').value) / 100 || 0;

    document.getElementById('results-area').style.display = 'block';

    // 1. Lump Sum Population Fix
    const treatyRates = { "India": 0.15, "Singapore": 0.30, "Dubai": 0.30, "UK": 0.00 };
    const selectedTreaty = treatyRates[country] || 0.30;
    const totalLumpTaxRate = selectedTreaty + stateTaxRate;
    const lumpPenalty = Math.round(balance * 0.1);
    const lumpTaxValue = Math.round(balance * totalLumpTaxRate);
    const lumpNetValue = balance - lumpPenalty - lumpTaxValue;

    document.getElementById('lump-sum-penalty').innerText = "-$" + lumpPenalty.toLocaleString();
    document.getElementById('lump-sum-taxes').innerText = "-$" + lumpTaxValue.toLocaleString();
    document.getElementById('lump-sum-final-net').innerText = "$" + lumpNetValue.toLocaleString();
    document.getElementById('tax-percent-display').innerText = (totalLumpTaxRate * 100).toFixed(1);

    // 2. SEPP Logic
    const nperInit = LIFE_TABLE[startAge] || (82.0 - startAge);
    let seppYearOne;

    if (method === 'rmd') {
        seppYearOne = Math.round(balance / nperInit);
        document.getElementById('method-label').innerText = "RMD Method (Recalculated Yearly)";
    } else if (method === 'annuitization') {
        const factor = (1 - Math.pow(1 + 0.05, -nperInit)) / 0.05;
        seppYearOne = Math.round(balance / factor);
        document.getElementById('method-label').innerText = "Fixed Annuitization";
    } else {
        seppYearOne = Math.round(calculatePMT(0.05, nperInit, balance));
        document.getElementById('method-label').innerText = "Fixed Amortization";
    }

    let currentBalance = balance;
    let totalWithdrawn = 0;
    let totalTaxesPaid = 0;
    const tbody = document.querySelector('#adventure-table tbody');
    tbody.innerHTML = '';

    // 3. Forecast Table
    for (let age = startAge; age <= 59; age++) {
        const nperCurrent = LIFE_TABLE[age] || (82.0 - age);
        const yearlySEPP = (method === 'rmd') ? Math.round(currentBalance / nperCurrent) : seppYearOne;

        // NEW RESIDENCY LOGIC START
        let localStatus = "Resident";
        let statusDesc = "Standard Tax Residency."; // This will be your hover text
        const yearsElapsed = age - startAge;

        switch (country) {
            case "India":
                const isRNOR = (yearsElapsed < 3);
                localStatus = isRNOR ? "RNOR" : "ROR";
                statusDesc = isRNOR ? "Resident but Not Ordinarily Resident: Foreign income (401k) is generally not taxable in India." : "Resident Ordinarily Resident: Worldwide income is taxable in India.";
                break;
            case "Singapore":
                localStatus = "Resident";
                statusDesc = "Singapore Tax Resident: Foreign-sourced income received in Singapore is generally tax-exempt.";
                break;
            case "Dubai":
                localStatus = "Resident";
                statusDesc = "UAE Tax Resident: No personal income tax on foreign or local income.";
                break;
            case "UK":
                const isNonDom = (yearsElapsed < 7);
                localStatus = isNonDom ? "Non-Dom" : "Resident";
                statusDesc = isNonDom ? "Remittance Basis: Only foreign income brought into the UK is taxed." : "Arising Basis: Worldwide income is subject to UK tax.";
                break;
            default:
                localStatus = "Resident";
                statusDesc = "Standard Residency Status.";
        }

        // Inside the for loop in script.js
        let fedRate = 0.30; // Default US Backup Rate

        switch (country) {
            case "India":
                // India: US taxes at 15% (Treaty) + India taxes 0% during RNOR
                fedRate = (yearsElapsed < 3) ? 0.15 : 0.25;
                break;
            case "Singapore":
                // Singapore: Generally 30% US tax; 0% Local on foreign-sourced income
                fedRate = 0.30;
                break;
            case "Dubai":
                // Dubai: 30% US tax; 0% Local tax
                fedRate = 0.30;
                break;
            case "UK":
                // UK: 0% US tax (Treaty); UK taxes on arising basis
                fedRate = (yearsElapsed < 7) ? 0.00 : 0.20;
                break;
        }

        // NEW RESIDENCY LOGIC END
        const growthAmt = Math.round(currentBalance * growthInput);
        const taxRate = fedRate + stateTaxRate;
        const taxYearly = Math.round(yearlySEPP * taxRate);
        const endBal = currentBalance + growthAmt - yearlySEPP;
        const currentExch = exchBase * Math.pow(1 + deval, age - startAge);
        const netMo = Math.round(((yearlySEPP - taxYearly) / 12) * currentExch);

        // Updated Table Row Injection in Section 3
        tbody.innerHTML += `<tr>
    <td>${2026 + yearsElapsed}</td>
    <td>${age === 59 ? "59.5" : age}</td>
    <td style="text-align: left;">
        <div class="tooltip">${localStatus}
            <span class="tooltiptext">${statusDesc}</span>
        </div>
    <td>$${currentBalance.toLocaleString()}</td>
    <td>$${growthAmt.toLocaleString()}</td>
    <td>$${yearlySEPP.toLocaleString()}</td>
    <td>${(taxRate * 100).toFixed(1)}%</td>
    <td class="text-danger">$${taxYearly.toLocaleString()}</td>
    <td style="color:var(--success); font-weight:bold;">$${endBal.toLocaleString()}</td>
    <td>${sym}${netMo.toLocaleString()}</td>
    <td></td>
</tr>`;

        totalWithdrawn += yearlySEPP;
        totalTaxesPaid += taxYearly;
        currentBalance = endBal;
    }

    // 4. SEPP Summary Card
    document.getElementById('sepp-amount').innerText = "$" + seppYearOne.toLocaleString();
    document.getElementById('total-sepp-withdrawn').innerText = "$" + totalWithdrawn.toLocaleString();
    document.getElementById('total-sepp-taxes').innerText = "$" + totalTaxesPaid.toLocaleString();
    document.getElementById('net-sepp-withdrawn').innerText = "$" + (totalWithdrawn - totalTaxesPaid).toLocaleString();
    document.getElementById('final-sepp-balance').innerText = "$" + currentBalance.toLocaleString();
}

document.addEventListener('DOMContentLoaded', () => {
    // Existing submit and country change listeners
    document.getElementById('calc-form').addEventListener('submit', runCalculations);
    document.getElementById('country').addEventListener('change', updateDefaults);

    const statusSelect = document.getElementById('status');
    const stateSelect = document.getElementById('state-name');
    const stateTaxInput = document.getElementById('state-tax');

    // 1. Auto-populate State Tax based on selection
    stateSelect.addEventListener('change', function () {
        const selectedOption = this.options[this.selectedIndex];
        const taxRate = selectedOption.getAttribute('data-tax');

        if (taxRate !== null) {
            stateTaxInput.value = taxRate;
        }
    });

    // 2. Updated NRA Logic to handle both fields
    statusSelect.addEventListener('change', function () {
        const isNRA = (this.value === 'nra');
        const stateNameGroup = stateSelect.closest('.input-group');
        const stateTaxGroup = stateTaxInput.closest('.input-group');

        if (isNRA) {
            stateNameGroup.classList.add('disabled');
            stateTaxGroup.classList.add('disabled');
            stateSelect.value = "";
            stateTaxInput.value = 0;
        } else {
            stateNameGroup.classList.remove('disabled');
            stateTaxGroup.classList.remove('disabled');
        }
    });
});