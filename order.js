const SHOP_NUMBER = "233257285582";
const PAY_NUMBER = "0257285582";

// Production API. Change to http://localhost:3000 for local frontend testing.
const API_BASE = "https://ernie-kess-api.onrender.com";

// ===== Charges (must match server.js) =====
const RATES = { airtime: 0.10, data: 0, mashup: 0.10 };
const BILL_RATE = 0.012;
const ONLINE_EXTRA = 0.02;
const SEND_RATES = { subscriber: 0, agent: 0.005, merchant: 0.01 };

// Choices shown in the Network / Biller dropdown
const NETWORKS = {
airtime: ["MTN", "Telecel", "AT"],
data: ["MTN", "Telecel", "AT"],
mashup: ["MTN", "Telecel", "AT"],
send: ["MTN", "Telecel", "AT"],
bill: ["ECG", "Ghana Water", "DStv", "GOtv", "StarTimes", "Other"]
};

const BILL_HINTS = {
"ECG": "Enter your ECG prepaid meter number or postpaid account number.",
"Ghana Water": "Enter your Ghana Water customer account number.",
"DStv": "Enter your DStv smartcard (IUC) number.",
"GOtv": "Enter your GOtv IUC number.",
"StarTimes": "Enter your StarTimes smartcard number.",
"Other": "Enter the account or reference number for this bill."
};

const SPEED_NOTES = {
instant: "Delivered in minutes during our delivery hours.",
standard: "Arrives 30 minutes to 3 hours after payment, at any hour."
};

// ===== Page elements =====
const serviceInput = document.getElementById("service");
const networkInput = document.getElementById("network");
const bundleBox = document.getElementById("bundleBox");
const bundleInput = document.getElementById("bundle");
const speedInput = document.getElementById("speedChoice");
const recipientInput = document.getElementById("recipient");
const recipientTypeInput = document.getElementById("recipientType");
const amountInput = document.getElementById("amount");
const feeText = document.getElementById("fee");
const totalText = document.getElementById("total");
const submitBtn = document.getElementById("submitBtn");
const flowNote = document.getElementById("flowNote");
const formMsg = document.getElementById("formMsg");
const waFallback = document.getElementById("waFallback");

// ===== Data prices =====
let PRICES = null;
let pricesState = "loading";
let hoursInfo = null;

// ===== Helpers =====
function usesBundles() {
return serviceInput.value === "data";
}

function usesApi() {
return ["airtime", "data", "mashup", "bill"].includes(serviceInput.value);
}

function currentSpeed() {
return speedInput.value === "standard" ? "standard" : "instant";
}

function getFee(service, amount) {
if (service === "send") {
return amount * (SEND_RATES[recipientTypeInput.value] || 0);
}

if (service === "bill") {
return amount * (BILL_RATE + ONLINE_EXTRA);
}

return amount * (RATES[service] || 0);
}

function showMsg(text, offerWhatsApp) {
formMsg.textContent = text;
formMsg.style.display = "block";
waFallback.style.display = offerWhatsApp ? "block" : "none";
}

function clearMsg() {
formMsg.style.display = "none";
waFallback.style.display = "none";
}

function api(method, path, body) {
return fetch(API_BASE + path, {
method,
headers: { "Content-Type": "application/json" },
body: body ? JSON.stringify(body) : undefined
}).then(async function (res) {
let data = {};

```
try {
  data = await res.json();
} catch (e) {}

if (!res.ok) {
  throw new Error(data.error || "Something went wrong.");
}

return data;
```

}).catch(function (error) {
if (error instanceof TypeError) {
throw new Error("Could not reach the payment system.");
}
throw error;
});
}

function makeRef() {
const d = new Date();
const month = String(d.getMonth() + 1).padStart(2, "0");
const day = String(d.getDate()).padStart(2, "0");
const random = Math.floor(100 + Math.random() * 900);

return "EK-" + month + day + "-" + random;
}

