const SHOP_NUMBER = "233257285582";
const PAY_NUMBER = "0257285582";

// Address of your API.
// Use http://localhost:3000 while testing on your computer,
// then change it to your hosted https address.
const API_BASE = "https://ernie-kess-api.onrender.com";

// Percentage charges
const RATES = {
  airtime: 0,
  data: 0,
  mashup: 0.10,
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
const submitBtn = document.getElementById("submitBtn");
const flowNote = document.getElementById("flowNote");
const formMsg = document.getElementById("formMsg");
const waFallback = document.getElementById("waFallback");

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

// Is this order paid online through the API and Paystack?
function usesApi() {
  return serviceInput.value === "airtime" || serviceInput.value === "data";
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
    option.dataset.size = item.name.split(" ")[1]; // e.g. "5GB"
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

// Tell the customer what happens next, and change the button
function updateFlowNote() {
  if (usesApi()) {
    flowNote.textContent = "Next: you will pay securely on Paystack's page with MTN, Telecel or AT mobile money.";
    submitBtn.textContent = "Pay Now";
  } else {
    flowNote.textContent = "Your order will be sent to us on WhatsApp.";
    submitBtn.textContent = "Send Order on WhatsApp";
  }
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

// Error messages
function showMsg(text, offerWhatsApp) {
  formMsg.textContent = text;
  formMsg.style.display = "block";
  waFallback.style.display = offerWhatsApp ? "block" : "none";
}

function clearMsg() {
  formMsg.style.display = "none";
  waFallback.style.display = "none";
}

// Talk to your API
async function api(method, path, body) {
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (e) {
    throw new Error("Could not reach the payment system.");
  }

  let data = {};
  try { data = await res.json(); } catch (e) {}

  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

// Make an order code like EK-1003-482 (used for WhatsApp orders)
function makeRef() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const random = Math.floor(100 + Math.random() * 900);
  return "EK-" + month + day + "-" + random;
}

 // ===== Online payment (airtime and data) =====
async function payOnline() {
  clearMsg();

  const name = document.getElementById("name").value.trim();
  const recipient = document.getElementById("recipient").value.trim();

  if (!name) {
    showMsg("Please enter your name.", false);
    return;
  }

  if (!/^0\d{9}$/.test(recipient)) {
    showMsg("Enter a valid 10-digit phone number, like 0241234567.", false);
    return;
  }

  if (usesBundles() && !bundleInput.value) {
    showMsg("Please choose a data package.", false);
    return;
  }

  const body = {
    name: name,
    service: serviceInput.value,
    network: networkInput.value,
    recipient: recipient,
    amount: amountInput.value
  };

  if (usesBundles()) {
    const opt = bundleInput.options[bundleInput.selectedIndex];

    // Send the complete package name expected by the API.
    body.package = opt.textContent.split(" - ")[0].trim();
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Please wait...";

  try {
    const pay = await api(
      "POST",
      "/api/payments/initialize",
      body
    );

    if (!pay.authorization_url) {
      throw new Error("The payment link was not returned.");
    }

    // Redirect the customer to Paystack.
    window.location.href = pay.authorization_url;

  } catch (err) {
    showMsg(
      err.message + " You can send this order on WhatsApp instead.",
      true
    );

    submitBtn.disabled = false;
    updateFlowNote();
  }
}
// ===== WhatsApp order (Mashup, bills, send money, and backup) =====
function sendOnWhatsApp() {
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
}

// ===== After the customer comes back from Paystack =====
async function trackPayment(reference) {
  document.getElementById("orderForm").style.display = "none";
  document.getElementById("notice").style.display = "none";
  document.getElementById("statusBox").style.display = "block";

  const title = document.getElementById("statusTitle");
  const text = document.getElementById("statusText");
  const wa = document.getElementById("statusWa");
  let tries = 0;

  async function check() {
    tries++;
    let order = null;

    try {
      order = await api("GET", "/api/payments/verify/" + encodeURIComponent(reference));
    } catch (e) {
      text.textContent = "Checking... (" + e.message + ")";
    }

    if (order) {
      wa.href = "https://wa.me/" + SHOP_NUMBER + "?text=" +
        encodeURIComponent("Hello, my order number is #" + order.id);

      if (order.status === "delivered") {
        title.textContent = "Delivered! Order #" + order.id;
        text.textContent = "Please check your phone. Thank you for choosing ERNIE-KESS ENTERPRISE.";
        return;
      }
      if (order.status === "delivery_failed") {
        title.textContent = "Order #" + order.id + ": payment received";
        text.textContent = "Your payment is safe, but there was a problem delivering. Message us on WhatsApp with this order number and we will fix it.";
        return;
      }
      if (order.status === "paid") {
        title.textContent = "Payment confirmed! Order #" + order.id;
        text.textContent = "We are sending your order now. This page updates by itself.";
      } else {
        title.textContent = "Waiting for your payment to confirm...";
        text.textContent = "If you have already paid, this takes a few seconds.";
      }
    }

    if (tries < 60) {
      setTimeout(check, 5000);
    } else {
      text.textContent = "This is taking longer than usual. Message us on WhatsApp with your order number.";
    }
  }

  check();
}

// ===== Events =====
serviceInput.addEventListener("change", function () {
  fillNetworks();
  refreshBundleUI();
  updateTotals();
  updateFlowNote();
  clearMsg();
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

  if (!networkInput.value) {
    showMsg("Please choose a network or biller.", false);
    return;
  }

  if (usesApi()) {
    payOnline();
  } else {
    sendOnWhatsApp();
  }
});

waFallback.addEventListener("click", sendOnWhatsApp);

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

// ===== Start =====
fillNetworks();
updateFlowNote();

const params = new URLSearchParams(window.location.search);
const returned = params.get("reference") || params.get("trxref");
const wanted = params.get("service");

if (returned) {
  trackPayment(returned);
} else if (wanted && NETWORKS[wanted]) {
  serviceInput.value = wanted;
  fillNetworks();
  refreshBundleUI();
  updateTotals();
  updateFlowNote();
}