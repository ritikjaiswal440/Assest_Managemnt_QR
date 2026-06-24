const API_URL = "https://script.google.com/macros/s/AKfycbyUJ5Dahyuf8bACvqyUCGpN-qpTLnXH1U60pwzVuKmaivfNP_-ErzRJ89HEcyBGnWzh/exec";

async function run() {
  try {
    const res = await fetch(API_URL + "?action=getDropdownData", {
      method: "POST",
      body: JSON.stringify({ action: "getDropdownData" })
    });
    const json = await res.json();
    console.log("--- COMPANIES FROM DROPDOWN ---");
    console.log(json.data ? json.data.companies.slice(0, 15) : "No data");
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
