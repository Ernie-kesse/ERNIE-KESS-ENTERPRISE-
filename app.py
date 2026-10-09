from flask import Flask, jsonify, request

app = Flask(__name__)


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "business": "ERNIE-KESS ENTERPRISE",
        "message": "Welcome to the ERNIE-KESS API",
        "status": "online"
    })


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "ERNIE-KESS API"
    })


@app.route("/api/bundles", methods=["GET"])
def get_bundles():
    bundles = [
        {
            "id": 1,
            "network": "MTN",
            "data": "1GB",
            "price_ghs": 10
        },
        {
            "id": 2,
            "network": "MTN",
            "data": "5GB",
            "price_ghs": 50
        },
        {
            "id": 3,
            "network": "MTN",
            "data": "10GB",
            "price_ghs": 90
        }
    ]

    return jsonify({
        "success": True,
        "bundles": bundles
    })


@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.get_json(silent=True) or {}

    phone = data.get("phone")
    bundle_id = data.get("bundle_id")

    if not phone or not bundle_id:
        return jsonify({
            "success": False,
            "error": "Phone number and bundle ID are required"
        }), 400

    return jsonify({
        "success": True,
        "message": "Request received. Payment and fulfillment are not yet integrated.",
        "phone": phone,
        "bundle_id": bundle_id,
        "status": "pending"
    }), 201


if __name__ == "__main__":
    app.run(debug=True)
