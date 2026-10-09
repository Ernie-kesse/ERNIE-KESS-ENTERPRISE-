const SHOP_NUMBER = "233257285582";
const PAY_NUMBER = "0257285582";

// Percentage charges
const RATES = {
  airtime: 0,
  data: 0,
  mashup: 0.1,
  bill: 0.012
};

// Choices shown in the Network / Biller dropdown
const NETWORKS = {
  airtime: ["MTN", "Telecel", "AT"],
  data: ["MTN", "Telecel", "AT"],
  mashup: ["MTN", "Telecel", "AT"],
  send: ["MTN", "Telecel", "AT"],
  bill: ["ECG", "Ghana Water", "DStv", "GOtv", "StarTimes", "Other"]
};

// ===== PACKAGES: your real data prices =====

// Builds a list like "MTN 1GB", "MTN 2GB"... at a fixed price per GB
function perGB(from, to, pricePerGB, label) {
  const list = [];
  for (let gb = from; gb <= to; gb++) {
    list.push({ name: label + " " + gb + "GB", price: gb * pricePerGB });
  }
  return list;
}

// MTN: GH₵6 per GB up to 9GB, then the bigger packages
const MTN_DATA = perGB(1, 9, 6, "MTN").concat([
  { name: "MTN 10GB", price: 58 },
  { name: "MTN 15GB", price: 85 },
  { name: "MTN 20GB", price: 112 },
  { name: "MTN 30GB", price: 165 },
  { name: "MTN 50GB", price: 270 }
]);

// Telecel and AT: GH₵5 per GB
const TELECEL_DATA = perGB(1, 10, 5, "Telecel");
const AT_DATA = perGB(1, 10, 5, "AT");

const BUNDLES = {
  data: { MTN: MTN_DATA, Telecel: TELECEL_DATA, AT: AT_DATA }
};

// Page elements (declared first, so everything below can use them)
const serviceInput = document.getElementById("service");
const networkInput = document.getElementById("network");
const bundleBox = document.getElementById("bundleBox");
const bundleInput = document.getElementById("bundle");
const amountInput = document.getElementById("amount");
const feeText = document.getElementById("fee");
const totalText = document.getElementById("total");

// Send-money fee rules
function sendFee(amount) {
  if (amount <= 0) return 0;
  if (amount <= 50) return 0.5;
  if (amount <= 100) return 1;
  if (amount <= 1000) return amount * 0.01;
  return null; // above 1000: negotiable
}

// Pick the right fee for the chosen service
function getFee(service, amount) {
  if (service === "send") return sendFee(amount);
  return amount * (RATES[service] || 0);
}

// Does this service use the package list?
function usesBundles() {
  return serviceInput.value === "data";
}

// Fill the Network / Biller dropdown to match the chosen service
function fillNetworks() {
  networkInput.innerHTML = '<option value="">Choose</option>';

  const choices = NETWORKS[serviceInput.value] || ["MTN", "Telecel", "AT"];

  choices.forEach(function (name) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    networkInput.appendChild(option);
  });
}

// Fill the Package dropdown for the chosen service and network
function fillBundles() {
  bundleInput.innerHTML = '<option value="">Choose package</option>';

  const byNetwork = BUNDLES[serviceInput.value] || {};
  const list = byNetwork[networkInput.value] || [];

  list.forEach(function (item) {
    const option = document.createElement("option");
    option.value = item.price;
    option.textContent = item.name + " - GH₵" + item.price;
    bundleInput.appendChild(option);
  });
}

// Show or hide the Package dropdown, and lock the amount when needed
function refreshBundleUI() {
  if (usesBundles()) {
    bundleBox.style.display = "block";
    bundleInput.required = true;
    amountInput.readOnly = true;
    fillBundles();
  } else {
    bundleBox.style.display = "none";
    bundleInput.required = false;
    amountInput.readOnly = false;
  }
  amountInput.value = "";
}

function updateTotals() {
  const amount = parseFloat(amountInput.value) || 0;
  const fee = getFee(serviceInput.value, amount);

  if (fee === null) {
    feeText.textContent = "Negotiable";
    totalText.textContent = "To be agreed on WhatsApp";
  } else {
    feeText.textContent = "GH₵ " + fee.toFixed(2);
    totalText.textContent = "GH₵ " + (amount + fee).toFixed(2);
  }
}

// Make an order code like EK-1003-482 (month, day, random number)
function makeRef() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const random = Math.floor(100 + Math.random() * 900);
  return "EK-" + month + day + "-" + random;
}

// Events
serviceInput.addEventListener("change", function () {
  fillNetworks();
  refreshBundleUI();
  updateTotals();
});

networkInput.addEventListener("change", function () {
  if (usesBundles()) {
    fillBundles();
    amountInput.value = "";
    updateTotals();
  }
});

bundleInput.addEventListener("change", function () {
  amountInput.value = bundleInput.value;
  updateTotals();
});

amountInput.addEventListener("input", updateTotals);

document.getElementById("orderForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const ref = makeRef();
  const serviceName = serviceInput.options[serviceInput.selectedIndex].text;

  let message =
    "NEW ORDER " + ref + "\n" +
    "Name: " + document.getElementById("name").value + "\n" +
    "Service: " + serviceName + "\n" +
    "Network/Biller: " + networkInput.value + "\n";

  if (usesBundles()) {
    message += "Package: " + bundleInput.options[bundleInput.selectedIndex].text + "\n";
  }

  message +=
    "Number/Account: " + document.getElementById("recipient").value + "\n" +
    "Amount: GH₵" + amountInput.value + "\n" +
    "Charge: " + feeText.textContent + "\n" +
    "Total: " + totalText.textContent;

  window.open("https://wa.me/" + SHOP_NUMBER + "?text=" + encodeURIComponent(message), "_blank");

  // Show the payment box with the order code
  document.getElementById("orderRef").textContent = ref;
  document.getElementById("payBox").style.display = "block";
});

// Copy button for the MoMo number
document.getElementById("copyBtn").addEventListener("click", function () {
  const btn = this;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(PAY_NUMBER).then(function () {
      btn.textContent = "Copied!";
    }).catch(function () {
      btn.textContent = "Copy failed - type the number";
    });
  } else {
    btn.textContent = "Copy failed - type the number";
  }
});

fillNetworks();
// Preselect the service from the link, e.g. order.html?service=data
const params = new URLSearchParams(window.location.search);
const wanted = params.get("service");

if (wanted && NETWORKS[wanted]) {
  serviceInput.value = wanted;
  fillNetworks();
  refreshBundleUI();
  updateTotals();
}