function formatHour(h) {
const whole = Math.floor(h);
const mins = Math.round((h - whole) * 60);
const suffix = whole >= 12 && whole < 24 ? "pm" : "am";
const hour12 = whole % 12 === 0 ? 12 : whole % 12;

return hour12 + ":" + String(mins).padStart(2, "0") + suffix;
}

function allDayDelivery() {
return hoursInfo &&
hoursInfo.deliveryStart === 0 &&
hoursInfo.deliveryEnd >= 24;
}

// ===== Dropdowns =====
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

// ===== Standard and Instant package handling =====
function fillBundles() {
bundleInput.innerHTML = "";

const first = document.createElement("option");
first.value = "";
first.textContent =
pricesState === "loading" ? "Loading packages..." : "Choose package";

bundleInput.appendChild(first);

if (pricesState === "failed") {
showMsg(
"The data packages could not load. Please refresh the page, or order on WhatsApp.",
true
);
return;
}

if (pricesState !== "ready" || !PRICES) return;

const networkKey = networkInput.value.toUpperCase();
const speed = currentSpeed();

const list = (PRICES[speed] || {})[networkKey] || [];

if (list.length === 0) {
const empty = document.createElement("option");
empty.value = "";
empty.textContent = "No packages available for this network.";
bundleInput.appendChild(empty);
return;
}

list.forEach(function (item) {
const option = document.createElement("option");

```
option.value = item.price;
option.dataset.size = item.name;

// Preserve the exact backend product ID for Standard Data.
if (speed === "standard") {
  option.dataset.productId = item.productId;
  option.dataset.supplierNetwork = item.supplierNetwork;
  option.dataset.packageType = item.packageType;
  option.dataset.volumeGb = item.volume_gb;
}

let label = networkInput.value;

if (speed === "standard" && item.packageType === "iShare") {
  label += " iShare";
}

option.textContent =
  label + " " + item.name + " - GH₵" + item.price;

bundleInput.appendChild(option);
```

});
}

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

function refreshSpeedUI() {
const on = usesBundles();

document.getElementById("speedBox").style.display =
on ? "block" : "none";

const hasStandard =
pricesState === "ready" &&
!!PRICES &&
((PRICES.standard || {})[networkInput.value.toUpperCase()] || []).length > 0;

const std = speedInput.querySelector('option[value="standard"]');

std.disabled = !hasStandard;
std.hidden = !hasStandard;

if (!hasStandard) {
speedInput.value = "instant";
}

document.getElementById("speedNote").textContent =
SPEED_NOTES[currentSpeed()];
}

// ===== Send money fields =====
function refreshSendUI() {
const on = serviceInput.value === "send";

document.getElementById("sendBox").style.display =
on ? "block" : "none";

recipientTypeInput.required = on;
document.getElementById("recipientName").required = on;
document.getElementById("numberChecked").required = on;
}

// ===== Bill fields =====
function refreshBillUI() {
const on = serviceInput.value === "bill";

document.getElementById("billBox").style.display =
on ? "block" : "none";

document.getElementById("billName").required = on;
document.getElementById("billContact").required = on;

document.getElementById("billHint").textContent =
on ? (BILL_HINTS[networkInput.value] || "Choose the biller first.") : "";

recipientInput.inputMode = on ? "text" : "tel";
}

// ===== Customer instructions =====
function updateFlowNote() {
const s = serviceInput.value;

if (usesApi()) {
flowNote.textContent = s === "bill"
? "Next: you will pay securely on Paystack's page. Bills include a small online payment fee."
: "Next: you will pay securely on Paystack's page with MTN, Telecel or AT mobile money.";

```
submitBtn.textContent = "Pay Now";
```

} else {
flowNote.textContent = s === "send"
? "Your order goes to us on WhatsApp. Check the number and name carefully, because we cannot undo a transfer."
: "Your order will be sent to us on WhatsApp.";

```
submitBtn.textContent = "Send Order on WhatsApp";
```

}
}

function updateTotals() {
const amount = parseFloat(amountInput.value) || 0;
const fee = getFee(serviceInput.value, amount);

feeText.textContent = "GH₵ " + fee.toFixed(2);
totalText.textContent = "GH₵ " + (amount + fee).toFixed(2);
}

