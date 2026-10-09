from flask import Flask, jsonify, request

try:
    from flask_cors import CORS  # type: ignore[reportMissingModuleSource]  # Optional dependency
except ImportError:  # pragma: no cover - optional dependency for local dev
    class CORS:
        """A lightweight local CORS implementation used when flask-cors is unavailable."""

        def __init__(
            self,
            app=None,
            resources=None,
            origins="*",
            methods=None,
            allow_headers=None,
            expose_headers=None,
            supports_credentials=False,
            max_age=None,
            automatic_options=True,
        ):
            self.origins = origins
            self.methods = methods or ["GET", "HEAD", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"]
            self.allow_headers = allow_headers or ["Content-Type", "Authorization"]
            self.expose_headers = expose_headers or []
            self.supports_credentials = supports_credentials
            self.max_age = max_age
            self.automatic_options = automatic_options

            if app is not None:
                self.init_app(app)

        def init_app(self, app):
            @app.after_request
            def add_cors_headers(response):
                origin = request.headers.get("Origin")

                if origin or self.origins != "*":
                    if self.origins == "*" and not self.supports_credentials:
                        response.headers["Access-Control-Allow-Origin"] = "*"
                    else:
                        response.headers["Access-Control-Allow-Origin"] = origin or self.origins

                    response.headers["Access-Control-Allow-Methods"] = ", ".join(self.methods)
                    response.headers["Access-Control-Allow-Headers"] = ", ".join(self.allow_headers)

                    if self.expose_headers:
                        response.headers["Access-Control-Expose-Headers"] = ", ".join(self.expose_headers)
                    if self.max_age is not None:
                        response.headers["Access-Control-Max-Age"] = str(self.max_age)
                    if self.supports_credentials:
                        response.headers["Access-Control-Allow-Credentials"] = "true"

                    response.headers["Vary"] = "Origin"

                if request.method == "OPTIONS" and self.automatic_options:
                    response.status_code = 204
                    response.headers["Access-Control-Allow-Methods"] = ", ".join(self.methods)
                    response.headers["Access-Control-Allow-Headers"] = ", ".join(self.allow_headers)

                return response

        def __call__(self, app):
            self.init_app(app)
            return app


app = Flask(__name__)
CORS(app)


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
