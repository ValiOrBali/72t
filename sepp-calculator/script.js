// Initialize Pyodide and the Python environment
async function main() {
    // 1. Load the Pyodide engine
    let pyodide = await loadPyodide();
    
    // 2. Load the financial library for the PMT calculation
    await pyodide.loadPackage("numpy-financial");

    // 3. Define the Python Logic as a string
    const pythonCode = `
import numpy_financial as npf

def calculate_sepp(balance, age, country, is_citizen):
    # IRS Single Life Expectancy Table (Notice 2022-6)
    life_expectancy_table = {
        30: 55.3, 35: 50.5, 40: 45.7, 45: 41.0, 50: 36.2, 55: 31.6, 60: 27.1
    }
    
    # Get expectancy (default to 41.0 if age not in list)
    n = life_expectancy_table.get(age, 41.0)
    
    # Use 5% interest floor per IRS rules
    r = 0.05 
    
    # Calculate Amortization
    annual_gross = abs(npf.pmt(r, n, balance))
    
    # Calculate Tax
    # Treaty rates: India 15%, UK 0%, Others/Dubai/Singapore 30%
    treaty_rates = {"India": 0.15, "UK": 0.00, "Singapore": 0.30, "Dubai": 0.30}
    rate = treaty_rates.get(country, 0.30)
    
    if is_citizen:
        taxable = max(0, annual_gross - 16100) # 2026 Std Deduction
        tax = taxable * 0.11 # Avg effective rate
    else:
        tax = annual_gross * rate # Flat NRA tax
        
    penalty_saved = balance * 0.10
    lump_sum_net = balance * (1 - (rate + 0.10))
    
    return [round(annual_gross, 2), round(penalty_saved, 2), round(lump_sum_net, 2)]
    `;

    // 4. Register the code in the Python namespace
    pyodide.runPython(pythonCode);

    // 5. Connect the HTML Button to the Python Function
    document.querySelector('.btn-calculate').addEventListener('click', () => {
        // Collect data from HTML form
        const balance = parseFloat(document.getElementById('balance').value) || 0;
        const age = parseInt(document.getElementById('age').value) || 45;
        const country = document.getElementById('country').value;
        const isCitizen = document.getElementById('citizen').value === 'citizen';

        // Execute Python function and convert results to JS Array
        const results = pyodide.globals.get('calculate_sepp')(balance, age, country, isCitizen).toJs();

        // Update the UI cards
        document.getElementById('sepp-amount').innerText = "$" + results[0].toLocaleString();
        document.getElementById('penalty-saved').innerText = "$" + results[1].toLocaleString();
        document.getElementById('lump-sum-net').innerText = "$" + results[2].toLocaleString();
    });
    
    console.log("Python 72(t) Engine Ready!");
}

// Run the main loader
main();