// ===== Loading prices =====
async function loadPrices() {
try {
PRICES = await api("GET", "/public/prices");
pricesState = "ready";
} catch (e) {
PRICES = null;
pricesState = "failed";
}

refreshSpeedUI();

if (usesBundles()) {
fillBundles();
}
}

async function loadHours() {
const box = document.getElementById("hoursBanner");

try {
const info = await api("GET", "/public/info");
hoursInfo = info;

```
if (allDayDelivery()) return;

const start = formatHour(info.deliveryStart);
const end = formatHour(info.deliveryEnd);

box.className = "hours" + (info.open ? "" : " closed");

box.textContent = info.open
  ? "Delivery hours: " + start + " to " + end + "."
  : "We are outside delivery hours (" + start + " to " + end +
    "). You can still order and pay now, and we deliver from " + start + ".";

box.style.display = "block";
```

} catch (e) {
// No banner if the API cannot be reached.
}
}

// ===== Online payment =====
async function payOnline() {
clearMsg();

const service = serviceInput.value;
const recipient = recipientInput.value.trim();

if (service === "bill") {
if (!/^[A-Za-z0-9-/ ]{4,30}$/.test(recipient)) {
showMsg("Enter a valid account or meter number.", false);
return;
}

```
const holder = document.getElementById("billName").value.trim();
const contact = document.getElementById("billContact").value.trim();

if (holder.length < 2) {
  showMsg("Enter the name on the account.", false);
  return;
}

if (!/^0\d{9}$/.test(contact)) {
  showMsg("Enter your 10-digit phone number, like 0241234567.", false);
  return;
}
```

} else if (!/^0\d{9}$/.test(recipient)) {
showMsg("Enter a valid 10-digit phone number, like 0241234567.", false);
return;
}

const body = {
name: document.getElementById("name").value.trim(),
phone: recipient,
service
};

if (usesBundles()) {
const opt = bundleInput.options[bundleInput.selectedIndex];

```
if (!opt || !opt.value) {
  showMsg("Please choose a data package.", false);
  return;
}

if (currentSpeed() === "standard") {
  if (!opt.dataset.productId) {
    showMsg("This Standard Data package is not configured correctly. Please refresh and try again.", false);
    return;
  }

  // Exact product ID returned by the backend.
  body.productId = opt.dataset.productId;
} else {
  // Preserve the existing Instant Data product ID format.
  body.productId = networkInput.value.toUpperCase() + "-" + opt.dataset.size;
}

body.speed = currentSpeed();
```

} else {
if (!networkInput.value) {
showMsg("Please choose a network or biller.", false);
return;
}

```
body.network = networkInput.value;
body.amount = amountInput.value;
```

}

if (service === "bill") {
body.recipientName = document.getElementById("billName").value.trim();
body.contact = document.getElementById("billContact").value.trim();
}

submitBtn.disabled = true;
submitBtn.textContent = "Please wait...";

try {
const order = await api("POST", "/orders", body);

```
const pay = await api(
  "POST",
  "/orders/" + order.orderId + "/pay",
  {}
);

if (!pay.authorization_url) {
  throw new Error("Payment link was not returned. Please contact us.");
}

window.location.href = pay.authorization_url;
```

} catch (err) {
showMsg(
err.message + " You can contact us on WhatsApp for assistance.",
true
);

```
submitBtn.disabled = false;
updateFlowNote();
```

}
}

