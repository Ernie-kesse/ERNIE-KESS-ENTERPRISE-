const KEY = "ernieKessOrders";
const STATUSES = ["Waiting for payment", "Paid", "Delivered"];

// Load saved orders from this phone's browser
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch (e) {
    return [];
  }
}

// Save orders back to the browser
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(orders));
  } catch (e) {}
}

let orders = load();

function render() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  // Newest first
  orders.slice().reverse().forEach(function (order) {
    const card = document.createElement("div");
    card.className = "orderCard";

    const info = document.createElement("p");
    info.textContent =
      order.time + " | " + order.name + " | " + order.service +
      " | " + order.recipient + " | GH₵" + order.total.toFixed(2);

    const status = document.createElement("p");
    status.className = "status";
    status.textContent = order.status;

    card.appendChild(info);
    card.appendChild(status);

    if (order.status !== "Delivered") {
      const next = document.createElement("button");
      next.textContent = "Mark as " + STATUSES[STATUSES.indexOf(order.status) + 1];
      next.onclick = function () {
        order.status = STATUSES[STATUSES.indexOf(order.status) + 1];
        save();
        render();
      };
      card.appendChild(next);
    }

    const del = document.createElement("button");
    del.textContent = "Delete";
    del.onclick = function () {
      if (confirm("Delete this order?")) {
        orders = orders.filter(function (o) { return o.id !== order.id; });
        save();
        render();
      }
    };
    card.appendChild(del);

    list.appendChild(card);
  });

  updateSummary();
}

function updateSummary() {
  const today = new Date().toDateString();
  const todays = orders.filter(function (o) { return o.day === today; });
  const delivered = todays.filter(function (o) { return o.status === "Delivered"; });
  const waiting = todays.filter(function (o) { return o.status === "Waiting for payment"; });
  const money = delivered.reduce(function (sum, o) { return sum + o.total; }, 0);

  document.getElementById("summary").textContent =
    todays.length + " orders | " + delivered.length + " delivered (GH₵" +
    money.toFixed(2) + ") | " + waiting.length + " waiting for payment";
}

document.getElementById("trackForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const now = new Date();

  orders.push({
    id: Date.now(),
    day: now.toDateString(),
    time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    name: document.getElementById("tName").value,
    service: document.getElementById("tService").value,
    recipient: document.getElementById("tRecipient").value,
    total: parseFloat(document.getElementById("tTotal").value),
    status: "Waiting for payment"
  });

  save();
  render();
  this.reset();
});

render();