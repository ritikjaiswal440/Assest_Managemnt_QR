const API_URL = "https://script.google.com/macros/s/AKfycbyUJ5Dahyuf8bACvqyUCGpN-qpTLnXH1U60pwzVuKmaivfNP_-ErzRJ89HEcyBGnWzh/exec";

async function run() {
  try {
    console.log("Fetching grouped companies with project-level SLAs...");
    const res = await fetch(API_URL + "?action=getCompanies");
    const json = await res.json();
    console.log("--- DEPLOYED COMPANIES & SALES ORDERS ---");
    if (json.data && Array.isArray(json.data)) {
      json.data.slice(0, 5).forEach(company => {
        console.log(`\nCompany: ${company.Company_Name} (${company.Ref_Code})`);
        if (company.branches) {
          company.branches.forEach(branch => {
            console.log(` - Branch: ${branch.Location} > ${branch.Branch}`);
            if (branch.salesOrders && branch.salesOrders.length > 0) {
              branch.salesOrders.forEach(so => {
                console.log(`   * Sales Order: ${so.soId} | Status: ${so.status}`);
              });
            } else {
              console.log("   * No sales orders found.");
            }
          });
        }
      });
    } else {
      console.log("No data returned or error:", json.message);
    }
  } catch (error) {
    console.error("Verification Error:", error);
  }
}

run();
