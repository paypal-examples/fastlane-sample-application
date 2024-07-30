import os
from flask import Flask, send_from_directory, request
from dotenv import load_dotenv
from flask_cors import CORS

from controllers.render import render_paypal
from controllers.transaction import create_order

load_dotenv("../.env")

app = Flask(__name__)
app.config["TEMPLATES_FOLDER"] = os.path.abspath(
    os.path.join(app.root_path, "../shared/views")
)
CORS(app)


@app.route("/")
def paypal_render():
    return render_paypal(request.args, app.config["TEMPLATES_FOLDER"])


@app.route("/transaction", methods=["POST"])
def paypal_transaction():
    return create_order(request.json)


@app.route("/<path:filename>")
def serve_static(filename):
    return send_from_directory(os.path.join(app.root_path, "../../client"), filename)


# Run the server
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=True)
