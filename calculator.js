const SHOP_NUMBER = "233257285582";

// Percentage charges
const RATES = {
  airtime: 0.10,
  data: 0.10,
  mashup: 0.10,
  bill: 0.012,
  cash: 0
};

// Send-money fee rules
function sendFee(amount) {
  if (amount <= 0) return 0;
  if (amount <= 50) return 0.5;
  if (amount <= 100) return 1;
  if (amount <= 1000) return amount * 0.01;
  return null; // above 1000: negotiable
}

function getFee(service, amount) {
  if (service === "send") return sendFee(amount);
  return amount * (RATES[service] || 0);
}

const serviceInput = document.getElementById("service");
const amountInput = document.getElementById("amount");
const feeText = document.getElementById("fee");
const totalText = document.getElementById("total");
const orderBtn = document.getElementById("orderBtn");

function update() {
  const amount = parseFloat(amountInput.value) || 0;
  const fee = getFee(serviceInput.value, amount);

  if (fee === null) {
    feeText.textContent = "Negotiable";
    totalText.textContent = "To be agreed on WhatsApp";
  } else {
    feeText.textContent = "GH₵ " + fee.toFixed(2);
    totalText.textContent = "GH₵ " + (amount + fee).toFixed(2);
  }

  // Build the WhatsApp message
  const serviceName = serviceInput.options[serviceInput.selectedIndex].text;
  const message =
    "Hello, I want: " + serviceName + "\n" +
    "Amount: GH₵" + amount + "\n" +
    "Charge: " + feeText.textContent + "\n" +
    "Total: " + totalText.textContent;

  orderBtn.href = "https://wa.me/" + SHOP_NUMBER + "?text=" + encodeURIComponent(message);
}

serviceInput.addEventListener("change", update);
amountInput.addEventListener("input", update);

update();