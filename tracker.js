const KEY = "ernieKessOrders";
const STATUSES = ["Waiting for payment", "Paid", "Delivered"];
const LATE_MINUTES = 10; // paid orders waiting longer than this turn red

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

// Whole minutes between two timestamps
function minutes(from, to) {
  return Math.max(0, Math.round((to - from) / 60000));
}

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

    // Timing line
    const timing = document.createElement("p");
    if (order.status === "Paid" && order.paidAt) {
      const waited = minutes(order.paidAt, Date.now());
      timing.textContent = "Paid " + waited + " min ago - deliver now!";
      if (waited >= LATE_MINUTES) timing.className = "late";
      card.appendChild(timing);
    } else if (order.status === "Delivered" && order.paidAt && order.deliveredAt) {
      timing.textContent =
        "Delivered " + minutes(order.paidAt, order.deliveredAt) + " min after payment";
      card.appendChild(timing);
    }

    if (order.status !== "Delivered") {
      const next = document.createElement("button");
      const nextStatus = STATUSES[STATUSES.indexOf(order.status) + 1];
      next.textContent = "Mark as " + nextStatus;
      next.onclick = function () {
        order.status = nextStatus;
        if (nextStatus === "Paid") order.paidAt = Date.now();
        if (nextStatus === "Delivered") order.deliveredAt = Date.now();
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

  // Average minutes from payment to delivery (only orders with both times)
  const timed = delivered.filter(function (o) { return o.paidAt && o.deliveredAt; });
  let avg = "-";
  if (timed.length > 0) {
    const total = timed.reduce(function (sum, o) {
      return sum + minutes(o.paidAt, o.deliveredAt);
    }, 0);
    avg = (total / timed.length).toFixed(1) + " min";
  }

  document.getElementById("summary").textContent =
    todays.length + " orders | " + delivered.length + " delivered (GH₵" +
    money.toFixed(2) + ") | " + waiting.length + " waiting for payment | " +
    "average delivery: " + avg;
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