// ===== WhatsApp orders =====
function sendOnWhatsApp() {
clearMsg();

if (
serviceInput.value === "send" &&
!/^0\d{9}$/.test(recipientInput.value.trim())
) {
showMsg("Enter a valid 10-digit phone number for the recipient.", false);
return;
}

const ref = makeRef();
const serviceName = serviceInput.options[serviceInput.selectedIndex].text;

let message =
"NEW ORDER " + ref + "\n" +
"Name: " + document.getElementById("name").value + "\n" +
"Service: " + serviceName + "\n" +
"Network/Biller: " + networkInput.value + "\n";

if (usesBundles()) {
const opt = bundleInput.options[bundleInput.selectedIndex];

```
if (!opt || !opt.value) {
  showMsg("Please choose a data package.", false);
  return;
}

message += "Package: " + opt.text + "\n";
message += "Speed: " + currentSpeed() + "\n";
```

}

if (serviceInput.value === "send") {
const typeSel = recipientTypeInput;

```
message +=
  "Recipient type: " + typeSel.options[typeSel.selectedIndex].text + "\n" +
  "Recipient name: " + document.getElementById("recipientName").value + "\n";
```

}

message +=
"Number/Account: " + recipientInput.value + "\n" +
"Amount: GH₵" + amountInput.value + "\n" +
"Charge: " + feeText.textContent + "\n" +
"Total: " + totalText.textContent;

window.open(
"https://wa.me/" + SHOP_NUMBER + "?text=" + encodeURIComponent(message),
"_blank"
);

document.getElementById("orderRef").textContent = ref;
document.getElementById("payBox").style.display = "block";
}

// ===== Payment tracking =====
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

```
let order = null;

try {
  order = await api(
    "GET",
    "/payments/verify/" + encodeURIComponent(reference)
  );
} catch (e) {
  text.textContent = "Checking... (" + e.message + ")";
}

if (order) {
  wa.href =
    "https://wa.me/" + SHOP_NUMBER +
    "?text=" + encodeURIComponent("Hello, my order number is #" + order.id);

  if (order.status === "delivered") {
    title.textContent = "Done! Order #" + order.id;

    text.textContent = /Bill/.test(order.product)
      ? "Your bill has been paid. We will send your receipt to your phone on WhatsApp."
      : "Please check your phone. Thank you for choosing ERNIE-KESS ENTERPRISE.";

    return;
  }

  if (order.status === "delivery_failed") {
    title.textContent = "Order #" + order.id + ": payment received";
    text.textContent =
      "Your payment is safe, but there was a problem delivering. Message us on WhatsApp with this order number and we will fix it.";
    return;
  }

  if (order.status === "paid") {
    title.textContent = "Payment confirmed! Order #" + order.id;

    if (order.speed === "standard") {
      text.textContent =
        "Your order is with our delivery partner. Standard delivery takes 30 minutes to 3 hours. This page updates by itself.";
    } else if (hoursInfo && !hoursInfo.open && !allDayDelivery()) {
      text.textContent =
        "We are outside delivery hours, so we will deliver from " +
        formatHour(hoursInfo.deliveryStart) +
        ". This page updates by itself.";
    } else {
      text.textContent =
        "We are sending your order now. This page updates by itself.";
    }
  } else {
    title.textContent = "Waiting for your payment to confirm...";
    text.textContent = "If you have already paid, this takes a few seconds.";
  }
}

if (tries < 60) {
  setTimeout(check, 5000);
} else {
  text.textContent =
    "This is taking longer than usual. Message us on WhatsApp with your order number.";
}
```

}

check();
}

// ===== Events =====
serviceInput.addEventListener("change", function () {
fillNetworks();
refreshBundleUI();
refreshSpeedUI();
refreshSendUI();
refreshBillUI();
updateTotals();
updateFlowNote();
clearMsg();
});

networkInput.addEventListener("change", function () {
refreshSpeedUI();
refreshBillUI();

if (usesBundles()) {
fillBundles();
amountInput.value = "";
updateTotals();
}
});

speedInput.addEventListener("change", function () {
refreshSpeedUI();
fillBundles();
amountInput.value = "";
updateTotals();
});

bundleInput.addEventListener("change", function () {
amountInput.value = bundleInput.value;
updateTotals();
});

recipientTypeInput.addEventListener("change", updateTotals);
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

// ===== Copy MoMo number =====
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
refreshSpeedUI();
refreshSendUI();
refreshBillUI();
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
refreshSpeedUI();
refreshSendUI();
refreshBillUI();
updateTotals();
updateFlowNote();
}

loadHours();
loadPrices();
