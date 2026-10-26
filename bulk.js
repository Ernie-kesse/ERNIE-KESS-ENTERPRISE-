const SHOP_NUMBER = "233257285582";

document.getElementById("bulkForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const phone = document.getElementById("bPhone").value.trim();
  const msg = document.getElementById("bMsg");

  if (!/^0\d{9}$/.test(phone)) {
    msg.textContent = "Enter a valid 10-digit phone number, like 0241234567.";
    msg.style.display = "block";
    return;
  }
  msg.style.display = "none";

  const shop = document.getElementById("bShop").value.trim();

  const message =
    "BULK EVD REQUEST\n" +
    "Name: " + document.getElementById("bName").value + "\n" +
    (shop ? "Shop: " + shop + "\n" : "") +
    "Network: " + document.getElementById("bNetwork").value + "\n" +
    "Type: " + document.getElementById("bType").value + "\n" +
    "Amount: GH₵" + document.getElementById("bAmount").value + "\n" +
    "Send to: " + phone + "\n\n" +
    "Please send me today's rate.";

  window.open("https://wa.me/" + SHOP_NUMBER + "?text=" + encodeURIComponent(message), "_blank");
});