const LIFE_TABLE = { 30: 55.3, 31: 54.4, 32: 53.4, 33: 52.5, 34: 51.5, 35: 50.5, 40: 45.7, 45: 41.0, 50: 36.2, 55: 31.6, 60: 27.1 };

function calculatePMT(rate, nper, pv) {
    if (rate === 0) return pv / nper;
    return (rate * pv) / (1 - Math.pow(1 + rate, -nper));
}

function updateDefaults() {
    const country = document.getElementById('country').value;
    const defaults = {
        "India": { sym: "₹", exch: 84.00, deval: 2, growth: 7 },
        "Singapore": { sym: "S$", exch: 60, deval: 0, growth: 6 },
        "Dubai": { sym: "AED", exch: 3, deval: 0, growth: 5 },
        "UK": { sym: "£", exch: 1, deval: 0, growth: 6 }
    };
    const data = defaults[country];
    if (data) {
        document.getElementById('currency-symbol').value = data.sym;
        document.getElementById('base-exchange').value = data.exch;
        document.getElementById('devaluation-rate').value = data.deval;
        document.getElementById('growth-rate').value = data.growth;
    }
}

function runCalculations(e) {
    if (e) e.preventDefault();
    
    const form = document.getElementById('calc-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const balance = Math.round(parseFloat(document.getElementById('balance').value));
    const startAge = parseInt(document.getElementById('age').value);
    const growthInput = parseFloat(document.getElementById('growth-rate').value) / 100;
    const exchBase = parseFloat(document.getElementById('base-exchange').value);
    const deval = parseFloat(document.getElementById('devaluation-rate').value) / 100;
    const status = document.getElementById('status').value;
    const country = document.getElementById('country').value;
    const sym = document.getElementById('currency-symbol').value;
    const stateTaxRate = (status === 'citizen') ? (parseFloat(document.getElementById('state-tax').value) / 100 || 0) : 0;

    document.getElementById('results-area').style.display = 'block';

    const treatyRate = { "India": 0.15, "Singapore": 0.30, "Dubai": 0.30, "UK": 0.00 }[country] || 0.30;
    const lumpPenalty = Math.round(balance * 0.1);
    const lumpTax = Math.round(balance * (treatyRate + stateTaxRate));
    
    const nper = LIFE_TABLE[startAge] || (82.0 - startAge);
    const annualSEPP = Math.round(calculatePMT(0.05, nper, balance));
    
    let currentBalance = balance;
    let totalTaxesPaid = 0;
    let totalWithdrawn = 0;
    const tbody = document.querySelector('#adventure-table tbody');
    tbody.innerHTML = '';

    for (let age = startAge; age <= 59; age++) {
        const growthAmt = Math.round(currentBalance * growthInput);
        const fedStep = (age - startAge < 3) ? 0.18 : 0.27;
        const totalTaxRate = fedStep + stateTaxRate;
        const taxPaidYearly = Math.round(annualSEPP * totalTaxRate);
        const endYearBalance = currentBalance + growthAmt - annualSEPP;
        
        totalTaxesPaid += taxPaidYearly;
        totalWithdrawn += annualSEPP;

        let localStatus = "Resident";
        let statusDesc = "Standard Residency.";
        if (country === "India") {
            const isRNOR = (age - startAge < 3);
            localStatus = isRNOR ? "RNOR" : "ROR";
            statusDesc = isRNOR ? "RNOR: Foreign income usually exempt from local tax." : "ROR: Worldwide income taxable locally.";
        }

        const currentExch = exchBase * Math.pow(1 + deval, age - startAge);
        const netMo = Math.round(((annualSEPP - taxPaidYearly) / 12) * currentExch);

        tbody.innerHTML += `<tr>
            <td>${2026 + (age - startAge)}</td><td>${age === 59 ? "59.5" : age}</td>
            <td class="status-cell" title="${statusDesc}">${localStatus}</td>
            <td>$${currentBalance.toLocaleString()}</td><td>$${growthAmt.toLocaleString()}</td>
            <td>$${annualSEPP.toLocaleString()}</td><td>${(totalTaxRate * 100).toFixed(1)}%</td>
            <td class="text-danger">$${taxPaidYearly.toLocaleString()}</td>
            <td>$${endYearBalance.toLocaleString()}</td><td>${sym}${netMo.toLocaleString()}</td>
            <td></td>
        </tr>`;
        currentBalance = endYearBalance;
    }

    const seppNet = totalWithdrawn - totalTaxesPaid;
    const lumpNet = balance - lumpPenalty - lumpTax;

    document.getElementById('sepp-amount').innerText = "$" + annualSEPP.toLocaleString();
    document.getElementById('total-sepp-withdrawn').innerText = "$" + totalWithdrawn.toLocaleString();
    document.getElementById('total-sepp-taxes').innerText = "$" + totalTaxesPaid.toLocaleString();
    document.getElementById('net-sepp-withdrawn').innerText = "$" + seppNet.toLocaleString();
    document.getElementById('final-sepp-balance').innerText = "$" + currentBalance.toLocaleString();
    
    document.getElementById('lump-sum-penalty').innerText = "-$" + lumpPenalty.toLocaleString();
    document.getElementById('lump-sum-taxes').innerText = "-$" + lumpTax.toLocaleString();
    document.getElementById('lump-sum-final-net').innerText = "$" + lumpNet.toLocaleString();
    document.getElementById('tax-percent-display').innerText = ((treatyRate + stateTaxRate) * 100).toFixed(1);

    const maxVal = Math.max(lumpNet, seppNet);
    document.getElementById('bar-lump').style.width = (lumpNet / maxVal * 100) + "%";
    document.getElementById('bar-sepp').style.width = (seppNet / maxVal * 100) + "%";
    document.getElementById('bar-lump-val').innerText = "$" + lumpNet.toLocaleString();
    document.getElementById('bar-sepp-val').innerText = "$" + seppNet.toLocaleString();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('calc-form').addEventListener('submit', runCalculations);
    document.getElementById('country').addEventListener('change', updateDefaults);
    document.getElementById('status').addEventListener('change', () => {
        const status = document.getElementById('status').value;
        const groups = [document.getElementById('state-name-group'), document.getElementById('state-tax-group')];
        groups.forEach(g => status === 'nra' ? g.classList.add('disabled') : g.classList.remove('disabled'));
    });
});